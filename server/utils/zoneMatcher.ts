/**
 * 05.16 — Zone Matcher & Pricing Dégressif
 *
 * Match un code postal vers une zone 78 et calcule le prix
 * selon le nombre de zones souscrites par le pro.
 */

const ZONE_PRICING: Record<number, { monthly: number; annual: number }> = {
  1: { monthly: 190, annual: 150 },
  2: { monthly: 240, annual: 200 },
  3: { monthly: 290, annual: 250 },
  4: { monthly: 350, annual: 300 },
}

/**
 * Trouve la zone correspondant à un code postal (table zones, type='area').
 */
export async function matchZone(postalCode: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await useSupabaseServiceRole()
    .from('zones')
    .select('id, name')
    .eq('type', 'area')
    .eq('is_active', true)
    .contains('postal_codes', [postalCode])
    .maybeSingle()

  if (error || !data) return null
  return { id: data.id, name: data.name }
}

/**
 * Calcule le prix mensuel/annuel selon le nombre de zones du pro.
 * Le pricing est dégressif : plus le pro a de zones, moins il coûte par zone.
 */
export function calculateZonePrice(zoneCount: number, billing: 'monthly' | 'annual'): number {
  const tier = Math.min(Math.max(zoneCount, 1), 4)
  return ZONE_PRICING[tier][billing]
}

/**
 * Clé stable identifiant un palier de prix — sert de lookup_key Stripe
 * pour réutiliser le même Price au lieu d'en recréer un à chaque souscription.
 */
export function zonePriceLookupKey(zoneCount: number, billing: 'monthly' | 'annual'): string {
  const tier = Math.min(Math.max(zoneCount, 1), 4)
  return `zone_${tier}z_${billing}`
}

/**
 * Vérifie qu'un abonnement Stripe est modifiable (ajout/retrait de zone, changement de
 * facturation) : un seul Subscription Schedule à la fois côté Stripe, et pas de
 * modification sur un abonnement en cours de résiliation (sinon le pro paierait un
 * nouveau palier sur un service qui s'arrête quand même à la date prévue).
 */
export function assertSubscriptionModifiable(sub: { schedule: unknown; cancel_at_period_end: boolean }) {
  if (sub.cancel_at_period_end) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Votre abonnement est en cours de résiliation. Réactivez-le via "Gérer la facturation" avant de modifier vos zones.',
    })
  }
  if (sub.schedule) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un changement est déjà programmé sur votre abonnement — annulez-le avant d\'en démarrer un autre.',
    })
  }
}

/**
 * Retourne le détail du pricing pour l'affichage UI.
 */
export function getPricingTiers() {
  return Object.entries(ZONE_PRICING).map(([count, prices]) => ({
    zoneCount: Number(count),
    monthly: prices.monthly,
    annual: prices.annual,
    savings: (prices.monthly - prices.annual) * 12,
  }))
}
