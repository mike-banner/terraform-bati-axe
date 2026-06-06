import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const stripe = new Stripe(config.stripeSecretKey as string, {
    httpClient: Stripe.createFetchHttpClient(),
  })

  const webCrypto = Stripe.createSubtleCryptoProvider()

  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Signature ou corps manquant.' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      config.stripeWebhookSecret as string,
      undefined,
      webCrypto,
    )
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: `Webhook signature invalide: ${err.message}` })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  await handleStripeEvent(stripeEvent, supabase)

  return { received: true }
})
