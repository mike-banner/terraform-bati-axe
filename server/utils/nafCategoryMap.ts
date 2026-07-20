// Mapping statique code NAF (rev. 2, divisions 41 + 43 - construction) -> categories BTP du projet.
// Cles normalisees SANS point, MAJUSCULE (ex "4321A"). Valeurs limitees a VALID_CATEGORIES
// (server/api/v1/pro/claim.post.ts) : maconnerie, toiture, electricite, plomberie, peinture, isolation.
export const NAF_TO_CATEGORIES: Record<string, string[]> = {
  '4321A': ['electricite'], // installation electrique tous locaux
  '4321B': ['electricite'], // installation electrique voie publique
  '4322A': ['plomberie'], // installation eau et gaz tous locaux
  '4322B': ['plomberie'], // installation equipements thermiques / climatisation
  '4329A': ['isolation'], // travaux d'isolation
  '4331Z': ['isolation'], // travaux de platrerie -- ponytail: rattachement de jugement (platrerie proche isolation/cloisons, pas une equivalence officielle)
  '4333Z': ['peinture'], // revetement des sols et des murs
  '4334Z': ['peinture'], // peinture et vitrerie
  '4391A': ['toiture'], // travaux de charpente
  '4391B': ['toiture'], // travaux de couverture par elements
  '4399A': ['toiture'], // travaux d'etancheite -- ponytail: rattachement de jugement (etancheite souvent toiture-terrasse, pas une equivalence officielle)
  '4399C': ['maconnerie'], // maconnerie generale et gros oeuvre de batiment
  '4120A': ['maconnerie'], // construction de maisons individuelles
  '4120B': ['maconnerie'] // construction d'autres batiments
}

export function suggestCategoriesFromNaf(naf?: string): string[] {
  if (!naf) return []
  const normalized = naf.toUpperCase().replace(/[.\s]/g, '')
  return NAF_TO_CATEGORIES[normalized] ?? []
}

// Self-check minimal (node --experimental-strip-types ou tsx) : node server/utils/nafCategoryMap.ts
function _selfCheck() {
  const known = suggestCategoriesFromNaf('4321A')
  const unknown = suggestCategoriesFromNaf('49.10Z')
  if (!known.includes('electricite')) throw new Error('_selfCheck: 4321A devrait inclure electricite')
  if (unknown.length !== 0) throw new Error('_selfCheck: 49.10Z devrait renvoyer []')
  console.log('_selfCheck OK', known, unknown)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  _selfCheck()
}
