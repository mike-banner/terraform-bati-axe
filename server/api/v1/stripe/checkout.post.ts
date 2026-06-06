import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const config = useRuntimeConfig(event)
  const stripe = new Stripe(config.stripeSecretKey as string, {
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: pro } = await supabase
    .from('professionals')
    .select('id, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: config.stripePriceId as string, quantity: 1 }],
    success_url: `${config.public.siteUrl}/espace/leads?upgrade=success`,
    cancel_url: `${config.public.siteUrl}/espace/premium`,
    metadata: { pro_id: user.id },
  }

  if (pro.stripe_customer_id) {
    sessionParams.customer = pro.stripe_customer_id
  } else {
    sessionParams.customer_email = user.email ?? undefined
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)
    return { url: session.url }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error' })
  }
})
