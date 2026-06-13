// Garde d'authentification anti-race pour les pages protégées (/espace, /app).
//
// Problème : useSupabaseUser() peut être undefined/null transitoirement à l'hydratation.
// Rediriger sur ce `null` transitoire éjecte un pro pourtant connecté au rechargement.
//
// Solution : watch(immediate) pour capturer la PREMIÈRE valeur non-undefined de user.
// C'est le moment où Supabase a fini l'hydratation de la session.
export function useRequireAuth(redirectTo = '/pro/claim') {
  const user = useSupabaseUser()
  const hasChecked = ref(false)

  watch(
    user,
    (u) => {
      if (!hasChecked.value && u !== undefined) {
        hasChecked.value = true
        // First settled value: if null, not authenticated
        if (u === null) {
          navigateTo(redirectTo)
        }
      }
      // After first check, watch for explicit logout (user → null)
      else if (hasChecked.value && u === null) {
        navigateTo(redirectTo)
      }
    },
    { immediate: true }
  )

  return { user }
}
