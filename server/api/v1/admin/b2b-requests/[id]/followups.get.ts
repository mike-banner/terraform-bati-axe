import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { CATEGORY_LABELS } from '../../../../../utils/categoryLabels'

// Statuts à partir desquels l'artisan est retenu par le partenaire.
const RETAINED = new Set(['selected', 'quote_submitted', 'contested', 'quote_confirmed', 'commission_cancelled'])

// D-25 / ADR-004 : coordonnées complètes réservées à l'admin, jamais exposées ailleurs.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const id = idParsed.data

  setResponseHeaders(event, { 'Cache-Control': 'no-store' })

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: req } = await supabase
    .from('b2b_requests')
    .select('id, contact_name, contact_company, contact_phone, contact_email, on_behalf_of')
    .eq('id', id).maybeSingle()
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  const { data: engs } = await supabase
    .from('b2b_engagements')
    .select('id, lot_id, pro_id, status, selected_at, b2b_tender_lots(category), professionals(company_name, full_name, phone, email)')
    .eq('type', 'lot_amendment').eq('request_id', id)

  const rank = (e: any) => (RETAINED.has(e.status) || e.selected_at ? 0 : e.status === 'signed' ? 1 : 2)
  const artisans = [...(engs ?? [])]
    .sort((a: any, b: any) => rank(a) - rank(b))
    .map((e: any) => ({
      role: 'artisan' as const,
      label: 'Artisan',
      engagement_id: e.id,
      lot_id: e.lot_id,
      pro_id: e.pro_id,
      lot_label: CATEGORY_LABELS[e.b2b_tender_lots?.category] ?? e.b2b_tender_lots?.category ?? null,
      status: e.status,
      retained: rank(e) === 0,
      company: e.professionals?.company_name ?? null,
      name: e.professionals?.full_name ?? null,
      phone: e.professionals?.phone ?? null,
      email: e.professionals?.email ?? null,
    }))

  const parties = [
    {
      role: 'demandeur' as const,
      label: 'Demandeur (partenaire)',
      name: req.contact_name,
      company: req.contact_company ?? null,
      phone: req.contact_phone ?? null,
      email: req.contact_email ?? null,
      pour_le_compte_de: req.on_behalf_of ?? null,
    },
    ...artisans,
  ]

  const { data: rows } = await supabase
    .from('b2b_admin_followups')
    .select('id, lot_id, pro_id, party, outcome, note, next_followup_on, called_at, actor_id, operator')
    .eq('request_id', id)
    .order('called_at', { ascending: false })
    .limit(200)

  const emailById = new Map<string, string>()
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (users?.users || [])) if (u.email) emailById.set(u.id, u.email)
  } catch {
    // non bloquant : l'opérateur déclaré suffit
  }

  const followups = (rows ?? []).map((f: any) => ({ ...f, actor_email: emailById.get(f.actor_id) ?? null }))
  return { request_ref: id.slice(0, 8).toUpperCase(), parties, call_order: ['demandeur', 'artisan'], followups }
})
