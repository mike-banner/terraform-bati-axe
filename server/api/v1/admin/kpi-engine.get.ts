import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

interface KpiResult {
  value: number | null
  status: 'green' | 'orange' | 'red' | 'unknown'
  label: string
  detail: string
  recommendation?: string
}

interface KpiResponse {
  period: { start: string; end: string }
  kpis: {
    cac: KpiResult
    ltv_cac: KpiResult
    churn: KpiResult
    matching: KpiResult
    retention: KpiResult
    supplier: KpiResult
  }
  raw: {
    totalPaidArtisans: number
    newPaidArtisans: number
    canceledArtisans: number
    totalProjects: number
    matchedProjects: number
    totalLeads: number
    unlockedLeads: number
    totalMarketingSpend: number
    avgSubscription: number
  }
}

function classify(value: number | null, green: number, orange: number, invert = false): 'green' | 'orange' | 'red' | 'unknown' {
  if (value === null) return 'unknown'
  if (invert) {
    // Lower is better (churn, CAC)
    if (value < green) return 'green'
    if (value <= orange) return 'orange'
    return 'red'
  }
  // Higher is better (LTV/CAC, matching, retention)
  if (value > green) return 'green'
  if (value >= orange) return 'orange'
  return 'red'
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any
  const query = getQuery(event)

  // Period: default last 30 days
  const now = new Date()
  const periodEnd = now.toISOString().slice(0, 10)
  const periodStart = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  const pStart = (query.start as string) || periodStart
  const pEnd = (query.end as string) || periodEnd

  // ─── 1. Total paid artisans ───────────────────────────────────────────────
  const { count: totalPaidArtisans } = await supabase
    .from('professionals')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'active')

  // ─── 2. New paid artisans in period ───────────────────────────────────────
  const { count: newPaidArtisans } = await supabase
    .from('professionals')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'active')
    .gte('created_at', pStart)
    .lte('created_at', pEnd + 'T23:59:59')

  // ─── 3. Canceled artisans in period (status changed to canceled) ──────────
  // We approximate: artisans with subscription_status = 'canceled' in the period
  // In production this would use a subscription_events table
  const { count: canceledArtisans } = await supabase
    .from('professionals')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'canceled')

  // ─── 4. Marketing spend in period ─────────────────────────────────────────
  const { data: spendData } = await supabase
    .from('marketing_spend_logs')
    .select('amount')
    .gte('logged_date', pStart)
    .lte('logged_date', pEnd)

  const totalMarketingSpend = (spendData || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

  // ─── 5. CAC ───────────────────────────────────────────────────────────────
  const cac = (newPaidArtisans || 0) > 0
    ? Math.round(totalMarketingSpend / (newPaidArtisans || 1))
    : null

  // ─── 6. Average subscription (ARPU proxy) ─────────────────────────────────
  // Approximate with a default 200€ if no Stripe data yet
  const avgSubscription = 200

  // ─── 7. LTV estimate ──────────────────────────────────────────────────────
  // LTV = ARPU × 0.8 (80% margin) × (1 / churn_rate)
  // churn_rate: if no data, estimate from canceled / (total + canceled)
  const churnEstimate = (totalPaidArtisans || 0) > 0
    ? (canceledArtisans || 0) / ((totalPaidArtisans || 0) + (canceledArtisans || 0))
    : 0.05 // default 5% if no data
  const avgLifetimeMonths = churnEstimate > 0 ? Math.min(1 / churnEstimate, 36) : 12
  const ltv = Math.round(avgSubscription * 0.8 * avgLifetimeMonths)

  // ─── 8. LTV / CAC ratio ───────────────────────────────────────────────────
  const ltvCacRatio = cac && cac > 0 ? Math.round((ltv / cac) * 100) / 100 : null

  // ─── 9. Churn rate ────────────────────────────────────────────────────────
  const churnRate = (totalPaidArtisans || 0) > 0
    ? Math.round((canceledArtisans || 0) / ((totalPaidArtisans || 0) + (canceledArtisans || 0)) * 10000) / 100
    : null

  // ─── 10. Matching rate 48h ────────────────────────────────────────────────
  const { data: matchingData } = await supabase
    .from('view_kpi_matching_48h')
    .select('*')
    .maybeSingle()

  const totalProjects = matchingData?.total_projects || 0
  const matchedProjects = matchingData?.matched_projects || 0
  const matchingRate = totalProjects > 0
    ? Math.round((matchedProjects / totalProjects) * 10000) / 100
    : null

  // ─── 11. Leads stats ──────────────────────────────────────────────────────
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })

  const { count: unlockedLeads } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .not('unlocked_at', 'is', null)

  // ─── 12. Retention rate (prescripteurs active in last 30 days) ────────────
  // Approximate: prospects who converted and are still active
  const { count: activeProspects } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('optin_status', 'accepted')
    .gte('created_at', pStart)

  const { count: totalProspects } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })

  const retentionRate = (totalProspects || 0) > 0
    ? Math.round((activeProspects || 0) / (totalProspects || 0) * 10000) / 100
    : null

  // ─── 13. Supplier activation (stub — no vendor_deals_usage yet) ───────────
  const supplierActivationRate = null // Will be populated when vendor_deals exist

  // ─── Build response ────────────────────────────────────────────────────────
  const response: KpiResponse = {
    period: { start: pStart, end: pEnd },
    kpis: {
      cac: {
        value: cac,
        status: classify(cac, 150, 250, true),
        label: 'CAC',
        detail: cac !== null ? `${cac} € / artisan recruté` : 'Pas assez de données',
        recommendation: cac !== null && classify(cac, 150, 250, true) === 'red'
          ? 'Revoir les commissions freelances ou augmenter le prix des packs'
          : undefined,
      },
      ltv_cac: {
        value: ltvCacRatio,
        status: classify(ltvCacRatio, 4, 2),
        label: 'Ratio LTV / CAC',
        detail: ltvCacRatio !== null ? `${ltvCacRatio}x` : 'Pas assez de données',
        recommendation: ltvCacRatio !== null && classify(ltvCacRatio, 4, 2) === 'red'
          ? 'Modèle non scalable — revoir l\'acquisition ou la monétisation'
          : undefined,
      },
      churn: {
        value: churnRate,
        status: classify(churnRate, 3, 6, true),
        label: 'Churn Artisans',
        detail: churnRate !== null ? `${churnRate}% / mois` : 'Pas assez de données',
        recommendation: churnRate !== null && classify(churnRate, 3, 6, true) === 'red'
          ? 'Appeler les artisans sortants — problème de volume ou qualité'
          : undefined,
      },
      matching: {
        value: matchingRate,
        status: classify(matchingRate, 85, 60),
        label: 'Matching 48h',
        detail: matchingRate !== null ? `${matchingRate}% (≥3 leads en 48h)` : 'Aucun projet',
        recommendation: matchingRate !== null && classify(matchingRate, 85, 60) === 'red'
          ? 'Pénurie d\'artisans — utiliser Lead Extractor pour injecter des pros'
          : undefined,
      },
      retention: {
        value: retentionRate,
        status: classify(retentionRate, 40, 20),
        label: 'Rétention Prescripteurs',
        detail: retentionRate !== null ? `${retentionRate}% actifs / 30j` : 'Aucun prescripteur',
        recommendation: retentionRate !== null && classify(retentionRate, 40, 20) === 'red'
          ? 'Notifications manquantes — relancer les prescripteurs inactifs'
          : undefined,
      },
      supplier: {
        value: supplierActivationRate,
        status: 'unknown',
        label: 'Activation Fournisseurs',
        detail: 'Module codes promo non lancé',
        recommendation: 'Implémenter les codes promo fournisseurs (Phase P11)',
      },
    },
    raw: {
      totalPaidArtisans: totalPaidArtisans || 0,
      newPaidArtisans: newPaidArtisans || 0,
      canceledArtisans: canceledArtisans || 0,
      totalProjects,
      matchedProjects,
      totalLeads: totalLeads || 0,
      unlockedLeads: unlockedLeads || 0,
      totalMarketingSpend,
      avgSubscription,
    },
  }

  return response
})
