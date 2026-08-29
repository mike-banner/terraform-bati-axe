export async function handleStripeEvent(event: any, supabase: any, stripe: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const proId = session.metadata?.pro_id
      if (!proId) break
      await supabase
        .from('professionals')
        .update({ subscription_status: 'active', stripe_customer_id: session.customer as string })
        .eq('id', proId)

      // Souscription zones (05.16) : la ligne pro_zones n'a pas pu être créée à la volée
      // (l'abonnement n'existait pas encore avant confirmation du paiement) — on la crée ici.
      const zoneId = session.metadata?.zone_id
      const billing = session.metadata?.billing as 'monthly' | 'annual' | undefined
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (zoneId && billing && subscriptionId) {
        const priceCents = calculateZonePrice(1, billing) * 100
        await supabase
          .from('pro_zones')
          .upsert(
            { pro_id: proId, zone_id: zoneId, billing, price_cents: priceCents, stripe_subscription_id: subscriptionId, status: 'active' },
            { onConflict: 'pro_id,zone_id' },
          )
      }

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
    case 'customer.subscription.updated': {
      const sub = event.data.object as any
      const stripeSubId = sub.id as string
      // Mapper le statut Stripe → statut pro_zones
      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'cancelled',
        unpaid: 'cancelled',
        trialing: 'active',
      }
      const newStatus = statusMap[sub.status] || 'active'
      // Le Subscription Schedule (changement mensuel ↔ annuel) fait évoluer le prix
      // de l'abonnement à la fin de la période payée — on aligne pro_zones.billing dessus.
      const newInterval = sub.items?.data?.[0]?.price?.recurring?.interval as string | undefined
      const newBilling = newInterval === 'year' ? 'annual' : newInterval === 'month' ? 'monthly' : undefined

      // Retrait de zone programmé (unsubscribe.post.ts) : la 2e phase du schedule vient de
      // prendre effet quand le prix courant correspond au prix cible qu'on avait enregistré.
      const removedZoneId = sub.metadata?.pending_zone_removal_id as string | undefined
      const currentPriceId = sub.items?.data?.[0]?.price?.id as string | undefined
      const removalApplied = removedZoneId && currentPriceId === sub.metadata?.pending_zone_removal_price

      if (removalApplied) {
        await supabase
          .from('pro_zones')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', stripeSubId)
          .eq('zone_id', removedZoneId)
        // Nettoie les clés de metadata pour ne pas rejouer ce traitement sur les updates suivants.
        await stripe.subscriptions.update(stripeSubId, { metadata: { pending_zone_removal_id: '', pending_zone_removal_price: '' } })
      }

      let bulkUpdate = supabase
        .from('pro_zones')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newBilling ? { billing: newBilling } : {}),
        })
        .eq('stripe_subscription_id', stripeSubId)
      if (removalApplied) bulkUpdate = bulkUpdate.neq('zone_id', removedZoneId)
      await bulkUpdate
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      // Mettre à jour pro_zones si c'est une subscription zone
      await supabase
        .from('pro_zones')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      // Mettre à jour professionals.subscription_status
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
