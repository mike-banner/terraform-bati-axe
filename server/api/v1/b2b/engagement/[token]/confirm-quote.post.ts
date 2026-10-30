import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { computeCommission, parseAmountToCents, formatEurCents } from '../../../../../utils/commission'
import { getClientMeta, findRequestByToken } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { notifyAdmin, adminDetailsTable } from '../../../../../utils/notifyAdmin'

const bodySchema = z.object({ engagement_id: z.string().uuid(), amount: z.string().trim().min(1).max(16) })

// Phase 05.21 — le partenaire confirme le montant du devis via son lien à jeton.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const meta = getClientMeta(event)
  if (isRateLimited('b2b-token:' + (meta.ip ?? 'unknown'), { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  const { engagement_id, amount } = parsed.data

  const { data: eng } = await supabase
    .from('b2b_engagements')
    .select('id, status, declared_amount_cents')
    .eq('id', engagement_id).eq('request_id', req.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })
  if (eng.status !== 'quote_declared') throw createError({ statusCode: 409, statusMessage: 'Aucun montant en attente de confirmation.' })

  const cents = parseAmountToCents(amount)
  if (cents === null) throw createError({ statusCode: 422, statusMessage: 'Montant HT invalide (ex. 250000 ou 250 000,50).' })
  const commission = computeCommission(cents)

  const { data: updated, error } = await supabase
    .from('b2b_engagements')
    .update({ status: 'quote_confirmed', confirmed_amount_cents: cents, confirmed_at: new Date().toISOString(), confirmed_ip: meta.ip, commission_cents: commission })
    .eq('id', engagement_id).eq('status', 'quote_declared')
    .select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur enregistrement de la confirmation.' })
  if (!updated?.length) throw createError({ statusCode: 409, statusMessage: 'Aucun montant en attente de confirmation.' })

  const matches = cents === Number(eng.declared_amount_cents)
  const requestRef = String(req.id).slice(0, 8).toUpperCase()
  await notifyAdmin({
    subject: matches ? 'Devis confirmé par le partenaire' : 'ÉCART de montant sur un devis',
    title: matches ? 'Devis confirmé par le partenaire' : 'Écart de montant sur un devis',
    bodyHtml: adminDetailsTable([
      ['Dossier', requestRef], ['Déclaré', formatEurCents(Number(eng.declared_amount_cents))],
      ['Confirmé', formatEurCents(cents)], ['Commission HT', formatEurCents(commission)],
    ]),
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: null, action: 'b2b_quote_confirmed', target_table: 'b2b_engagements', target_id: engagement_id,
      metadata: { confirmed_amount_cents: cents, matches_declared: matches },
    })
  } catch (err) {
    console.error('[05.21] Échec audit confirmation devis:', err)
  }

  return { status: 'quote_confirmed', confirmed_amount_cents: cents, matches_declared: matches }
})
