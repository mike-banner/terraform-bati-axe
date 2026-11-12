import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { sendEmail } from '../../../utils/email'
import { renderEmail } from '../../../utils/emailLayout'
import { notifyAdmin, adminDetailsTable } from '../../../utils/notifyAdmin'
import { escapeHtml } from '../../../utils/contracts'
import { issuePartnerToken, renderPartnerLinkEmail } from '../../../utils/signature'
import { readB2bFlowConfig } from '../../../utils/b2bCommissionPlan'
import { installmentCount, installmentLabels, PARTNER_REMINDER_DAYS } from '../../../../app/utils/b2bCommissionRules'

export type ReminderKind =
  | 'choice_1' | 'choice_2' | 'choice_expired'
  | 'quote_1' | 'quote_2' | 'quote_stale'
  | 'confirm_1' | 'confirm_admin'
  | 'installment_1' | 'installment_2' | 'installment_3'

export interface ReminderAction {
  kind: ReminderKind
  subject_id: string
  request_id: string
  lot_id?: string
  engagement_id?: string
  submission_id?: string
  seq?: number
}

export interface ReminderInput {
  lots: { id: string; request_id: string }[]
  engagements: { id: string; lot_id: string; request_id: string; status: string; signed_at: string; selected_at: string | null }[]
  submissions: { id: string; engagement_id: string; status: string; created_at: string }[]
  installments: { engagement_id: string; seq: number; due_on: string | null; validated: boolean }[]
}

export interface ReminderDelays { choiceExpiryDays: number; quoteStaleDays: number; confirmReminderDays: number }

const DAY_MS = 86_400_000
const ageDays = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / DAY_MS
const [FIRST_REMINDER_DAYS, SECOND_REMINDER_DAYS] = PARTNER_REMINDER_DAYS

/**
 * Pure : relances et expirations à traiter (D-16).
 * Pour chaque sujet, seul le palier le plus élevé atteint et non encore envoyé est retenu.
 * Clé de `sent` : `${subject_id}:${kind}`.
 */
