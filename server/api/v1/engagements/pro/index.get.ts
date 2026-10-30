import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { CATEGORY_LABELS } from '../../../../utils/categoryLabels'

// Phase 05.21 — « Mes contrats » : contrats signés du pro connecté (jamais content_html ni coordonnées partenaire).
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const supabase = serverSupabaseServiceRole(event) as any
  const { data, error } = await supabase
    .from('b2b_engagements')
    .select('id, type, template_version, signed_at, status, lot_id, request_id')
    .eq('pro_id', user.id)
    .order('signed_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Impossible de charger vos contrats.' })

  const rows = (data ?? []) as any[]
  const lotIds = rows.map(r => r.lot_id).filter(Boolean)
  const lots: Record<string, any> = {}
  if (lotIds.length) {
    const { data: l } = await supabase.from('b2b_tender_lots').select('id, category').in('id', lotIds)
    for (const x of (l ?? []) as any[]) lots[x.id] = x
  }

  return {
    engagements: rows.map(r => ({
      id: r.id,
      type: r.type,
      template_version: r.template_version,
      signed_at: r.signed_at,
      status: r.status,
      lot_id: r.lot_id,
      lot_label: r.lot_id
        ? `Réf. ${String(r.request_id ?? '').slice(0, 8).toUpperCase()} — ${(CATEGORY_LABELS as any)[lots[r.lot_id]?.category] ?? lots[r.lot_id]?.category ?? 'lot'}`
        : null,
    })),
  }
})
