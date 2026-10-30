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
  const frameworkByEmail = new Map<string, { engagement_id: string; signed_at: string }>()
  const ids = (data || []).map((r: any) => r.id)
  if (ids.length > 0) {
    const { data: engs, error: engErr } = await supabase
      .from('b2b_engagements')
      .select('id, request_id, lot_id, status, declared_amount_cents, declared_at, confirmed_amount_cents, confirmed_at, commission_cents, signed_at, reminder_30_sent_at, reminder_60_sent_at, deposit_paid_at, invoiced_at, b2b_tender_lots(category), professionals(company_name)')
      .eq('type', 'lot_amendment')
      .in('request_id', ids)
    if (engErr) console.error('[05.21] Lecture avenants:', engErr.message)
    for (const { b2b_tender_lots, professionals: pro, ...e } of engs || []) {
      const list = engagementsByRequest.get(e.request_id) ?? []
      list.push({ ...e, lot_category: b2b_tender_lots?.category ?? null, pro_company: pro?.company_name ?? null })
      engagementsByRequest.set(e.request_id, list)
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
  }))

  // Pros vérifiés — pour la sélection des 2-3 sous-traitants recommandés (DirCo)
  let professionals: { id: string; company_name: string; full_name: string; category: string | null; canonical_slug: string | null; postal_code: string | null }[] = []
  try {
    const { data: pros } = await supabase
      .from('professionals')
      .select('id, company_name, full_name, category, canonical_slug, postal_code')
      .eq('is_verified', true)
      .order('company_name')
      .limit(500)
    professionals = pros || []
  } catch {
    // non bloquant — le picker restera vide
  }

  return {
    requests,
    admins,
    professionals,
    total: count || 0,
  }
})
