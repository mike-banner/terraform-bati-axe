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
  // SSR: session is not reliably available before client hydration.
  // Page components handle auth redirects themselves via watchEffect.
  if (import.meta.server) return

  const user = useSupabaseUser()

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin    = computed(() => user.value?.app_metadata?.role === 'admin')
  const isPro      = computed(() => isLoggedIn.value && !isAdmin.value)

  const path = to.path

  // ── /admin/* ──────────────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (!isLoggedIn.value) return navigateTo('/pro/claim')
    if (!isAdmin.value)    return navigateTo('/')
    return
  }

  // ── /app/* and /espace/* ──────────────────────────────────────────────────
  if (path.startsWith('/app') || path.startsWith('/espace')) {
    if (!isLoggedIn.value) return navigateTo('/pro/claim')
    return
  }

  // ── /pro/claim — let the page component handle redirection ─────────────────
  if (path === '/pro/claim') {
    if (isAdmin.value) return navigateTo('/admin')
    return
  }

  // ── Public routes — do not blindly redirect to dashboard ──────────────────
  // Pages like '/' will have their own logic.
})
