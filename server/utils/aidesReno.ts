// Phase 05.9 — Mapping FERMÉ vers l'API Mes Aides Réno (moteur Publicodes) + résumé aides/reste à charge.

export interface AidesRenoSituation {
  revenu_classe: string
  logement_type: string
  statut_proprietaire: string
  periode_construction: string
  surface: number
}

/**
 * Construit la query "situation" Publicodes à partir d'un mapping FERMÉ (whitelist).
 * Ne JAMAIS faire `Object.entries(situation)` en pass-through : chaque clé est
 * explicitement mappée pour éviter toute injection de paramètre arbitraire (RESEARCH §Security).
 * Clés SANS espaces autour des points, valeurs textuelles ENTRE guillemets simples.
 */
export function buildSituationQuery(situation: AidesRenoSituation, inseeCode: string): Record<string, string> {
  return {
    'ménage.revenu.classe': `'${situation.revenu_classe}'`,
    'logement.type': `'${situation.logement_type}'`,
    'vous.propriétaire.statut': `'${situation.statut_proprietaire}'`,
    'logement.commune': `'${inseeCode}'`,
    // ✅ Validé 2026-08-18 par appel réel : cette clé fait disparaître « logement . période de construction » des missingVariables.
    // NB : « résidence principale » et « nb personnes » ne sont PAS consommés par `eligibilite` (testés : aucune incidence sur missingVariables) → non envoyés.
    'logement.période de construction': `'${situation.periode_construction}'`,
    // ✅ Validé 2026-08-18 par appel réel : accepte un nombre simple (ex. '100').
    'logement.surface': String(situation.surface),
  }
}

export interface AideRenoResult {
  ok: true
  aides: Array<{ label: string; montant: number }>
  aides_total: number
  reste_a_charge_min: number
  reste_a_charge_max: number
}

export type AidesRenoResponse = AideRenoResult | { ok: false; reason: 'unavailable' }

/**
 * Résume la réponse Publicodes : somme des subventions numériques (les prêts type
 * éco-PTZ sont exclus — ils se remboursent) et calcule le reste à charge localement
 * (coût travaux − subventions). Aucun champ natif `reste à charge` n'existe dans l'API.
 */
export function computeAidesSummary(rows: any[], coutMin: number, coutMax: number): AideRenoResult {
  const aides: Array<{ label: string; montant: number }> = []
  let aides_total = 0

  for (const row of rows) {
    if (!row || row.status !== true) continue
    const rawValue = row.rawValue
    const isSubvention = typeof rawValue === 'number' && row.type !== 'prêt'
    if (!isSubvention) continue
    aides.push({ label: row.label, montant: rawValue })
    aides_total += rawValue
  }

  return {
    ok: true,
    aides,
    aides_total,
    reste_a_charge_min: Math.max(0, coutMin - aides_total),
    reste_a_charge_max: Math.max(0, coutMax - aides_total),
  }
}
