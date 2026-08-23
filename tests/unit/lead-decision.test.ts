import { describe, it, expect, vi } from 'vitest'
import { handleLeadDecision } from '../../server/utils/handleLeadDecision'
import { MAX_RELAUNCHES } from '../../server/utils/leadFeedback'

// P5 — Feedback loop « refus → remise au marché » (REQ-06), orchestration testée.
// Même pattern que stripe-webhook.test.ts : supabase mocké, logique réelle exécutée.

const TS = '2026-06-15T20:00:00Z'
const PROJECT_ID = '11111111-1111-4000-8000-000000000001'
const LEAD_ID = '11111111-1111-4000-8000-000000000002'

function makeSupabaseMock(cfg: {
  project?: any
  projectError?: any
  lead?: any
  leadError?: any
  projectLeads?: any[]
  updateError?: any
}) {
  const calls = { decisionUpdate: 0, lostUpdate: 0, projectsUpdate: 0 }
  const updatedDecisions: any[] = []

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: cfg.project ?? null, error: cfg.projectError ?? null })),
            })),
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async () => {
              calls.projectsUpdate++
              return { error: null }
            }),
          })),
        }
      }
      if (table === 'leads') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((key: string) => {
              if (key === 'id') {
                return {
                  single: vi.fn(async () => ({ data: cfg.lead ?? null, error: cfg.leadError ?? null })),
                }
              }
              // List of project leads — résolu directement (pas de .single())
              return Promise.resolve({ data: cfg.projectLeads ?? [], error: null })
            }),
          })),
          update: vi.fn((patch: any) => {
            const chain = {
              eq: vi.fn((k: string, v: any) => {
                if (k === 'id') {
                  updatedDecisions.push({ id: v, ...patch })
                  calls.decisionUpdate++
                  return { error: cfg.updateError ?? null }
                }
                // Chaînage pour la remise au marché : eq(project_id).eq(customer_decision).not(unlocked_at)
                return chain
              }),
              not: vi.fn(() => {
                calls.lostUpdate++
                return { error: null }
              }),
            }
            return chain
          }),
        }
      }
      throw new Error(`Table inattendue: ${table}`)
    }),
  }

  return { supabase: supabase as any, calls, updatedDecisions }
}

const BASE_PROJECT = { id: PROJECT_ID, customer_email: 'client@test.com', access_token: 'tok-p5', relaunch_count: 0 }
const BASE_LEAD = { id: LEAD_ID, project_id: PROJECT_ID, status: 'claimed' }

describe('handleLeadDecision — feedback loop (REQ-06)', () => {
  it('tous les pros engagés refusés → remise au marché (lost + relaunch_count)', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
        { status: 'new', unlocked_at: TS, customer_decision: 'refused' }, // free-grant
      ],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: true, relaunched: true, customerEmail: 'client@test.com' })
    expect(calls.decisionUpdate).toBe(1)
    expect(calls.lostUpdate).toBe(1)
    expect(calls.projectsUpdate).toBe(1)
  })

  it('un pro encore en attente → pas de remise au marché', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
        { status: 'claimed', unlocked_at: TS, customer_decision: 'pending' },
      ],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: true, relaunched: false, customerEmail: 'client@test.com' })
    expect(calls.lostUpdate).toBe(0)
    expect(calls.projectsUpdate).toBe(0)
  })

  it('décision "selected" → jamais de remise au marché', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
      ],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'selected' })

    expect(outcome).toEqual({ ok: true, relaunched: false, customerEmail: 'client@test.com' })
    expect(calls.projectsUpdate).toBe(0)
    expect(calls.lostUpdate).toBe(0)
  })

  it('garde-fou anti-spam : relaunch_count à MAX_RELAUNCHES → pas de remise', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: { ...BASE_PROJECT, relaunch_count: MAX_RELAUNCHES },
      lead: BASE_LEAD,
      projectLeads: [
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
        { status: 'claimed', unlocked_at: TS, customer_decision: 'refused' },
      ],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: true, relaunched: false, customerEmail: 'client@test.com' })
    expect(calls.lostUpdate).toBe(0)
    expect(calls.projectsUpdate).toBe(0)
  })

  it('aucun pro engagé → pas de remise au marché', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [{ status: 'new', unlocked_at: null, customer_decision: 'pending' }],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: true, relaunched: false, customerEmail: 'client@test.com' })
    expect(calls.projectsUpdate).toBe(0)
  })

  it('lead d\'un autre projet → lead_mismatch', async () => {
    const { supabase, calls } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: { id: LEAD_ID, project_id: '99999999-9999-4000-8000-000000000099', status: 'claimed' },
      projectLeads: [],
    })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: false, reason: 'lead_mismatch' })
    expect(calls.decisionUpdate).toBe(0)
  })

  it('token inconnu → project_not_found', async () => {
    const { supabase } = makeSupabaseMock({ project: null, lead: null, projectLeads: [] })

    const outcome = await handleLeadDecision(supabase, { token: 'tok-inconnu', lead_id: LEAD_ID, decision: 'refused' })

    expect(outcome).toEqual({ ok: false, reason: 'project_not_found' })
  })

  it('erreur d\'écriture de la décision → throw', async () => {
    const { supabase } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [],
      updateError: { message: 'check constraint failed' },
    })

    await expect(handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' }))
      .rejects.toThrow(/check constraint failed/)
  })

  it('la décision est bien enregistrée sur le bon lead', async () => {
    const { supabase, updatedDecisions } = makeSupabaseMock({
      project: BASE_PROJECT,
      lead: BASE_LEAD,
      projectLeads: [],
    })

    await handleLeadDecision(supabase, { token: 'tok-p5', lead_id: LEAD_ID, decision: 'refused' })

    expect(updatedDecisions).toEqual([{ id: LEAD_ID, customer_decision: 'refused' }])
  })
})
