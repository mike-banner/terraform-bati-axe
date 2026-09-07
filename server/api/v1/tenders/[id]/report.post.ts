import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

const idSchema = z.string().uuid('Identifiant de lot invalide.')

const REPORT_REASONS = ['coordonnees_suspectes', 'hors_perimetre', 'doublon', 'contenu_abusif', 'autre'] as const
const bodySchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: parsedId.error.issues[0]?.message ?? 'Identifiant de lot invalide.' })
  const lotId = parsedId.data

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Signalement invalide.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: lot, error: lotError } = await supabase
    .from('b2b_tender_lots')
    .select('id, request_id')
    .eq('id', lotId)
    .single()
  if (lotError || !lot) throw createError({ statusCode: 404, statusMessage: "Appel d'offres introuvable." })

  const { data: req, error: reqError } = await supabase
    .from('b2b_requests')
    .select('id, reported_count, report_reasons')
    .eq('id', lot.request_id)
    .single()
  if (reqError || !req) throw createError({ statusCode: 404, statusMessage: "Appel d'offres introuvable." })

  // D-10 — purement informatif : ne modifie NI b2b_requests.status NI b2b_tender_lots.status.
  const label = `${parsed.data.reason}${parsed.data.details ? ` — ${parsed.data.details.slice(0, 500)}` : ''}`
  const { error: updateError } = await supabase
    .from('b2b_requests')
    .update({
      reported_count: (req.reported_count ?? 0) + 1,
      reported_at: new Date().toISOString(),
      report_reasons: [...(req.report_reasons ?? []), label].slice(-20),
    })
    .eq('id', req.id)
  if (updateError) throw createError({ statusCode: 500, statusMessage: 'Erreur lors du signalement.' })

  // Le compteur de signalements reste côté admin — ne pas l'exposer à l'artisan.
  return { status: 'SUCCESS' }
})
