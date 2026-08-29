import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

/**
 * POST /api/v1/pro/billing-portal
 *
 * Ouvre le Customer Portal Stripe (annulation, moyen de paiement, factures)
 * pour le pro connecté. On ne réimplémente pas ces écrans côté BÂTI-AXE.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const userId = resolveSupabaseUserId(user)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const config = useRuntimeConfig(event)
  const stripe = new Stripe(config.stripeSecretKey as string, {
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: pro } = await supabase
    .from('professionals')
    .select('id, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!pro?.stripe_customer_id) throw createError({ statusCode: 404, statusMessage: 'Aucun abonnement Stripe associé.' })

  const session = await stripe.billingPortal.sessions.create({
    customer: pro.stripe_customer_id,
    return_url: `${config.public.siteUrl}/espace/premium`,
  })

  return { url: session.url }
})
