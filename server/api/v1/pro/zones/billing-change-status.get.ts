/**
 * GET /api/v1/pro/zones/billing-change-status
 *
 * État complet de l'abonnement pour l'affichage des badges sur /espace/premium :
 * - changement mensuel ↔ annuel programmé (Subscription Schedule)
 * - résiliation programmée (cancel_at_period_end)
 * - période d'essai en cours (désistement gratuit possible avant 1ère facture)
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
  if (!subscriptionId) {
    return { pending: false, trialing: false, cancel_at_period_end: false, pending_zone_removal: null }
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const sub = await stripe.subscriptions.retrieve(subscriptionId)

  let pending: { target_billing: 'monthly' | 'annual'; effective_date: number } | null = null
  let pendingZoneRemoval: { zone_id: string; zone_name: string; effective_date: number } | null = null
  const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id
  if (scheduleId) {
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
    if (schedule.status === 'active' && schedule.phases.length >= 2) {
      const nextPhase = schedule.phases[1]
      if (schedule.metadata?.kind === 'zone_removal') {
        pendingZoneRemoval = {
          zone_id: schedule.metadata.zone_id as string,
          zone_name: schedule.metadata.zone_name as string,
          effective_date: nextPhase.start_date,
        }
      } else {
        const nextPrice = await stripe.prices.retrieve(nextPhase.items[0].price as string)
        pending = {
          target_billing: nextPrice.recurring?.interval === 'year' ? 'annual' : 'monthly',
          effective_date: nextPhase.start_date,
        }
      }
    }
  }

  // Sur les comptes en billing_mode "flexible", current_period_end vit sur l'item, pas sur la subscription.
  const currentPeriodEnd = (sub.items.data[0] as any)?.current_period_end ?? (sub as any).current_period_end

  return {
    pending: !!pending,
    target_billing: pending?.target_billing,
    effective_date: pending?.effective_date,
    trialing: sub.status === 'trialing',
    trial_end: sub.trial_end,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: currentPeriodEnd,
    pending_zone_removal: pendingZoneRemoval,
  }
})
