/**
 * POST /api/v1/pro/zones/subscribe
 *
 * Souscrit le pro à une zone 78 supplémentaire.
 * Un seul abonnement Stripe par pro : on ajoute la zone puis on
 * remplace le prix de cet abonnement unique par le tarif du palier
 * total (dégressif), au lieu de créer un abonnement par zone.
 *
 * Body: { zone_id: string, billing: 'monthly' | 'annual' }
 */

import { z } from 'zod'
import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  zone_id: z.string().uuid(),
  billing: z.enum(['monthly', 'annual']),
})

export default defineEventHandler(async (event) => {
  const { zone_id, billing } = await readValidatedBody(event, bodySchema.parse)

  // Auth
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  const userId = resolveSupabaseUserId(authUser)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  const user = { id: userId, email: authUser.email }

  const supabase = await serverSupabaseServiceRole(event) as any

  // Vérifier que la zone existe
  const { data: zone, error: zoneErr } = await supabase
    .from('zones')
    .select('id, name, type')
    .eq('id', zone_id)
    .eq('type', 'area')
    .eq('is_active', true)
    .maybeSingle()

  if (zoneErr || !zone) throw createError({ statusCode: 404, statusMessage: 'Zone introuvable.' })

  // Zones déjà actives du pro (toutes partagent le même abonnement Stripe)
  const { data: activeZones } = await supabase
    .from('pro_zones')
    .select('id, zone_id, billing, stripe_subscription_id')
    .eq('pro_id', user.id)
    .eq('status', 'active')

  if (activeZones?.some(z => z.zone_id === zone_id)) {
    throw createError({ statusCode: 409, statusMessage: 'Déjà abonné à cette zone.' })
  }

  const existingSubscriptionId = activeZones?.[0]?.stripe_subscription_id || null
  if (activeZones && activeZones.length > 0 && activeZones[0].billing !== billing) {
    throw createError({
      statusCode: 400,
      statusMessage: `Vos zones sont actuellement en facturation ${activeZones[0].billing === 'annual' ? 'annuelle' : 'mensuelle'} — impossible de mélanger les deux.`,
    })
  }

  const newZoneCount = (activeZones?.length || 0) + 1
  const price = calculateZonePrice(newZoneCount, billing)

  // Version par défaut du SDK (pas d'apiVersion figée) : ce compte n'accepte plus certains
  // paramètres (ex. `subscription` sur Checkout Session) sur l'ancienne version 2024-06-20.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Récupérer ou créer le customer Stripe
  const { data: pro } = await supabase
    .from('professionals')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .maybeSingle()

  let customerId = pro?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: pro?.email || user.email!,
      metadata: { pro_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('professionals')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Récupérer le prix Stripe existant pour ce palier, ou le créer une seule fois
  const lookupKey = zonePriceLookupKey(newZoneCount, billing)
  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const priceObj = existingPrices.data[0] || await stripe.prices.create({
    unit_amount: price * 100, // en centimes
    currency: 'eur',
    recurring: { interval: billing === 'annual' ? 'year' : 'month' },
    lookup_key: lookupKey,
    product_data: {
      name: `BÂTI-AXE — ${newZoneCount} zone${newZoneCount > 1 ? 's' : ''} (${billing === 'annual' ? 'Annuel' : 'Mensuel'})`,
    },
  })

  let subscriptionId: string | undefined
  let checkoutUrl: string | null = null

  try {
    if (existingSubscriptionId) {
      // Le pro a déjà un abonnement actif : on fait juste évoluer son prix vers le nouveau palier.
      const existingSub = await stripe.subscriptions.retrieve(existingSubscriptionId)
      assertSubscriptionModifiable(existingSub)
      await stripe.subscriptions.update(existingSubscriptionId, {
        items: [{ id: existingSub.items.data[0].id, price: priceObj.id }],
        proration_behavior: 'always_invoice', // débit immédiat du prorata, pas d'attente du prochain renouvellement
      })
      subscriptionId = existingSubscriptionId

      // Toutes les zones actives du pro reflètent désormais le nouveau prix total du palier.
      await supabase
        .from('pro_zones')
        .update({ price_cents: price * 100 })
        .eq('pro_id', user.id)
        .eq('status', 'active')
    } else {
      // Première zone : pas encore d'abonnement ni de moyen de paiement. Checkout crée
      // lui-même l'abonnement (14 jours d'essai) une fois le paiement confirmé — on ne le
      // connaît donc pas encore ici. La ligne pro_zones est créée par le webhook
      // `checkout.session.completed` (cf. handleStripeEvent.ts).
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceObj.id, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { zone_id, billing, pro_id: user.id },
        },
        success_url: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://dev.bati-axe.fr'}/espace/premium?upgrade=success`,
        cancel_url: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://dev.bati-axe.fr'}/espace/premium?upgrade=cancelled`,
        metadata: { zone_id, billing, pro_id: user.id },
      })
      checkoutUrl = session.url
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    if (err.code === 'invoice_no_payment_method_available' || /no attached payment source|no default payment method/i.test(err.message || '')) {
      throw createError({ statusCode: 402, statusMessage: 'Aucun moyen de paiement enregistré. Ajoutez une carte via "Gérer la facturation" avant d\'ajouter une zone.' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la souscription. Réessayez.' })
  }

  if (existingSubscriptionId) {
    // Zone ajoutée à un abonnement déjà payé : on l'enregistre tout de suite.
    // upsert (pas insert) : une ligne existe déjà si cette zone avait été résiliée avant.
    const { error: insertErr } = await supabase
      .from('pro_zones')
      .upsert({
        pro_id: user.id,
        zone_id,
        billing,
        price_cents: price * 100,
        stripe_subscription_id: subscriptionId!,
        status: 'active',
      }, { onConflict: 'pro_id,zone_id' })
    if (insertErr) {
      console.error('[subscribe] pro_zones upsert failed', insertErr.message)
      throw createError({ statusCode: 500, statusMessage: 'Erreur d\'enregistrement.' })
    }
  }

  return {
    status: 'SUCCESS',
    checkout_url: checkoutUrl,
    zone_name: zone.name,
    billing,
    price,
  }
})
