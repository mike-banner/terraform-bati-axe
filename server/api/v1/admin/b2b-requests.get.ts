import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { CONTRACT_VERSIONS } from '../../../utils/contracts'

// 05.10-06 (B2B-04) : file d'attente des demandes partenaires B2B.
// Retourne les demandes triées par created_at DESC + la liste des admins (assignation).
// NB : les emails (assigné + admins) sont résolus via l'API admin — l'embedding
// PostgREST `assigned:auth.users(email)` échoue (parse error) sur cette instance.

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const query = getQuery(event)
  const status = typeof query.status === 'string' && query.status ? query.status : null

  let builder = supabase
    .from('b2b_requests')
    .select('*', { count: 'exact' })

  if (status) builder = builder.eq('status', status)

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Résolution des emails (assigné + admins) via l'API admin — un seul appel
  const emailById = new Map<string, string>()
  let admins: { id: string; email: string }[] = []
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (users?.users || [])) {
      if (u.email) emailById.set(u.id, u.email)
      if (u.app_metadata?.role === 'admin') admins.push({ id: u.id, email: u.email })
    }
  } catch {
    // non bloquant — le dropdown d'assignation restera vide
  }

  // Phase 05.21 : avenants par dossier + convention partenaire (jamais les jetons).
  const engagementsByRequest = new Map<string, any[]>()
  const movementsByRequest = new Map<string, any[]>()
  const frameworkByEmail = new Map<string, { engagement_id: string; signed_at: string }>()
  const ids = (data || []).map((r: any) => r.id)
  if (ids.length > 0) {
    const { data: engs, error: engErr } = await supabase
      .from('b2b_engagements')
      .select('id, request_id, lot_id, status, selected_at, not_awarded_reason, confirmed_amount_cents, commission_cents, signed_at, b2b_tender_lots(category), professionals(company_name)')
      .eq('type', 'lot_amendment')
      .in('request_id', ids)
    if (engErr) console.error('[05.21] Lecture avenants:', engErr.message)
    for (const { b2b_tender_lots, professionals: pro, ...e } of engs || []) {
      const list = engagementsByRequest.get(e.request_id) ?? []
      list.push({ ...e, lot_category: b2b_tender_lots?.category ?? null, pro_company: pro?.company_name ?? null })
      engagementsByRequest.set(e.request_id, list)
    }
    // D-28 : même journal que « Commissions en cours » (b2b_commission_movements), regroupé par dossier.
    const engInfo = new Map<string, { request_id: string; lot_category: string | null; pro_company: string | null }>()
    for (const [reqId, list] of engagementsByRequest) {
      for (const e of list) engInfo.set(e.id, { request_id: reqId, lot_category: e.lot_category, pro_company: e.pro_company })
    }
    if (engInfo.size > 0) {
      const { data: movs, error: movErr } = await supabase
        .from('b2b_commission_movements')
        .select('engagement_id, type, amount_cents, occurred_on, operator, created_at')
        .in('engagement_id', [...engInfo.keys()])
        .order('created_at', { ascending: false })
      if (movErr) console.error('[05.23] Lecture journal commissions:', movErr.message)
      for (const m of movs || []) {
        const info = engInfo.get(m.engagement_id)
        if (!info) continue
        const list = movementsByRequest.get(info.request_id) ?? []
        list.push({ occurred_on: m.occurred_on, created_at: m.created_at, type: m.type, amount_cents: Number(m.amount_cents), operator: m.operator, lot_category: info.lot_category, pro_company: info.pro_company })
        movementsByRequest.set(info.request_id, list)
      }
    }
    const emails = [...new Set((data || []).map((r: any) => String(r.contact_email).toLowerCase()))]
    const { data: fws, error: fwErr } = await supabase
      .from('b2b_engagements')
      .select('id, signer_email, signed_at')
      .eq('type', 'framework_partner')
      .eq('template_version', CONTRACT_VERSIONS.framework_partner)
      .in('signer_email', emails)
    if (fwErr) console.error('[05.21] Lecture conventions partenaire:', fwErr.message)
    for (const f of fws || []) frameworkByEmail.set(f.signer_email, { engagement_id: f.id, signed_at: f.signed_at })
  }

  const requests = (data || []).map((r: any) => ({
    ...r,
    assigned: r.assigned_to ? { email: emailById.get(r.assigned_to) || null } : null,
    partner_framework: frameworkByEmail.get(String(r.contact_email).toLowerCase()) ?? null,
    engagements: engagementsByRequest.get(r.id) ?? [],
    commission_movements: movementsByRequest.get(r.id) ?? [],
  }))

  return {
    requests,
    admins,
    total: count || 0,
  }
})
