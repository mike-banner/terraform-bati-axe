import { describe, it, expect, vi, beforeEach } from 'vitest'

// handleStripeEvent.ts importe `#imports` (auto-import Nuxt), non résolvable hors runtime Nuxt.
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ public: { siteUrl: 'https://bati-axe.com' } }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ success: true }) }))

import { handleStripeEvent } from '../../server/utils/handleStripeEvent'
import { sendEmail } from '../../server/utils/email'

const mockedSendEmail = vi.mocked(sendEmail)

// Données paramétrables renvoyées par .select().eq().maybeSingle()
type MockData = {
  pro?: { email: string; company_name: string } | null
  zone?: { name: string } | null
  proZones?: Array<{ pro_id: string; zone_id: string; billing: string }>
}

function makeSupabaseMock(mockData: MockData = {}) {
  // Chaîne .eq()/.neq() à répétition, thenable (résout { error: null }) à tout moment.
  const chain: any = {}
  chain.eq = vi.fn(() => chain)
  chain.neq = vi.fn(() => chain)
  chain.then = (resolve: any) => resolve({ error: null })

  const update = vi.fn().mockReturnValue(chain)
  const insert = vi.fn().mockResolvedValue({ error: null })
  const upsert = vi.fn().mockResolvedValue({ error: null })

  function select(table: string) {
    return () => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: table === 'professionals' ? (mockData.pro ?? null) : mockData.zone ?? null,
      })
      const chain: any = {
        maybeSingle,
        eq: vi.fn().mockReturnValue({
          maybeSingle,
        }),
      }
      // Pour pro_zones : .select().eq() résout directement une liste (pas de maybeSingle)
      if (table === 'pro_zones') {
        chain.eq = vi.fn().mockResolvedValue({ data: mockData.proZones ?? [] })
      }
      return chain
    }
  }

  const from = vi.fn().mockImplementation((table: string) => ({
    update,
    insert,
    upsert,
    select: select(table),
  }))
  return { from, update, insert, eq: chain.eq }
}

