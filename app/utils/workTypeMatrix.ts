// Matrice de compatibilité postes de travaux -> catégories de pros (phase 05.19)
// Données pures, sans dépendance : utilisée par le simulateur et le matching Nitro.

export type ProfessionalType = 'specialiste' | 'entreprise_generale'

export interface CompatRule {
  /** Qui reçoit le chantier par défaut : EG seule si aucun spécialiste n'est pertinent */
  defaultRole: ProfessionalType
  /** Catégories de pro (PROFESSIONAL_CATEGORIES) qui déclenchent un match spécialiste */
  specialistMatches: string[]
  /** Catégories qui déclenchent un match pour un EGB approuvé sur un poste réservé EGB */
  egbMatches?: string[]
  label: string
  groupingStrategy?: 'implicit_team' | 'single'
}

export const PROFESSIONAL_CATEGORIES: Record<string, string> = {
  maconnerie: 'Maçonnerie & Gros Œuvre',
  toiture: 'Toiture',
  electricite: 'Électricité',
  plomberie: 'Plomberie & Chauffage',
  peinture: 'Peinture',
  isolation: 'Isolation',
  carrelage: 'Carrelage',
  menuiserie: 'Menuiserie',
  renovation_energetique: 'Rénovation Énergétique',
}

const spec = (label: string, specialistMatches: string[], groupingStrategy?: CompatRule['groupingStrategy']): CompatRule => ({
  defaultRole: 'specialiste',
  specialistMatches,
  label,
  ...(groupingStrategy && { groupingStrategy }),
})

// Équipements coordonnés / hors spécialité : EGB uniquement
const egOnly = (label: string, egbMatches: string[]): CompatRule => ({ defaultRole: 'entreprise_generale', specialistMatches: [], egbMatches, label })

export const COMPATIBILITY_MATRIX: Record<string, CompatRule> = {
  // Rénovation globale : gros œuvre
  maconnerie: spec('Terrassement / Maçonnerie', ['maconnerie']),
  charpente_couverture: spec('Charpente / Couverture', ['toiture']),
  menuiserie_ext: spec('Menuiseries extérieures', ['menuiserie']),
  // Rénovation globale : second œuvre
  isolation_platrerie: spec('Isolation / Plâtrerie', ['isolation']),
  menuiserie_int: spec('Menuiserie intérieure', ['menuiserie']),
  plomberie_sanitaire: spec('Plomberie / Sanitaire', ['plomberie']),
  revetement_sol: spec('Revêtement de sol', ['carrelage']),
  peinture_finitions: spec('Peinture et finitions', ['peinture']),
  electricite: spec('Électricité', ['electricite']),

  // Rénovation énergétique
  pac: egOnly('Pompe à chaleur', ['renovation_energetique', 'plomberie']),
  chaudiere_reno: spec('Rénovation d’une chaudière', ['plomberie']),
  borne_irve: spec('Borne de recharge électrique', ['electricite']),
  vmc_chauffage: spec('Ventilation / VMC / Chauffage', ['plomberie', 'electricite']),
  isolation_ite_iti: spec('Isolation thermique (ITE/ITI)', ['isolation']),
  geothermie: egOnly('Géothermie', ['renovation_energetique', 'plomberie']),
  poele_bois_granules: spec('Poêle bois / granulés', ['plomberie']),
  photovoltaique: egOnly('Panneaux solaires / photovoltaïque', ['renovation_energetique', 'electricite']),
  menuiserie_ext_rge: spec('Menuiseries extérieures RGE', ['menuiserie', 'renovation_energetique']),

  // Prestations ciblées
  salle_de_bain: spec('Rénovation de salle de bain', ['carrelage', 'plomberie'], 'implicit_team'),
  cuisine: spec('Rénovation de cuisine', ['menuiserie'], 'single'),
  toiture: spec('Rénovation de toiture', ['toiture', 'maconnerie']),
  facade: spec('Ravalement de façade', ['maconnerie']),
  extension: spec('Extension de maison', ['maconnerie', 'toiture']),
  surelevation: spec('Surélévation de maison', ['maconnerie', 'toiture']),
  combles: spec('Aménagement des combles', ['isolation', 'menuiserie'], 'implicit_team'),
  demolition: egOnly('Démolition', ['maconnerie']),
  terrasse: spec('Rénovation de terrasse', ['maconnerie']),
  cloture_portail: spec('Clôture / portail', ['maconnerie']),
  assainissement: egOnly('Assainissement', ['maconnerie', 'plomberie']),
}

export const isEgbReserved = (item: string): boolean => COMPATIBILITY_MATRIX[item]?.defaultRole === 'entreprise_generale'

// Postes de la carte « Rénovation Énergétique » ; aussi proposés via la case opt-in de l'étape 2 (05.19-13)
export const ENERGY_ITEMS = ['pac', 'chaudiere_reno', 'borne_irve', 'vmc_chauffage', 'isolation_ite_iti', 'geothermie', 'poele_bois_granules', 'photovoltaique', 'menuiserie_ext_rge'] as const

