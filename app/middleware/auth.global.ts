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

  // ── Public routes — redirect logged-in pro to dashboard ──────────────────
  // Admin can browse freely; only non-admin logged-in users are redirected.
  if (isPro.value) {
    // Allow only the claim page (needed for sign-out flow) and legal pages
    const allowed = ['/pro/claim', '/legal/']
    const isAllowed = allowed.some(prefix => path.startsWith(prefix))
    if (!isAllowed) return navigateTo('/app/dashboard')
  }
})
