import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { notifyAdmin, adminDetailsTable } from '../../../../../utils/notifyAdmin'
import { escapeHtml } from '../../../../../utils/contracts'
import { installmentCount, installmentLabels } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.object({ engagement_id: z.string().uuid(), seq: z.number().int().min(1).max(3) })

// Phase 05.23 (D-06 bis) — « Valider l'avancement » : le partenaire atteste qu'une étape est atteinte.
// L'artisan ne déclenche rien. Aucun montant n'est renvoyé (D-22).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const meta = getClientMeta(event)
  if (isRateLimited('b2b-token:' + (meta.ip ?? 'unknown'), { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const framework = await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email })
  if (!framework) {
    throw createError({ statusCode: 409, statusMessage: 'Signez d\'abord votre convention de partenariat.', data: { code: 'FRAMEWORK_REQUIRED' } })
  }

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  const { engagement_id, seq } = parsed.data

  const { data: eng } = await supabase
    .from('b2b_engagements').select('id, status, confirmed_amount_cents')
    .eq('id', engagement_id).eq('request_id', req.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })
  if (eng.status !== 'quote_confirmed') throw createError({ statusCode: 409, statusMessage: 'Le devis n\'est pas encore confirmé.' })

  // Le montant sert uniquement à compter les étapes ; il n'est jamais renvoyé.
  const base = Number(eng.confirmed_amount_cents ?? 0)
  if (seq > installmentCount(base)) throw createError({ statusCode: 400, statusMessage: 'Étape inexistante.' })

  if (seq > 1) {
    const { data: prev } = await supabase
      .from('b2b_installment_validations').select('seq')
      .eq('engagement_id', engagement_id).eq('seq', seq - 1).maybeSingle()
    if (!prev) throw createError({ statusCode: 409, statusMessage: 'Validez d\'abord l\'étape précédente.' })
  }

  const { data: row, error } = await supabase
    .from('b2b_installment_validations')
    .insert({ engagement_id, seq, validated_ip: meta.ip, validated_user_agent: meta.userAgent })
    .select('validated_at')
    .single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Étape déjà validée.' })
  if (error || !row) throw createError({ statusCode: 500, statusMessage: 'Validation impossible pour le moment.' })

  const label = installmentLabels(base, 'admin')[seq - 1] ?? `Étape ${seq}`
  const ref = String(req.id).slice(0, 8).toUpperCase()
  await notifyAdmin({
    subject: 'Avancement validé par le partenaire : versement à facturer',
    title: `Avancement validé : versement ${seq} à facturer`,
    bodyHtml: adminDetailsTable([
      ['Dossier', escapeHtml(ref)],
      ['Étape', escapeHtml(label)],
      ['Validée le', escapeHtml(new Date(row.validated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))],
    ]),
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: null, action: 'b2b_installment_validated', target_table: 'b2b_engagements', target_id: engagement_id,
      metadata: { seq },
    })
  } catch (err) {
    console.error('[05.23] Échec audit validation d\'étape:', err)
  }

  return { status: 'VALIDATED', seq, validated_at: row.validated_at }
})
