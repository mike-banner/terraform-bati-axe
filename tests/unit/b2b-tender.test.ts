import { describe, it, expect } from 'vitest'
import { b2bRequestSchema, buildTenderLots } from '../../server/utils/b2bTender'

const base = {
  apporteur_type: 'syndic' as const,
  need_type: 'projet_immediat' as const,
  project_postal_code: '78000',
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

  it('qualifications_requises : valeurs du catalogue acceptées, valeur libre rejetée, absence acceptée', () => {
    const desc = { ...base, description: 'Ravalement de façade complet sur bâtiment collectif.' }
    expect(b2bRequestSchema.safeParse({ ...desc, qualifications_requises: ['rge', 'qualibat'] }).success).toBe(true)
    expect(b2bRequestSchema.safeParse({ ...desc, qualifications_requises: ['rge', 'diplome-maison'] }).success).toBe(false)
    expect(b2bRequestSchema.safeParse(desc).success).toBe(true)
    expect(b2bRequestSchema.safeParse({ ...desc, qualifications_requises: null }).success).toBe(true)
  })

  it('partenariat régulier sans description → accepté (étape 3 sautée)', () => {
    const r = b2bRequestSchema.safeParse({ ...base, need_type: 'partenariat_regulier' })
    expect(r.success).toBe(true)
  })

  it('projet immédiat sans code postal → rejeté', () => {
    const r = b2bRequestSchema.safeParse({ ...base, description: 'Ravalement de façade complet sur bâtiment collectif.', project_postal_code: null })
    expect(r.success).toBe(false)
  })

  it('projet immédiat avec code postal invalide (pas 5 chiffres) → rejeté', () => {
    const r = b2bRequestSchema.safeParse({ ...base, description: 'Ravalement de façade complet sur bâtiment collectif.', project_postal_code: '780' })
    expect(r.success).toBe(false)
  })

  it('partenariat régulier sans code postal → accepté (pas de chantier identifié)', () => {
    const r = b2bRequestSchema.safeParse({ ...base, need_type: 'partenariat_regulier', project_postal_code: null })
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

describe('coordonnées du contact (durcissement 05.21)', () => {
  const ok = { ...base, need_type: 'partenariat_regulier' as const }

  it.each(['06 12 34 56 78', '0612345678', '+33 6 12 34 56 78', '+33612345678', '0033 6 12 34 56 78', '06.12.34.56.78', '06-12-34-56-78'])('téléphone valide : %s', (p) => {
    expect(b2bRequestSchema.safeParse({ ...ok, contact_phone: p }).success).toBe(true)
  })

  it.each(['abcdefghij', '06 12 34 56 7a', '0612345', '+1 202 555 0100', '12345678', '06 12 34 56 78 90', '06<script>', ''])('téléphone refusé : %s', (p) => {
    expect(b2bRequestSchema.safeParse({ ...ok, contact_phone: p }).success).toBe(false)
  })

  it.each(['Marie Martin', 'Jean-Pierre O\'Neil', 'Élodie Lefèvre', 'Zoë Müller-Çelik'])('nom valide : %s', (n) => {
    expect(b2bRequestSchema.safeParse({ ...ok, contact_name: n }).success).toBe(true)
  })

  it.each(['J', '<b>Jean</b>', 'Jean123', 'Jean\nDupont', 'Jean@Dupont', '1234'])('nom refusé : %s', (n) => {
    expect(b2bRequestSchema.safeParse({ ...ok, contact_name: n }).success).toBe(false)
  })

  it('structure : accepte « Cabinet Dupont & Fils (SARL) », refuse les chevrons', () => {
    expect(b2bRequestSchema.safeParse({ ...ok, contact_company: 'Cabinet Dupont & Fils (SARL)' }).success).toBe(true)
    expect(b2bRequestSchema.safeParse({ ...ok, contact_company: '<img src=x>' }).success).toBe(false)
  })

  it('le formulaire envoie des null pour les champs vides : acceptés', () => {
    const r = b2bRequestSchema.safeParse({ ...ok, contact_company: null, project_location: null, description: null, budget_range: null, certification_number: null, lots_categories: null })
    expect(r.success).toBe(true)
  })

  it('e-mail : normalisé en minuscules, trop long refusé', () => {
    const r = b2bRequestSchema.safeParse({ ...ok, contact_email: ' Jean@Example.COM ' })
    expect(r.success && r.data.contact_email).toBe('jean@example.com')
    expect(b2bRequestSchema.safeParse({ ...ok, contact_email: 'a'.repeat(250) + '@x.fr' }).success).toBe(false)
  })

  it('certification : motif restreint', () => {
    expect(b2bRequestSchema.safeParse({ ...ok, certification_number: 'CERT-2024/AB_12' }).success).toBe(true)
    expect(b2bRequestSchema.safeParse({ ...ok, certification_number: "x'; drop table" }).success).toBe(false)
  })
})
