export interface SiretLookupResult {
  status: 'active' | 'closed' | 'not_found' | 'error'
  company_name?: string
  address?: string
  legal_form?: string
  naf_code?: string
  verified_at: string
}

export async function lookupSiret(siret: string): Promise<SiretLookupResult> {
  const verified_at = new Date().toISOString()
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    const json = await res.json() as {
      total_results: number
      results: Array<{
        nom_complet: string
        adresse: string
        etat_administratif: string
        nature_juridique?: string
        activite_principale?: string
      }>
    }

    if (!json.total_results || json.total_results === 0) {
      return { status: 'not_found', verified_at }
    }

    const entry = json.results[0]!
    const company_name = entry.nom_complet?.slice(0, 255)
    const address = entry.adresse
    const legal_form = entry.nature_juridique
    const naf_code = entry.activite_principale?.toUpperCase().trim()

    if (entry.etat_administratif === 'F') {
      return { status: 'closed', company_name, address, legal_form, naf_code, verified_at }
    }

    return { status: 'active', company_name, address, legal_form, naf_code, verified_at }
  } catch {
    return { status: 'error', verified_at }
  }
}
