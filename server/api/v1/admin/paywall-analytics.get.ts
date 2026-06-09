import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// CNV-07: admin-only aggregate analytics for paywall funnel (T-04.5-12: 403 on non-admin)

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // Query A: event counts by type over last 30 days
  const { data: allEvents, error: e1 } = await supabase
    .from('paywall_events')
    .select('event_type, qualify_score, pro_id, occurred_at')
    .gte('occurred_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .order('occurred_at', { ascending: false })

  if (e1) throw createError({ statusCode: 500, statusMessage: e1.message })

  const rows: Array<{ event_type: string; qualify_score: number | null; pro_id: string; occurred_at: string }> = allEvents ?? []

  // Totals by event_type
  const totals = { paywall_view: 0, checkout_started: 0, checkout_completed: 0 }
  for (const r of rows) {
    if (r.event_type in totals) (totals as any)[r.event_type]++
  }

  // Funnel for qualified pros (qualify_score >= 3) — CNV-07
  const qualified = rows.filter(r => (r.qualify_score ?? 0) >= 3)
  const qf = { paywall_view: 0, checkout_started: 0, checkout_completed: 0, conversion_rate: 0 }
  for (const r of qualified) {
    if (r.event_type in qf) (qf as any)[r.event_type]++
  }
  qf.conversion_rate = qf.paywall_view > 0
    ? Math.round((qf.checkout_completed / qf.paywall_view) * 100) / 100
    : 0

  // Recent 50 events for activity feed
  const recent = rows.slice(0, 50).map(r => ({
    pro_id: r.pro_id,
    qualify_score: r.qualify_score,
    event_type: r.event_type,
    occurred_at: r.occurred_at,
  }))

  return { totals, qualified_funnel: qf, recent }
})
