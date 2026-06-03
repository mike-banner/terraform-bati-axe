// ─────────────────────────────────────────────────────────────────────────────
// Global auth middleware
//
// Rules:
//   /admin/*  → admin only (app_metadata.role === 'admin')
//   /app/*    → any logged-in user; redirect to /pro/claim if anonymous
//   /*        → if logged-in non-admin pro, redirect to /app/dashboard
//              (pros have one destination when authenticated)
// ─────────────────────────────────────────────────────────────────────────────

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin    = computed(() => user.value?.app_metadata?.role === 'admin')
  const isPro      = computed(() => isLoggedIn.value && !isAdmin.value)

  const path = to.path

  // ── /admin/* ──────────────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (!isLoggedIn.value) return navigateTo('/pro/claim')
    if (!isAdmin.value)    return navigateTo('/')
    return // admin — allow
  }

  // ── /app/* ────────────────────────────────────────────────────────────────
  if (path.startsWith('/app')) {
    if (!isLoggedIn.value) return navigateTo('/pro/claim')
    return // logged in — allow
  }

  // ── /pro/claim — redirect away if already authenticated ──────────────────
  if (path === '/pro/claim') {
    if (isAdmin.value)    return navigateTo('/admin')
    if (isLoggedIn.value) return navigateTo('/app/dashboard')
    return // anonymous — show the form
  }

  // ── Public routes — redirect logged-in pro to dashboard ──────────────────
  if (isPro.value) {
    const allowed = ['/legal/']
    const isAllowed = allowed.some(prefix => path.startsWith(prefix))
    if (!isAllowed) return navigateTo('/app/dashboard')
  }
})