export function selectB2bReminders(input: ReminderInput, sent: Set<string>, now: Date, delays: ReminderDelays): ReminderAction[] {
  const out: ReminderAction[] = []
  const isSent = (subject: string, kind: ReminderKind) => sent.has(`${subject}:${kind}`)

  // 1) Choix de l'artisan : lot dont des avenants sont signés et dont aucun artisan n'est retenu.
  for (const lot of input.lots) {
    const engs = input.engagements.filter(e => e.lot_id === lot.id)
    const signed = engs.filter(e => e.status === 'signed')
    if (!signed.length || engs.some(e => e.selected_at)) continue
    const oldest = signed.reduce((min, e) => (new Date(e.signed_at) < new Date(min) ? e.signed_at : min), signed[0]!.signed_at)
    const age = ageDays(oldest, now)
    const base = { subject_id: lot.id, request_id: lot.request_id, lot_id: lot.id }
    if (age >= delays.choiceExpiryDays) {
      if (!isSent(lot.id, 'choice_expired')) out.push({ ...base, kind: 'choice_expired' })
    } else if (age >= SECOND_REMINDER_DAYS) {
      if (!isSent(lot.id, 'choice_2')) out.push({ ...base, kind: 'choice_2' })
    } else if (age >= FIRST_REMINDER_DAYS) {
      if (!isSent(lot.id, 'choice_1') && !isSent(lot.id, 'choice_2')) out.push({ ...base, kind: 'choice_1' })
    }
  }

  for (const eng of input.engagements) {
    const subs = input.submissions.filter(s => s.engagement_id === eng.id)

    // 2) Artisan retenu mais aucun devis déposé.
    if (eng.status === 'selected' && eng.selected_at && !subs.some(s => ['pending', 'contested', 'confirmed'].includes(s.status))) {
      const age = ageDays(eng.selected_at, now)
      const base = { subject_id: eng.id, request_id: eng.request_id, lot_id: eng.lot_id, engagement_id: eng.id }
      if (age >= delays.quoteStaleDays) {
        if (!isSent(eng.id, 'quote_stale')) out.push({ ...base, kind: 'quote_stale' })
      } else if (age >= SECOND_REMINDER_DAYS) {
        if (!isSent(eng.id, 'quote_2')) out.push({ ...base, kind: 'quote_2' })
      } else if (age >= FIRST_REMINDER_DAYS) {
        if (!isSent(eng.id, 'quote_1') && !isSent(eng.id, 'quote_2')) out.push({ ...base, kind: 'quote_1' })
      }
    }

    // 3) Devis déposé en attente de confirmation de l'artisan (« contested » = arbitrage admin, aucune relance).
    if (eng.status === 'quote_submitted') {
      const pending = subs.find(s => s.status === 'pending')
      if (pending) {
        const age = ageDays(pending.created_at, now)
        const base = { subject_id: pending.id, request_id: eng.request_id, lot_id: eng.lot_id, engagement_id: eng.id, submission_id: pending.id }
        if (age >= 2 * delays.confirmReminderDays) {
          if (!isSent(pending.id, 'confirm_admin')) out.push({ ...base, kind: 'confirm_admin' })
        } else if (age >= delays.confirmReminderDays) {
          if (!isSent(pending.id, 'confirm_1') && !isSent(pending.id, 'confirm_admin')) out.push({ ...base, kind: 'confirm_1' })
        }
      }
    }

    // 4) Avancement : premier versement non validé dont la date prévue est dépassée (D-06 bis).
    if (eng.status === 'quote_confirmed') {
      const rows = input.installments.filter(i => i.engagement_id === eng.id).sort((a, b) => a.seq - b.seq)
      const next = rows.find(i => !i.validated)
      const today = now.toISOString().slice(0, 10)
      if (next && next.due_on && next.due_on < today) {
        const kind = `installment_${next.seq}` as ReminderKind
        if (!isSent(eng.id, kind)) {
          out.push({ kind, subject_id: eng.id, request_id: eng.request_id, lot_id: eng.lot_id, engagement_id: eng.id, seq: next.seq })
        }
      }
    }
  }
  return out
}

