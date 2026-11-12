// D-29 : « Qui agit ? » — déclaratif tant que le compte admin est partagé ; à remplacer par l'identité
// de connexion (comptes nominatifs via promote_to_admin). Liste dans NUXT_ADMIN_OPERATORS.
export function parseAdminOperators(raw: string | undefined | null): string[] {
  return [...new Set(String(raw ?? '').split(',').map(s => s.trim()).filter(Boolean))]
}

export function requireAdminOperator(config: Record<string, any>, value: unknown): string {
  const list = parseAdminOperators(config.adminOperators)
  if (list.length === 0) throw createError({ statusCode: 422, statusMessage: 'Aucun opérateur configuré (NUXT_ADMIN_OPERATORS).' })
  const v = typeof value === 'string' ? value.trim() : ''
  if (!list.includes(v)) throw createError({ statusCode: 422, statusMessage: 'Indiquez qui agit (liste des opérateurs).' })
  return v
}
