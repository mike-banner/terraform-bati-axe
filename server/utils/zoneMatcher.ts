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
