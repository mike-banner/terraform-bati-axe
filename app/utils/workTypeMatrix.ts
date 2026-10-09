// Matrice de compatibilité postes de travaux -> catégories de pros (phase 05.19)
// Données pures, sans dépendance : utilisée par le simulateur et le matching Nitro.

export type ProfessionalType = 'specialiste' | 'entreprise_generale'

export interface CompatRule {
  /** Qui reçoit le chantier par défaut : EG seule si aucun spécialiste n'est pertinent */
  defaultRole: ProfessionalType
  /** Catégories de pro (PROFESSIONAL_CATEGORIES) qui déclenchent un match spécialiste */
  specialistMatches: string[]
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
const egOnly = (label: string): CompatRule => ({ defaultRole: 'entreprise_generale', specialistMatches: [], label })

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
  pac: egOnly('Pompe à chaleur'),
  chaudiere_reno: spec('Rénovation d’une chaudière', ['plomberie']),
  borne_irve: spec('Borne de recharge électrique', ['electricite']),
  vmc_chauffage: spec('Ventilation / VMC / Chauffage', ['plomberie', 'electricite']),
  isolation_ite_iti: spec('Isolation thermique (ITE/ITI)', ['isolation']),
  geothermie: egOnly('Géothermie'),
  poele_bois_granules: spec('Poêle bois / granulés', ['plomberie']),
  photovoltaique: egOnly('Panneaux solaires / photovoltaïque'),
  menuiserie_ext_rge: spec('Menuiseries extérieures RGE', ['menuiserie', 'renovation_energetique']),

  // Prestations ciblées
  salle_de_bain: spec('Rénovation de salle de bain', ['carrelage', 'plomberie'], 'implicit_team'),
  cuisine: spec('Rénovation de cuisine', ['menuiserie'], 'single'),
  toiture: spec('Rénovation de toiture', ['toiture', 'maconnerie']),
  facade: spec('Ravalement de façade', ['maconnerie']),
  extension: spec('Extension de maison', ['maconnerie', 'toiture']),
  surelevation: spec('Surélévation de maison', ['maconnerie', 'toiture']),
  combles: spec('Aménagement des combles', ['isolation', 'menuiserie'], 'implicit_team'),
  demolition: egOnly('Démolition'),
  terrasse: spec('Rénovation de terrasse', ['maconnerie']),
  cloture_portail: spec('Clôture / portail', ['maconnerie']),
  assainissement: egOnly('Assainissement'),
}

/**
 * Un pro reçoit-il ce chantier ? (règle de recouvrement, 05.19)
 * - entreprise générale : tout
 * - spécialiste : ≥1 poste dont specialistMatches recoupe ses catégories
 * - sans postes (projet legacy) : repli sur la catégorie unique du projet
 */
export function proMatchesProject(
  pro: { professional_type?: string | null; categories?: string[] | null },
  project: { selected_items?: string[] | null; category?: string | null },
): boolean {
  if (pro.professional_type === 'entreprise_generale') return true
  const cats = pro.categories ?? []
  const items = project.selected_items ?? []
  if (items.length === 0) return !!project.category && cats.includes(project.category)
  return items.some(i => COMPATIBILITY_MATRIX[i]?.specialistMatches.some(c => cats.includes(c)))
}
