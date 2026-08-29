/**
 * POST /api/v1/pro/zones/cancel-billing-change
 *
 * Désistement : annule un changement mensuel ↔ annuel programmé, tant qu'il n'a
 * pas encore pris effet. L'abonnement reste sur sa facturation actuelle.
 */

import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  const userId = resolveSupabaseUserId(authUser)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: activeZones } = await supabase
    .from('pro_zones')
    .select('stripe_subscription_id')
    .eq('pro_id', userId)
    .eq('status', 'active')

  const subscriptionId = activeZones?.[0]?.stripe_subscription_id
  if (!subscriptionId) throw createError({ statusCode: 404, statusMessage: 'Aucun abonnement actif.' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id
  if (!scheduleId) throw createError({ statusCode: 404, statusMessage: 'Aucun changement programmé.' })

  try {
    // release() rend la main à l'abonnement tel qu'il est aujourd'hui (phase en cours),
    // sans jamais appliquer la phase 2 — le pro reste sur sa facturation actuelle.
    await stripe.subscriptionSchedules.release(scheduleId)
    // Nettoie la metadata de retrait de zone si c'était ce type de changement programmé
    // (unsubscribe.post.ts) — sinon elle resterait orpheline sur la subscription.
    if (sub.metadata?.pending_zone_removal_id) {
      await stripe.subscriptions.update(subscriptionId, {
        metadata: { pending_zone_removal_id: '', pending_zone_removal_price: '' },
      })
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'annulation. Réessayez.' })
  }

  return { status: 'SUCCESS' }
})
