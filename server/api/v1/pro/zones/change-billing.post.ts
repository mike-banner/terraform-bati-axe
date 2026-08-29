/**
 * POST /api/v1/pro/zones/change-billing
 *
 * Programme un changement mensuel ↔ annuel via un Subscription Schedule Stripe :
 * le tarif actuel continue jusqu'à la fin de la période déjà payée, puis le
 * nouveau tarif prend le relais automatiquement — aucun débit immédiat.
 *
 * Body: { billing: 'monthly' | 'annual' }
 */

import { z } from 'zod'
import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  billing: z.enum(['monthly', 'annual']),
})

export default defineEventHandler(async (event) => {
  const { billing } = await readValidatedBody(event, bodySchema.parse)

  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  const userId = resolveSupabaseUserId(authUser)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: activeZones } = await supabase
    .from('pro_zones')
    .select('id, billing, stripe_subscription_id')
    .eq('pro_id', userId)
    .eq('status', 'active')

  if (!activeZones || activeZones.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Aucun abonnement actif.' })
  }
  if (activeZones[0].billing === billing) {
    throw createError({ statusCode: 400, statusMessage: `Déjà en facturation ${billing === 'annual' ? 'annuelle' : 'mensuelle'}.` })
  }

  const subscriptionId = activeZones[0].stripe_subscription_id
  const zoneCount = activeZones.length
  const newPrice = calculateZonePrice(zoneCount, billing)

  // Version par défaut du SDK (pas d'apiVersion figée) : les Subscription Schedules
  // sur ce compte exigent une version plus récente que celle utilisée ailleurs (2024-06-20).
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const lookupKey = zonePriceLookupKey(zoneCount, billing)
  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const priceObj = existingPrices.data[0] || await stripe.prices.create({
    unit_amount: newPrice * 100,
    currency: 'eur',
    recurring: { interval: billing === 'annual' ? 'year' : 'month' },
    lookup_key: lookupKey,
    product_data: {
      name: `BÂTI-AXE — ${zoneCount} zone${zoneCount > 1 ? 's' : ''} (${billing === 'annual' ? 'Annuel' : 'Mensuel'})`,
    },
  })

  // Un changement est déjà programmé sur cet abonnement — Stripe refuse un 2e schedule.
  const existingSub = await stripe.subscriptions.retrieve(subscriptionId)
  assertSubscriptionModifiable(existingSub)

  let currentPhase: Stripe.SubscriptionSchedule.Phase
  try {
    // Convertit l'abonnement en schedule pour programmer la transition à la fin de la période en cours.
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
    })
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la programmation du changement. Réessayez.' })
  }

  return {
    status: 'SUCCESS',
    billing,
    price: newPrice,
    effective_date: currentPhase.end_date, // timestamp Unix — date du prochain renouvellement
  }
})
