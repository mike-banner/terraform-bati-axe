// Auto-logout après inactivité (30 min)
// Inactivité = pas de click, mouvement souris, ou keystroke
export function useIdleLogout(timeoutMinutes = 30) {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()

  let idleTimer: NodeJS.Timeout | null = null
  const IDLE_TIME = timeoutMinutes * 60 * 1000

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer)
    if (!user.value) return

    idleTimer = setTimeout(async () => {
      console.log(`[Idle] ${timeoutMinutes}min inactivité — déconnexion...`)
      try {
        await supabase.auth.signOut()
        await router.push('/')
      } catch (err) {
        console.error('[Idle] Erreur déconnexion:', err)
      }
    }, IDLE_TIME)
  }

  onMounted(() => {
    if (!user.value) return

    // Event listeners pour réinitialiser le timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true)
    })

    resetIdleTimer()

    onBeforeUnmount(() => {
      if (idleTimer) clearTimeout(idleTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true)
      })
    })
  })

  return { resetIdleTimer }
}
