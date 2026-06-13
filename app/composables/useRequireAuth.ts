// Garde d'authentification anti-race pour les pages protégées (/espace, /app).
//
// Problème : useSupabaseUser() passe transitoirement par `null` à l'hydratation,
// avant que la session ne soit restaurée. Rediriger sur ce `null` transitoire
// éjecte un pro pourtant connecté — typiquement au rechargement d'une page
// protégée, qui rebondit alors vers /pro/claim.
//
// Solution : on valide la session de façon autoritaire côté client (getSession),
// puis on ne réagit qu'à une déconnexion explicite survenue après le montage.
export function useRequireAuth(redirectTo = '/pro/claim') {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      navigateTo(redirectTo)
      return
    }
    watch(user, (u) => { if (u === null) navigateTo(redirectTo) })
  })

  return { user }
}
