export async function handleStripeEvent(event: any, supabase: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const proId = session.metadata?.pro_id
      if (!proId) break
      await supabase
        .from('professionals')
        .update({ subscription_status: 'active', stripe_customer_id: session.customer as string })
        .eq('id', proId)
      // CNV-07: track checkout_completed in paywall_events for funnel analytics
      try {
        await supabase.from('paywall_events').insert({
          pro_id: proId,
          event_type: 'checkout_completed',
          metadata: { session_id: session.id, mode: session.mode },
        })
      } catch (e) {
        console.error('[stripe] paywall_events insert failed', e)
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await supabase
        .from('professionals')
        .update({ subscription_status: 'canceled' })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await supabase
        .from('professionals')
        .update({ subscription_status: 'unpaid' })
        .eq('stripe_customer_id', invoice.customer as string)
      break
    }
    // D-08: J-2 warning email is sent by Stripe Dashboard — application no-op, log only
    case 'customer.subscription.trial_will_end': {
      console.log('[stripe] trial_will_end received for subscription', (event.data.object as any).id)
      break
    }
    default:
      break
  }
}
