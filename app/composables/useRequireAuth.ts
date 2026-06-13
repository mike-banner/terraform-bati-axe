// Garde d'authentification anti-race pour les pages protégées (/espace, /app).
//
// Problème : useSupabaseUser() est transitoirement null/undefined à l'hydratation.
// Sur un reload/SSR, la séquence RÉELLE est `null → User` : le SSR peut rendre la
// page en « déconnecté » avant que le client restaure la session depuis le stockage.
// Rediriger sur ce `null` transitoire éjecte un pro pourtant connecté.
//
// Solution : ne JAMAIS décider depuis useSupabaseUser() seul. On lit la session de
// façon autoritaire via getSession() (qui lit toujours le stockage, indépendamment
// de l'état SSR), côté client uniquement. On ne redirige que si la session est
// réellement absente, puis on réagit à une déconnexion explicite.
export function useRequireAuth(redirectTo = '/pro/claim') {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  if (import.meta.client) {
    const ready = ref(false)

    // Déconnexion explicite APRÈS la résolution initiale (user → null).
    // Gardé par `ready` pour ignorer le null transitoire de l'hydratation.
    watch(user, (u) => {
      if (ready.value && u === null) navigateTo(redirectTo)
    })

    onMounted(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      ready.value = true
      if (!session) navigateTo(redirectTo)
    })
  }

  return { user }
}