describe('handleStripeEvent', () => {
  beforeEach(() => {
    mockedSendEmail.mockClear()
    mockedSendEmail.mockResolvedValue({ success: true } as any)
  })

  it('checkout.session.completed → sets subscription_status to active (D-14)', async () => {
    const supabase = makeSupabaseMock()
    await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_abc',
            customer: 'cus_test_123',
            mode: 'subscription',
            metadata: { pro_id: 'pro-001' },
          },
        },
      },
      supabase,
    )
    expect(supabase.from).toHaveBeenCalledWith('professionals')
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'active', stripe_customer_id: 'cus_test_123' }),
    )
    expect(supabase.eq).toHaveBeenCalledWith('id', 'pro-001')
  })

  it('checkout.session.completed → inserts paywall_events row (CNV-07)', async () => {
    const supabase = makeSupabaseMock()
    await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_abc',
            customer: 'cus_test_123',
            mode: 'subscription',
            metadata: { pro_id: 'pro-001' },
          },
        },
      },
      supabase,
    )
    expect(supabase.from).toHaveBeenCalledWith('paywall_events')
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ pro_id: 'pro-001', event_type: 'checkout_completed' }),
    )
  })

  it('checkout.session.completed avec zone_id + billing → envoie 1 e-mail de confirmation', async () => {
    const supabase = makeSupabaseMock({
      pro: { email: 'pro@test.fr', company_name: 'SARL Test' },
      zone: { name: 'Versailles' },
    })
    await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_abc',
            customer: 'cus_test_123',
            mode: 'subscription',
            subscription: 'sub_123',
            metadata: { pro_id: 'pro-001', zone_id: 'z1', billing: 'monthly' },
          },
        },
      },
      supabase,
    )
    expect(mockedSendEmail).toHaveBeenCalledTimes(1)
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'pro@test.fr', sender: 'notifications', subject: expect.stringContaining('Versailles') }),
    )
  })

  it('checkout.session.completed sans zone_id → aucun e-mail', async () => {
    const supabase = makeSupabaseMock()
    await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_abc',
            customer: 'cus_test_123',
            mode: 'subscription',
            metadata: { pro_id: 'pro-001' },
          },
        },
      },
      supabase,
    )
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it('customer.subscription.updated avec removalApplied → envoie 1 e-mail « retrait de zone »', async () => {
    const supabase = makeSupabaseMock({
      pro: { email: 'pro@test.fr', company_name: 'SARL Test' },
      zone: { name: 'Versailles' },
      proZones: [{ pro_id: 'pro-1', zone_id: 'z1', billing: 'monthly' }],
    })
    const stripe = { subscriptions: { update: vi.fn().mockResolvedValue({}) } }
    await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: { pending_zone_removal_id: 'z1', pending_zone_removal_price: 'price_target' },
            items: { data: [{ price: { id: 'price_target', recurring: { interval: 'month' } } }] },
          },
        },
      },
      supabase,
      stripe,
    )
    expect(mockedSendEmail).toHaveBeenCalledTimes(1)
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'pro@test.fr', subject: expect.stringContaining('Retrait') }),
    )
  })

  it('customer.subscription.updated avec changement de billing → envoie 1 e-mail « changement de facturation »', async () => {
    const supabase = makeSupabaseMock({
      pro: { email: 'pro@test.fr', company_name: 'SARL Test' },
      proZones: [{ pro_id: 'pro-1', zone_id: 'z1', billing: 'monthly' }],
    })
    await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: {},
            items: { data: [{ price: { id: 'price_annual', recurring: { interval: 'year' } } }] },
          },
        },
      },
      supabase,
    )
    expect(mockedSendEmail).toHaveBeenCalledTimes(1)
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'pro@test.fr', subject: expect.stringContaining('annuel') }),
    )
  })

  it('customer.subscription.updated avec billing identique → aucun e-mail', async () => {
    const supabase = makeSupabaseMock({
      pro: { email: 'pro@test.fr', company_name: 'SARL Test' },
      proZones: [{ pro_id: 'pro-1', zone_id: 'z1', billing: 'monthly' }],
    })
    await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: {},
            items: { data: [{ price: { id: 'price_monthly', recurring: { interval: 'month' } } }] },
          },
        },
      },
      supabase,
    )
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it('sendEmail qui rejette → handleStripeEvent résout sans lever', async () => {
    mockedSendEmail.mockRejectedValueOnce(new Error('Resend down'))
    const supabase = makeSupabaseMock({
      pro: { email: 'pro@test.fr', company_name: 'SARL Test' },
      zone: { name: 'Versailles' },
    })
    await expect(
      handleStripeEvent(
        {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_abc',
              customer: 'cus_test_123',
              mode: 'subscription',
              subscription: 'sub_123',
              metadata: { pro_id: 'pro-001', zone_id: 'z1', billing: 'monthly' },
            },
          },
        },
        supabase,
      ),
    ).resolves.toBeUndefined()
  })

  it('customer.subscription.deleted → sets subscription_status to canceled (D-14)', async () => {
    const supabase = makeSupabaseMock()
    await handleStripeEvent(
      {
        type: 'customer.subscription.deleted',
        data: { object: { customer: 'cus_test_123' } },
      },
      supabase,
    )
    expect(supabase.from).toHaveBeenCalledWith('professionals')
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'canceled' }),
    )
    expect(supabase.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_test_123')
  })

  it('invoice.payment_failed → sets subscription_status to unpaid (D-14)', async () => {
    const supabase = makeSupabaseMock()
    await handleStripeEvent(
      {
        type: 'invoice.payment_failed',
        data: { object: { customer: 'cus_test_123' } },
      },
      supabase,
    )
    expect(supabase.from).toHaveBeenCalledWith('professionals')
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'unpaid' }),
    )
    expect(supabase.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_test_123')
  })
})
