import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks globaux H3 (Nuxt server) ---
const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage) as any
  err.statusCode = opts.statusCode
  return err
})

vi.stubGlobal('defineEventHandler', (fn: Function) => fn)
vi.stubGlobal('createError', createErrorMock)
vi.stubGlobal('readBody', vi.fn())

// --- Mocks #supabase/server ---
const mockServerSupabaseUser = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: (...args: any[]) => mockServerSupabaseUser(...args),
  serverSupabaseServiceRole: (...args: any[]) => mockServerSupabaseServiceRole(...args),
}))

// Import après les mocks (important pour l'ordre d'initialisation)
const { default: handler } = await import('../server/api/v1/admin/approve-pro.post.ts')

const PRO_ID = '550e8400-e29b-41d4-a716-446655440000'
const ADMIN_USER = { id: 'admin-001', app_metadata: { role: 'admin' } }

function makeSupabaseMock(opts: {
  verifs?: { document_type: string; status: string }[]
  currentLabels?: string[]
  approveOk?: boolean
}) {
  const { verifs = [], currentLabels = [], approveOk = true } = opts

  // Tracking des appels UPDATE
  const updateCalls: { table: string; payload: any }[] = []

  function makeChain(table: string) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { labels: currentLabels } }),
      update: vi.fn().mockImplementation((payload: any) => {
        updateCalls.push({ table, payload })
        return chain
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    return chain
  }

  const chains: Record<string, any> = {}

  const from = vi.fn().mockImplementation((table: string) => {
    if (!chains[table]) chains[table] = makeChain(table)
    return chains[table]
  })

  // Pour verifications, on veut que .from().select().eq().eq() retourne les verifs
  const verifChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => verifChain),
  }
  // Le dernier .eq() doit résoudre
  let verifEqCount = 0
  verifChain.eq.mockImplementation(() => {
    verifEqCount++
    if (verifEqCount >= 2) {
      verifEqCount = 0
      return Promise.resolve({ data: verifs })
    }
    return verifChain
  })

  // Pour professionals SELECT labels
  const proSelectChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { labels: currentLabels } }),
    update: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }

  // Tracker les payloads du UPDATE professionals
  const proUpdatePayloads: any[] = []
  proSelectChain.update = vi.fn().mockImplementation((payload: any) => {
    proUpdatePayloads.push(payload)
    return { eq: vi.fn().mockResolvedValue({ error: null }) }
  })

  const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) }

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'verifications') return verifChain
    if (table === 'professionals') return proSelectChain
    if (table === 'audit_logs') return auditChain
    return { select: vi.fn(), update: vi.fn(), insert: vi.fn() }
  })

  return { from: fromMock, proSelectChain, proUpdatePayloads, auditChain }
}

describe('approve-pro handler', () => {
  let readBodyMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    createErrorMock.mockImplementation((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as any
      err.statusCode = opts.statusCode
      return err
    })
    readBodyMock = vi.mocked(global.readBody as any)
  })

  it('Test 1 : approve(true) → update avec is_verified=true et decennal_status=valid', async () => {
    mockServerSupabaseUser.mockResolvedValue(ADMIN_USER)
    readBodyMock.mockResolvedValue({ pro_id: PRO_ID, approved: true })

    const supabase = makeSupabaseMock({
      verifs: [
        { document_type: 'kbis', status: 'approved' },
        { document_type: 'decennale', status: 'approved' },
      ],
    })
    mockServerSupabaseServiceRole.mockResolvedValue(supabase.from)

    // Reconstruire le mock with from method
    const fullSupabase = { from: supabase.from }
    mockServerSupabaseServiceRole.mockResolvedValue(fullSupabase)

    await (handler as Function)({})

    const updateCall = supabase.proUpdatePayloads[0]
    expect(updateCall).toBeDefined()
    expect(updateCall.is_verified).toBe(true)
    expect(updateCall.decennal_status).toBe('valid')
  })

  it('Test 2 : approve(true) → labels mis à jour avec decennale_certified (idempotent si déjà présent)', async () => {
    mockServerSupabaseUser.mockResolvedValue(ADMIN_USER)
    readBodyMock.mockResolvedValue({ pro_id: PRO_ID, approved: true })

    // Cas 1 : labels vides → ajoute le badge
    const supabase1 = makeSupabaseMock({
      verifs: [
        { document_type: 'kbis', status: 'approved' },
        { document_type: 'decennale', status: 'approved' },
      ],
      currentLabels: [],
    })
    const fullSupabase1 = { from: supabase1.from }
    mockServerSupabaseServiceRole.mockResolvedValue(fullSupabase1)

    await (handler as Function)({})

    const updateCall1 = supabase1.proUpdatePayloads[0]
    expect(updateCall1.labels).toContain('decennale_certified')

    // Cas 2 : badge déjà présent → pas de doublon
    vi.clearAllMocks()
    readBodyMock.mockResolvedValue({ pro_id: PRO_ID, approved: true })
    mockServerSupabaseUser.mockResolvedValue(ADMIN_USER)

    const supabase2 = makeSupabaseMock({
      verifs: [
        { document_type: 'kbis', status: 'approved' },
        { document_type: 'decennale', status: 'approved' },
      ],
      currentLabels: ['decennale_certified'],
    })
    const fullSupabase2 = { from: supabase2.from }
    mockServerSupabaseServiceRole.mockResolvedValue(fullSupabase2)

    await (handler as Function)({})

    const updateCall2 = supabase2.proUpdatePayloads[0]
    const occurrences = updateCall2.labels.filter((l: string) => l === 'decennale_certified').length
    expect(occurrences).toBe(1)
  })

  it('Test 3 : approve(false) → update avec is_verified=false uniquement (decennal_status et labels inchangés)', async () => {
    mockServerSupabaseUser.mockResolvedValue(ADMIN_USER)
    readBodyMock.mockResolvedValue({ pro_id: PRO_ID, approved: false })

    const supabase = makeSupabaseMock({ verifs: [], currentLabels: ['decennale_certified'] })
    const fullSupabase = { from: supabase.from }
    mockServerSupabaseServiceRole.mockResolvedValue(fullSupabase)

    await (handler as Function)({})

    const updateCall = supabase.proUpdatePayloads[0]
    expect(updateCall).toBeDefined()
    expect(updateCall.is_verified).toBe(false)
    expect(updateCall.decennal_status).toBeUndefined()
    expect(updateCall.labels).toBeUndefined()
  })

  it('Test 4 : approve(true) sans KBIS approuvé → createError 422 levé', async () => {
    mockServerSupabaseUser.mockResolvedValue(ADMIN_USER)
    readBodyMock.mockResolvedValue({ pro_id: PRO_ID, approved: true })

    // Seulement décennale, pas de KBIS
    const supabase = makeSupabaseMock({
      verifs: [{ document_type: 'decennale', status: 'approved' }],
    })
    const fullSupabase = { from: supabase.from }
    mockServerSupabaseServiceRole.mockResolvedValue(fullSupabase)

    await expect((handler as Function)({})).rejects.toMatchObject({ statusCode: 422 })
  })
})
