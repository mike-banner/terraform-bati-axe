import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// ADM-01 (Phase 06.1) : vue d'ensemble admin — KPIs agrégés (pros, projets, leads, paywall).

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // Pros : total / vérifiés / en attente / abonnés actifs
  const { count: prosTotal, error: ePros } = await supabase
    .from('professionals').select('id', { count: 'exact', head: true })
  if (ePros) throw createError({ statusCode: 500, statusMessage: ePros.message })

  const { count: prosVerified } = await supabase
    .from('professionals').select('id', { count: 'exact', head: true }).eq('is_verified', true)

  const { count: prosActive } = await supabase
    .from('professionals').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active')

  // Projets : total / qualifiés / en attente
  const { count: projectsTotal, error: eProjects } = await supabase
    .from('projects').select('id', { count: 'exact', head: true })
  if (eProjects) throw createError({ statusCode: 500, statusMessage: eProjects.message })

  const { count: projectsQualified } = await supabase
    .from('projects').select('id', { count: 'exact', head: true }).eq('status', 'qualified')

  // Leads : total / débloqués (coordonnées accessibles)
  const { count: leadsTotal, error: eLeads } = await supabase
    .from('leads').select('id', { count: 'exact', head: true })
  if (eLeads) throw createError({ statusCode: 500, statusMessage: eLeads.message })

  const { count: leadsUnlocked } = await supabase
    .from('leads').select('id', { count: 'exact', head: true }).not('unlocked_at', 'is', null)

  // Paywall funnel (30 derniers jours) — CNV-07
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data: events, error: eEvents } = await supabase
    .from('paywall_events')
    .select('event_type')
    .gte('occurred_at', since30)

  if (eEvents) throw createError({ statusCode: 500, statusMessage: eEvents.message })

  const funnel = { paywall_view: 0, checkout_started: 0, checkout_completed: 0 }
  for (const r of (events ?? [])) {
    if (r.event_type in funnel) (funnel as any)[r.event_type]++
  }

  return {
    professionals: {
      total: prosTotal ?? 0,
      verified: prosVerified ?? 0,
      pending: (prosTotal ?? 0) - (prosVerified ?? 0),
      active_subscriptions: prosActive ?? 0,
    },
    projects: {
      total: projectsTotal ?? 0,
      qualified: projectsQualified ?? 0,
      pending: (projectsTotal ?? 0) - (projectsQualified ?? 0),
    },
    leads: {
      total: leadsTotal ?? 0,
      unlocked: leadsUnlocked ?? 0,
    },
    paywall_30d: funnel,
  }
})
