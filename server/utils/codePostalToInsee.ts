// Phase 05.9 — Résolution code postal → code INSEE via geo.api.gouv.fr (officiel, gratuit, sans clé).
// Cache mémoire simple (ponytail) : on cache aussi les échecs (null). Ne throw JAMAIS vers l'appelant.

const cache = new Map<string, string | null>()

export async function resolveInseeFromCodePostal(codePostal: string): Promise<string | null> {
  const cp = codePostal.replace(/[^0-9]/g, '').slice(0, 5)
  if (cp.length < 5) return null

  if (cache.has(cp)) return cache.get(cp) ?? null

  try {
    const res = await $fetch<Array<{ code: string; nom: string }>>('https://geo.api.gouv.fr/communes', {
      query: { codePostal: cp, fields: 'code,nom,codesPostaux' },
      signal: AbortSignal.timeout(5000),
    })
    // Multi-communes : prendre le premier résultat (dégradation acceptable, cf. RESEARCH A3).
    const insee = res[0]?.code ?? null
    cache.set(cp, insee)
    return insee
  } catch {
    cache.set(cp, null)
    return null
  }
}
