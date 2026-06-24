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

// Import après les mocks
const { default: handler } = await import('../server/api/v1/pro/documents/upload.post.ts')

const PRO_ID = '550e8400-e29b-41d4-a716-446655440000'
const PRO_USER = { id: PRO_ID, app_metadata: {} }

const VALID_DECENNALE_BODY = {
  document_type: 'decennale',
  file_key: 'abc/decennale/dec_2024_xyz.pdf',
  policy_number: 'POL-123456',
  expiration_date: '2027-12-31',
}

function makeSupabaseMock(opts: { currentLabels?: string[]; insertError?: string; updateError?: string } = {}) {
  const { currentLabels = [], insertError, updateError } = opts

  const insertCalls: any[] = []
  const updatePayloads: any[] = []

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'verifications') {
      return {
        insert: vi.fn().mockImplementation((payload: any) => {
          insertCalls.push({ table, payload })
          return Promise.resolve({ error: insertError ? { message: insertError } : null })
        }),
      }
    }
    if (table === 'professionals') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { labels: currentLabels } }),
        update: vi.fn().mockImplementation((payload: any) => {
          updatePayloads.push(payload)
          return {
            eq: vi.fn().mockResolvedValue({ error: updateError ? { message: updateError } : null }),
          }
        }),
      }
    }
    return { insert: vi.fn(), select: vi.fn(), update: vi.fn() }
  })

  return { from: fromMock, insertCalls, updatePayloads }
}

describe('auto-approve : upload décennale', () => {
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

  it('Test 1 : décennale → verifications insérée avec status approved + policy_number + expiry_date', async () => {
    mockServerSupabaseUser.mockResolvedValue(PRO_USER)
    readBodyMock.mockResolvedValue(VALID_DECENNALE_BODY)

    const sb = makeSupabaseMock()
    mockServerSupabaseServiceRole.mockReturnValue({ from: sb.from })

    const result = await (handler as Function)({})

    expect(result.error).toBeNull()
    expect(result.approved).toBe(true)

    const insert = sb.insertCalls[0]?.payload
    expect(insert).toBeDefined()
    expect(insert.status).toBe('approved')
    expect(insert.policy_number).toBe('POL-123456')
    expect(insert.expiry_date).toBe('2027-12-31')
    expect(insert.pro_id).toBe(PRO_ID)
  })

  it('Test 2 : décennale → professionals mis à jour avec decennal_status=valid + label decennale_certified', async () => {
    mockServerSupabaseUser.mockResolvedValue(PRO_USER)
    readBodyMock.mockResolvedValue(VALID_DECENNALE_BODY)

    const sb = makeSupabaseMock({ currentLabels: [] })
    mockServerSupabaseServiceRole.mockReturnValue({ from: sb.from })

    await (handler as Function)({})

    const update = sb.updatePayloads[0]
    expect(update).toBeDefined()
    expect(update.decennal_status).toBe('valid')
    expect(update.labels).toContain('decennale_certified')
  })

  it('Test 3 : décennale → label idempotent si decennale_certified déjà présent', async () => {
    mockServerSupabaseUser.mockResolvedValue(PRO_USER)
    readBodyMock.mockResolvedValue(VALID_DECENNALE_BODY)

    const sb = makeSupabaseMock({ currentLabels: ['decennale_certified'] })
    mockServerSupabaseServiceRole.mockReturnValue({ from: sb.from })

    await (handler as Function)({})

    const update = sb.updatePayloads[0]
    const count = update.labels.filter((l: string) => l === 'decennale_certified').length
    expect(count).toBe(1)
  })

  it('Test 4 : décennale sans numéro de police → createError 422', async () => {
    mockServerSupabaseUser.mockResolvedValue(PRO_USER)
    readBodyMock.mockResolvedValue({ ...VALID_DECENNALE_BODY, policy_number: '' })

    const sb = makeSupabaseMock()
    mockServerSupabaseServiceRole.mockReturnValue({ from: sb.from })

    await expect((handler as Function)({})).rejects.toMatchObject({ statusCode: 422 })
  })

  it('Test 5 : kbis → verifications insérée avec status pending (pas d\'auto-approbation)', async () => {
    mockServerSupabaseUser.mockResolvedValue(PRO_USER)
    readBodyMock.mockResolvedValue({ document_type: 'kbis', file_key: 'abc/kbis/kbis_2024.pdf' })

    const sb = makeSupabaseMock()
    mockServerSupabaseServiceRole.mockReturnValue({ from: sb.from })

    const result = await (handler as Function)({})

    expect(result.approved).toBe(false)
    expect(sb.insertCalls[0]?.payload.status).toBe('pending')
    // Pas de mise à jour professionals pour le KBIS
    expect(sb.updatePayloads).toHaveLength(0)
  })
})