const PARTNER_KINDS = new Set<ReminderKind>(['choice_1', 'choice_2', 'quote_1', 'quote_2', 'installment_1', 'installment_2', 'installment_3'])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig() as any
  const secret = config.cronSecret
  if (!secret || getHeader(event, 'authorization') !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const delays = readB2bFlowConfig(config)
  const siteUrl = config.public?.siteUrl || 'https://bati-axe.com'
  const now = new Date()

  const { data: engRows, error: engErr } = await supabase
    .from('b2b_engagements')
    .select('id, lot_id, request_id, status, signed_at, selected_at, pro_id, confirmed_amount_cents')
    .eq('type', 'lot_amendment')
    .in('status', ['signed', 'selected', 'quote_submitted', 'quote_confirmed'])
    .limit(2000)
  if (engErr) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture des avenants.' })
  const engagements: any[] = engRows || []
  if (!engagements.length) return { status: 'SUCCESS', actions: 0, failed: 0, by_kind: {} }

  const engIds = engagements.map(e => e.id)
  const lotIds = [...new Set(engagements.map(e => e.lot_id))]

  const [lotsRes, subsRes, valsRes] = await Promise.all([
    supabase.from('b2b_tender_lots').select('id, request_id, category, status').in('id', lotIds),
    supabase.from('b2b_quote_submissions')
      .select('id, engagement_id, status, created_at, planned_due_dates')
      .in('engagement_id', engIds).in('status', ['pending', 'contested', 'confirmed'])
      .order('created_at', { ascending: true }),
    supabase.from('b2b_installment_validations').select('engagement_id, seq').in('engagement_id', engIds),
  ])
  if (lotsRes.error || subsRes.error || valsRes.error) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture du suivi B2B.' })
  }
  const lots: any[] = lotsRes.data || []
  const subs: any[] = subsRes.data || []
  const validated = new Set((valsRes.data || []).map((v: any) => `${v.engagement_id}:${v.seq}`))

  // Échéancier : dates prévues du dernier dépôt confirmé, nombre de versements selon l'assiette confirmée.
  const installments: ReminderInput['installments'] = []
  for (const eng of engagements.filter(e => e.status === 'quote_confirmed')) {
    const confirmed = subs.filter(s => s.engagement_id === eng.id && s.status === 'confirmed').at(-1)
    if (!confirmed) continue
    const count = installmentCount(Number(eng.confirmed_amount_cents ?? 0))
    const dates: string[] = confirmed.planned_due_dates || []
    for (let seq = 1; seq <= count; seq++) {
      installments.push({ engagement_id: eng.id, seq, due_on: dates[seq - 1] ?? null, validated: validated.has(`${eng.id}:${seq}`) })
    }
  }

  const subjectIds = [...lotIds, ...engIds, ...subs.map(s => s.id)]
  const { data: sentRows, error: sentErr } = await supabase
    .from('b2b_reminders_sent').select('subject_id, kind').in('subject_id', subjectIds)
  if (sentErr) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture des relances envoyées.' })
  const sent = new Set<string>((sentRows || []).map((r: any) => `${r.subject_id}:${r.kind}`))

  const actions = selectB2bReminders({
    lots: lots.map(l => ({ id: l.id, request_id: l.request_id })),
    engagements: engagements.map(e => ({ id: e.id, lot_id: e.lot_id, request_id: e.request_id, status: e.status, signed_at: e.signed_at, selected_at: e.selected_at })),
    submissions: subs.map(s => ({ id: s.id, engagement_id: s.engagement_id, status: s.status, created_at: s.created_at })),
    installments,
  }, sent, now, delays)

  const lotById = new Map<string, any>(lots.map(l => [l.id, l]))
  const engById = new Map<string, any>(engagements.map(e => [e.id, e]))
  const requestCache = new Map<string, any>()
  const getRequest = async (id: string) => {
    if (!requestCache.has(id)) {
      const { data } = await supabase.from('b2b_requests').select('id, contact_name, contact_email').eq('id', id).maybeSingle()
      requestCache.set(id, data ?? null)
    }
    return requestCache.get(id)
  }
  const refOf = (requestId: string) => requestId.slice(0, 8).toUpperCase()

  let failed = 0
  const byKind: Record<string, number> = {}
  const adminRows: Array<[string, string]> = []

  // D-16 + différé juriste : silence de l'artisan = blocage + relance + arbitrage admin, jamais d'acceptation tacite.
  for (const a of actions) {
    // Réservation avant envoi : un 23505 signifie qu'un autre passage a déjà traité ce palier.
    const { error: reserveErr } = await supabase.from('b2b_reminders_sent').insert({ subject_id: a.subject_id, kind: a.kind })
    if (reserveErr?.code === '23505') continue
    if (reserveErr) { failed++; console.error('[05.23] Réservation relance impossible', a.kind, reserveErr.message); continue }

    try {
      const req = await getRequest(a.request_id)
      const ref = refOf(a.request_id)
      const lotLabel = lotById.get(a.lot_id ?? '')?.category ?? '-'

      if (PARTNER_KINDS.has(a.kind)) {
        if (!req?.contact_email) throw new Error('e-mail partenaire absent')
        const token = await issuePartnerToken(supabase, a.request_id, { revokePrevious: false })
        const link = `${siteUrl}/b2b/engagement/${token}`
        let reason: 'choose_pro' | 'submit_quote' | 'validate_progress' = 'choose_pro'
        let stepLabel: string | undefined
        if (a.kind.startsWith('quote_')) reason = 'submit_quote'
        if (a.kind.startsWith('installment_')) {
          reason = 'validate_progress'
          const base = Number(engById.get(a.engagement_id ?? '')?.confirmed_amount_cents ?? 0)
          stepLabel = installmentLabels(base)[(a.seq ?? 1) - 1]
          const due = installments.find(i => i.engagement_id === a.engagement_id && i.seq === a.seq)?.due_on
          adminRows.push([`Versement ${a.seq} · dossier ${ref}`, `Prévu le ${due ? new Date(due).toLocaleDateString('fr-FR') : '-'}, non validé par le partenaire (${escapeHtml(lotLabel)})`])
        }
        const { subject, html } = renderPartnerLinkEmail({ contactName: req.contact_name, requestRef: ref, link, reason, stepLabel })
        await sendEmail({ to: req.contact_email, sender: 'notifications', subject, html })
      } else if (a.kind === 'choice_expired') {
        const { data: lost } = await supabase
          .from('b2b_engagements')
          .update({ status: 'not_awarded', not_awarded_reason: 'expired' })
          .eq('lot_id', a.lot_id).eq('type', 'lot_amendment').eq('status', 'signed')
          .select('id, pro_id')
        await supabase.from('b2b_tender_lots')
          .update({ status: 'closed', closed_at: now.toISOString(), closed_reason: 'expired' })
          .eq('id', a.lot_id).neq('status', 'closed')
        const proIds = [...new Set((lost || []).map((r: any) => r.pro_id))]
        if (proIds.length) {
          const { data: pros } = await supabase.from('professionals').select('id, email').in('id', proIds)
          for (const p of pros || []) {
            if (!p.email) continue
            try {
              await sendEmail({
                to: p.email, sender: 'notifications', subject: 'Chantier non obtenu',
                html: renderEmail({
                  title: 'Chantier non obtenu',
                  intro: `Le partenaire n'a retenu aucun artisan dans le délai prévu pour le lot ${escapeHtml(lotLabel)} (dossier réf. ${escapeHtml(ref)}) : le lot est clos.`,
                  cta: { label: 'Voir mes chantiers', href: `${siteUrl}/espace/leads?tab=ao` },
                }),
              })
            } catch (err) { console.error('[05.23] Échec e-mail pro (lot expiré)', err) }
          }
        }
        adminRows.push([`Lot expiré · dossier ${ref}`, `${escapeHtml(lotLabel)} : aucun artisan retenu en ${delays.choiceExpiryDays} j, ${(lost || []).length} avenant(s) clos`])
      } else if (a.kind === 'quote_stale') {
        adminRows.push([`Sans devis · dossier ${ref}`, `${escapeHtml(lotLabel)} : artisan retenu sans devis déposé depuis ${delays.quoteStaleDays} j`])
      } else if (a.kind === 'confirm_1') {
        const eng = engById.get(a.engagement_id ?? '')
        const { data: pro } = await supabase.from('professionals').select('email').eq('id', eng?.pro_id).maybeSingle()
        if (!pro?.email) throw new Error('e-mail pro absent')
        await sendEmail({
          to: pro.email, sender: 'notifications', subject: 'Confirmez le montant du devis déposé',
          html: renderEmail({
            title: 'Confirmez le montant du devis déposé',
            intro: `Un devis a été déposé pour le dossier réf. ${escapeHtml(ref)}. Confirmez son montant HT, ou contestez-le s'il est inexact.`,
            cta: { label: 'Voir le devis', href: `${siteUrl}/espace/leads?tab=ao` },
          }),
        })
      } else if (a.kind === 'confirm_admin') {
        adminRows.push([`Devis non confirmé · dossier ${ref}`, `${escapeHtml(lotLabel)} : sans réponse de l'artisan depuis ${2 * delays.confirmReminderDays} j, arbitrage à faire`])
      }
      byKind[a.kind] = (byKind[a.kind] ?? 0) + 1
    } catch (err) {
      failed++
      console.error('[05.23] Échec relance', a.kind, a.subject_id, err)
    }
  }

  if (adminRows.length > 0) {
    await notifyAdmin({
      subject: `Relances B2B : ${adminRows.length} point(s) à traiter`,
      title: 'Relances B2B',
      bodyHtml: adminDetailsTable(adminRows),
    })
  }

  return { status: 'SUCCESS', actions: actions.length, failed, by_kind: byKind }
})
