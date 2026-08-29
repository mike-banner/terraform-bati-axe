/**
 * POST /api/v1/pro/zones/unsubscribe
 *
 * Programme le retrait d'une zone : elle reste active jusqu'à la fin de la
 * période déjà payée (comme change-billing.post.ts), puis un Subscription
 * Schedule bascule automatiquement l'abonnement sur le tarif du palier
 * restant. Si c'est la dernière zone, on résilie l'abonnement entier
 * (cancel_at_period_end) — le webhook `customer.subscription.deleted`
 * s'occupe déjà de repasser toutes les zones en 'cancelled'.
 *
 * Body: { zone_id: string }
 */

import { z } from 'zod'
import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  zone_id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { zone_id } = await readValidatedBody(event, bodySchema.parse)

  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  const userId = resolveSupabaseUserId(authUser)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: activeZones } = await supabase
    .from('pro_zones')
    .select('id, zone_id, billing, stripe_subscription_id')
    .eq('pro_id', userId)
    .eq('status', 'active')

  const target = activeZones?.find((z: any) => z.zone_id === zone_id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Zone non abonnée.' })

  const subscriptionId = target.stripe_subscription_id
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const existingSub = await stripe.subscriptions.retrieve(subscriptionId)
  assertSubscriptionModifiable(existingSub)

  const remainingCount = activeZones.length - 1

  // Dernière zone : résiliation complète de l'abonnement, effective en fin de période payée.
  if (remainingCount === 0) {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    const periodEnd = (existingSub.items.data[0] as any)?.current_period_end ?? (existingSub as any).current_period_end
    return { status: 'SUCCESS', last_zone: true, effective_date: periodEnd }
  }

  // Sinon : on programme le passage au tarif du palier restant à la fin de la période en cours.
  const { data: zone } = await supabase.from('zones').select('name').eq('id', zone_id).maybeSingle()
  const billing = target.billing as 'monthly' | 'annual'
  const newPrice = calculateZonePrice(remainingCount, billing)

  const lookupKey = zonePriceLookupKey(remainingCount, billing)
  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const priceObj = existingPrices.data[0] || await stripe.prices.create({
    unit_amount: newPrice * 100,
    currency: 'eur',
    recurring: { interval: billing === 'annual' ? 'year' : 'month' },
    lookup_key: lookupKey,
    product_data: {
      name: `BÂTI-AXE — ${remainingCount} zone${remainingCount > 1 ? 's' : ''} (${billing === 'annual' ? 'Annuel' : 'Mensuel'})`,
    },
  })

  let currentPhase: Stripe.SubscriptionSchedule.Phase
  try {
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId })
    currentPhase = schedule.phases[0]

    await stripe.subscriptionSchedules.update(schedule.id, {
      phases: [
        {
          items: currentPhase.items.map(i => ({ price: i.price as string, quantity: i.quantity })),
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
        },
        {
          items: [{ price: priceObj.id, quantity: 1 }],
        },
      ],
      metadata: { kind: 'zone_removal', zone_id, zone_name: zone?.name || '' },
    })

    // Metadata côté subscription (pas juste le schedule) : au moment où Stripe applique la
    // 2e phase, l'event webhook `customer.subscription.updated` ne porte que la subscription,
    // pas le schedule — c'est là qu'on doit savoir quelle zone retirer de pro_zones.
    await stripe.subscriptions.update(subscriptionId, {
      metadata: { pending_zone_removal_id: zone_id, pending_zone_removal_price: priceObj.id },
    })
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la programmation du retrait. Réessayez.' })
  }

  return {
    status: 'SUCCESS',
    last_zone: false,
    effective_date: currentPhase.end_date,
  }
})
