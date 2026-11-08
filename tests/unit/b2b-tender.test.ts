import { describe, it, expect } from 'vitest'
import { b2bRequestSchema, buildTenderLots } from '../../server/utils/b2bTender'

const base = {
  apporteur_type: 'syndic' as const,
  need_type: 'projet_immediat' as const,
  contact_name: 'Jean Dupont',
  contact_phone: '06 12 34 56 78',
  contact_email: 'jean.dupont@example.com',
  consent_accepted: true,
}

describe('b2bRequestSchema', () => {
  it('projet immédiat avec description < 20 caractères → rejeté', () => {
    const r = b2bRequestSchema.safeParse({ ...base, description: 'court' })
    expect(r.success).toBe(false)
  })

  it('projet immédiat avec description >= 20 caractères → accepté', () => {
    const r = b2bRequestSchema.safeParse({ ...base, description: 'Ravalement de façade complet sur bâtiment collectif.' })
    expect(r.success).toBe(true)
  })

  it('partenariat régulier sans description → accepté (étape 3 sautée)', () => {
    const r = b2bRequestSchema.safeParse({ ...base, need_type: 'partenariat_regulier' })
    expect(r.success).toBe(true)
  })

  it('lots_categories avec catégorie inexistante → rejeté', () => {
    const r = b2bRequestSchema.safeParse({
      ...base,
      description: 'Ravalement de façade complet sur bâtiment collectif.',
      lots_categories: ['plomberie', 'inexistant'],
    })
    expect(r.success).toBe(false)
  })
})

describe('buildTenderLots', () => {
  it('syndic avec catégories dupliquées → lots dédoublonnés, ordre préservé', () => {
    const lots = buildTenderLots('req-1', 'syndic', ['toiture', 'toiture', 'electricite'])
    expect(lots).toEqual([
      { request_id: 'req-1', category: 'toiture', description: null },
      { request_id: 'req-1', category: 'electricite', description: null },
    ])
  })

  it('non-syndic → aucun lot créé', () => {
    const lots = buildTenderLots('req-1', 'architecte', ['toiture'])
    expect(lots).toEqual([])
  })

  it('syndic sans catégories → aucun lot créé', () => {
    const lots = buildTenderLots('req-1', 'syndic', null)
    expect(lots).toEqual([])
  })
})

describe('détail des lots (05.21)', () => {
  const syndic = { ...base, description: 'Rénovation des parties communes de la résidence.' }

  it('syndic : un lot sans description de travaux → rejeté', () => {
    const r = b2bRequestSchema.safeParse({ ...syndic, lots_categories: ['electricite', 'peinture'], lots_details: { electricite: 'Remplacement du tableau électrique.' } })
    expect(r.success).toBe(false)
  })

  it('syndic : tous les lots décrits → accepté et description transmise au lot', () => {
    const input = { ...syndic, lots_categories: ['electricite', 'peinture'], lots_details: { electricite: ' Remplacement du tableau électrique. ', peinture: 'Peinture des cages d\'escalier.' } }
    expect(b2bRequestSchema.safeParse(input).success).toBe(true)
    const lots = buildTenderLots('req-1', 'syndic', input.lots_categories, input.lots_details)
    expect(lots.map(l => l.description)).toEqual(['Remplacement du tableau électrique.', 'Peinture des cages d\'escalier.'])
  })

  it('infos chantier hors bornes ou calendrier inconnu → rejeté', () => {
    expect(b2bRequestSchema.safeParse({ ...syndic, nb_logements: 0 }).success).toBe(false)
    expect(b2bRequestSchema.safeParse({ ...syndic, surface_m2: 2_000_000 }).success).toBe(false)
    expect(b2bRequestSchema.safeParse({ ...syndic, calendrier_souhaite: 'demain' }).success).toBe(false)
    expect(b2bRequestSchema.safeParse({ ...syndic, nb_logements: 12, surface_m2: 800, calendrier_souhaite: 'urgent' }).success).toBe(true)
  })
})
