import { describe, it, expect, vi } from 'vitest'
import { handleStripeEvent } from '../../server/utils/handleStripeEvent'

function makeSupabaseMock() {
  const eq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn().mockReturnValue({ update, insert })
  return { from, update, insert, eq }
}

describe('handleStripeEvent', () => {
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
