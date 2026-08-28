/**
 * POST /api/v1/pro/zones/subscribe
 *
 * Souscrit le pro à une zone 78.
 * Crée une subscription Stripe (mensuelle sans engagement ou annuelle).
 *
 * Body: { zone_id: string, billing: 'monthly' | 'annual' }
 */

import { z } from 'zod'
import Stripe from 'stripe'

const bodySchema = z.object({
  zone_id: z.string().uuid(),
  billing: z.enum(['monthly', 'annual']),
})

export default defineEventHandler(async (event) => {
  const { zone_id, billing } = await readValidatedBody(event, bodySchema.parse)

  // Auth
  const supabase = useSupabase(event)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })

  // Vérifier que la zone existe
  const { data: zone, error: zoneErr } = await supabase
    .from('zones')
    .select('id, name, type')
    .eq('id', zone_id)
    .eq('type', 'area')
    .eq('is_active', true)
    .maybeSingle()

  if (zoneErr || !zone) throw createError({ statusCode: 404, statusMessage: 'Zone introuvable.' })

  // Vérifier si le pro a déjà une subscription active pour cette zone
  const { data: existing } = await supabase
    .from('pro_zones')
    .select('id, status')
    .eq('pro_id', user.id)
    .eq('zone_id', zone_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) throw createError({ statusCode: 409, statusMessage: 'Déjà abonné à cette zone.' })

  // Compter les zones actives du pro pour calculer le prix
  const { count: zoneCount } = await supabase
    .from('pro_zones')
    .select('*', { count: 'exact', head: true })
    .eq('pro_id', user.id)
    .eq('status', 'active')

  const newZoneCount = (zoneCount || 0) + 1
  const price = calculateZonePrice(newZoneCount, billing)

  // Créer la subscription Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

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

  // Créer le prix Stripe
  const priceObj = await stripe.prices.create({
    unit_amount: price * 100, // en centimes
    currency: 'eur',
    recurring: {
      interval: 'month',
      ...(billing === 'annual' ? { interval_count: 1 } : {}),
    },
    product_data: {
      name: `BÂTI-AXE — ${zone.name} (${billing === 'annual' ? 'Annuel' : 'Mensuel'})`,
    },
    metadata: { zone_id, billing, pro_id: user.id },
  })

  // Créer la subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceObj.id }],
    payment_behavior: 'default_incomplete',
    metadata: { zone_id, billing, pro_id: user.id },
  })

  // Enregistrer dans pro_zones
  const { error: insertErr } = await supabase
    .from('pro_zones')
    .insert({
      pro_id: user.id,
      zone_id,
      billing,
      price_cents: price * 100,
      stripe_subscription_id: subscription.id,
      status: 'active',
    })

  if (insertErr) {
    // Annuler la subscription Stripe en cas d'erreur DB
    await stripe.subscriptions.cancel(subscription.id)
    throw createError({ statusCode: 500, statusMessage: 'Erreur d\'enregistrement.' })
  }

  // Créer la session de checkout Stripe
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    subscription: subscription.id,
    success_url: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://dev.bati-axe.fr'}/espace/dashboard?zone=success`,
    cancel_url: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://dev.bati-axe.fr'}/espace/dashboard?zone=cancelled`,
    metadata: { zone_id, billing, pro_id: user.id },
  })

  return {
    status: 'SUCCESS',
    checkout_url: session.url,
    zone_name: zone.name,
    billing,
    price,
  }
})
