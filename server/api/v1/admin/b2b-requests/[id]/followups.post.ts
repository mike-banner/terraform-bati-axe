import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { requireAdminOperator } from '../../../../../utils/adminOperator'

const bodySchema = z.object({
  party: z.enum(['demandeur', 'partenaire', 'artisan']),
  outcome: z.enum(['joint', 'injoignable', 'rappel_prevu', 'debloque']),
  lot_id: z.string().uuid().nullish(),
  pro_id: z.string().uuid().nullish(),
  note: z.string().trim().max(1000).nullish(),
  next_followup_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  operator: z.string().trim().max(60),
}).refine(d => d.party !== 'artisan' || !!d.pro_id, { path: ['pro_id'], message: 'Artisan à préciser.' })

// D-25 — note d'appel de l'admin : journal en ajout seul, tracé dans audit_logs.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const id = idParsed.data

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  const body = parsed.data

  // D-29 : opérateur vérifié avant toute lecture ou écriture.
  const operator = requireAdminOperator(useRuntimeConfig(event) as any, body.operator)

  if (body.outcome === 'rappel_prevu' && !body.next_followup_on) {
    throw createError({ statusCode: 422, statusMessage: 'Indiquez la date de rappel.' })
  }
  if (body.next_followup_on) {
    const day = Date.parse(`${body.next_followup_on}T00:00:00Z`)
    const todayStr = new Date().toISOString().slice(0, 10)
    const today = Date.parse(`${todayStr}T00:00:00Z`)
    if (Number.isNaN(day) || body.next_followup_on <= todayStr || day > today + 365 * 86_400_000) {
      throw createError({ statusCode: 422, statusMessage: 'Date de relance invalide.' })
    }
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: req } = await supabase.from('b2b_requests').select('id').eq('id', id).maybeSingle()
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  if (body.lot_id) {
    const { data: lot } = await supabase.from('b2b_tender_lots').select('id').eq('id', body.lot_id).eq('request_id', id).maybeSingle()
    if (!lot) throw createError({ statusCode: 404, statusMessage: 'Lot introuvable pour ce dossier.' })
  }
  if (body.pro_id) {
    const { data: eng } = await supabase.from('b2b_engagements').select('id')
      .eq('request_id', id).eq('type', 'lot_amendment').eq('pro_id', body.pro_id).limit(1).maybeSingle()
    if (!eng) throw createError({ statusCode: 404, statusMessage: 'Artisan introuvable pour ce dossier.' })
  }

  const { data: row, error } = await supabase
    .from('b2b_admin_followups')
    .insert({
      request_id: id,
      lot_id: body.lot_id ?? null,
      pro_id: body.pro_id ?? null,
      party: body.party,
      outcome: body.outcome,
      note: body.note || null,
      next_followup_on: body.next_followup_on ?? null,
      actor_id: (user as any).id,
      operator,
    })
    .select('id, called_at')
    .single()
  if (error || !row) throw createError({ statusCode: 500, statusMessage: 'Enregistrement impossible.' })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id,
      action: 'b2b_admin_followup',
      target_table: 'b2b_requests',
      target_id: id,
      metadata: { followup_id: row.id, party: body.party, outcome: body.outcome, next_followup_on: body.next_followup_on ?? null, operator },
    })
  } catch (err) {
    console.error('[05.23] Échec audit suivi admin:', err)
  }

  return { status: 'SAVED', followup_id: row.id }
})
