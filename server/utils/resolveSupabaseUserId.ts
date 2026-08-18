// Résout l'UUID utilisateur depuis les claims du JWT GoTrue.
// Le JWT Supabase/GoTrue n'expose JAMAIS de claim `id` top-level :
// l'identifiant stable est `sub` (voir ADR/claim.post pour le contexte).
// `user.id` n'est défini que si le payload en contient un (dépend de la version
// du serveur d'auth) — d'où le fallback en cascade. À utiliser systématiquement
// après `serverSupabaseUser(event)` pour éviter les 404/undefined silencieux.
export function resolveSupabaseUserId(user: any): string | null {
  if (!user) return null
  return (
    user.id ??
    user.sub ??
    user.user_metadata?.sub ??
    null
  )
}