/** Le projet contient-il au moins un poste énergétique ? (conditionne le fork aides du simulateur) */
export const hasEnergyItems = (items: readonly string[] | null | undefined): boolean =>
  !!items?.some(i => (ENERGY_ITEMS as readonly string[]).includes(i))

/** Qualification RGE (05.19-14) : attestation RGE validée ET décennale valide. Seule source de la règle. */
export const canDoEnergy = (pro: { rge_status?: string | null; decennal_status?: string | null }): boolean =>
  pro.rge_status === 'valid' && pro.decennal_status === 'valid'

/**
 * Un pro reçoit-il ce chantier ? (règle de recouvrement, 05.19)
 * - EGB non approuvé : jamais
 * - spécialiste : ≥1 poste dont specialistMatches recoupe ses catégories
 * - EGB approuvé : idem, avec en plus egbMatches (postes réservés EGB)
 * - postes ENERGY_ITEMS : seulement si canDoEnergy (RGE + décennale valides) ; un projet mixte
 *   retenu via un poste non énergétique reste accessible en entier (aucun masquage poste par poste)
 * - sans postes (projet legacy) : repli sur la catégorie unique du projet
 */
export function proMatchesProject(
  pro: { professional_type?: string | null; egb_status?: string | null; categories?: string[] | null; rge_status?: string | null; decennal_status?: string | null },
  project: { selected_items?: string[] | null; category?: string | null },
): boolean {
  const isEgb = pro.professional_type === 'entreprise_generale'
  if (isEgb && pro.egb_status !== 'approved') return false
  const cats = pro.categories ?? []
  const items = project.selected_items ?? []
  if (items.length === 0) return !!project.category && cats.includes(project.category)
  const energyOk = canDoEnergy(pro)
  return items.some((i) => {
    if (!energyOk && (ENERGY_ITEMS as readonly string[]).includes(i)) return false
    const r = COMPATIBILITY_MATRIX[i]
    if (!r) return false
    const m = isEgb ? [...r.specialistMatches, ...(r.egbMatches ?? [])] : r.specialistMatches
    return m.some(c => cats.includes(c))
  })
}

/**
 * Gate EGB (05.19-05) : une entreprise générale non approuvée est traitée comme
 * un spécialiste sans catégorie (aucun lead).
 */
export function effectiveProType<T extends { professional_type?: string | null; egb_status?: string | null; categories?: string[] | null; rge_status?: string | null; decennal_status?: string | null }>(pro: T): T {
  if (pro.professional_type === 'entreprise_generale' && pro.egb_status !== 'approved') {
    return { ...pro, professional_type: 'specialiste', categories: [] }
  }
  return pro
}

/** Garde d'accès au détail / déblocage d'un chantier (05.19-14). Une ligne `leads` existante conserve l'accès (chantier déjà débloqué avant une perte de RGE). */
export const canAccessLead = (
  pro: Parameters<typeof proMatchesProject>[0],
  project: Parameters<typeof proMatchesProject>[1],
  hasExistingLead = false,
): boolean => hasExistingLead || proMatchesProject(effectiveProType(pro), project)

export const CATEGORY_LIMITS: Record<ProfessionalType, { min: number; max: number }> = {
  specialiste: { min: 1, max: 2 },
  entreprise_generale: { min: 1, max: 9 },
}

export function categoriesError(type: string | null | undefined, categories: string[]): string | null {
  const t: ProfessionalType = type === 'entreprise_generale' ? 'entreprise_generale' : 'specialiste'
  const { min, max } = CATEGORY_LIMITS[t]
  if (categories.some(c => !PROFESSIONAL_CATEGORIES[c])) return 'Corps de métier inconnu.'
  if (new Set(categories).size !== categories.length) return 'Corps de métier en double.'
  if (categories.length < min) return 'Sélectionnez au moins un corps de métier.'
  if (categories.length > max) {
    return t === 'specialiste'
      ? 'Un spécialiste peut déclarer 2 corps de métier au maximum.'
      : 'Une entreprise générale peut déclarer 9 corps de métier au maximum.'
  }
  return null
}

// Date de mise en ligne de chaque métier. Ajouter un métier = ajouter sa clé ici ET dans PROFESSIONAL_CATEGORIES (test d'égalité des clés).
export const CATEGORY_ADDED_AT: Record<string, string> = {
  maconnerie: '2026-06-03T00:00:00Z', toiture: '2026-06-03T00:00:00Z', electricite: '2026-06-03T00:00:00Z',
  plomberie: '2026-06-03T00:00:00Z', peinture: '2026-06-03T00:00:00Z', isolation: '2026-06-03T00:00:00Z',
  carrelage: '2026-10-09T00:00:00Z', menuiserie: '2026-10-09T00:00:00Z', renovation_energetique: '2026-10-09T00:00:00Z',
}

/** Métiers ajoutés après `reviewedAt` et absents de `current` (liste seulement, jamais d'ajout automatique). */
export function newCategoriesSince(reviewedAt: string | null | undefined, current: string[]): string[] {
  if (!reviewedAt) return []
  const ref = Date.parse(reviewedAt)
  return Object.keys(PROFESSIONAL_CATEGORIES)
    .filter(k => Date.parse(CATEGORY_ADDED_AT[k] ?? '') > ref && !current.includes(k))
}
