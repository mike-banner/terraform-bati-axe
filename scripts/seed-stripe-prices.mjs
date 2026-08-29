/**
 * Pré-crée (ou réutilise via lookup_key) les 8 Prices Stripe de la grille
 * zones dégressive, pour les voir dans le dashboard sans attendre le premier
 * abonné. Idempotent — relançable sans créer de doublons.
 *
 * Usage : STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe-prices.mjs
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY manquant. Usage : STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe-prices.mjs')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2024-06-20' })

const ZONE_PRICING = {
  1: { monthly: 190, annual: 150 },
  2: { monthly: 240, annual: 200 },
  3: { monthly: 290, annual: 250 },
  4: { monthly: 350, annual: 300 },
}

for (const [tier, { monthly, annual }] of Object.entries(ZONE_PRICING)) {
  for (const [billing, amount] of [['monthly', monthly], ['annual', annual]]) {
    const lookupKey = `zone_${tier}z_${billing}`
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    if (existing.data[0]) {
      console.log(`✓ déjà présent — ${lookupKey} (${existing.data[0].id})`)
      continue
    }
    const price = await stripe.prices.create({
      unit_amount: amount * 100,
      currency: 'eur',
      recurring: { interval: billing === 'annual' ? 'year' : 'month' },
      lookup_key: lookupKey,
      product_data: {
        name: `BÂTI-AXE — ${tier} zone${tier > 1 ? 's' : ''} (${billing === 'annual' ? 'Annuel' : 'Mensuel'})`,
      },
    })
    console.log(`+ créé — ${lookupKey} (${price.id}) — ${amount}€`)
  }
}

console.log('Terminé.')
