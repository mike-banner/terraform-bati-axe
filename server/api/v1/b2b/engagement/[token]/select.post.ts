import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { sendEmail } from '../../../../../utils/email'
import { renderEmail } from '../../../../../utils/emailLayout'
import { notifyAdmin, adminDetailsTable } from '../../../../../utils/notifyAdmin'
import { escapeHtml } from '../../../../../utils/contracts'
import { CATEGORY_LABELS } from '../../../../../utils/categoryLabels'
import { PARTNER_SHARE_BPS } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('select'), lot_id: z.string().uuid(), engagement_id: z.string().uuid() }),
  z.object({ outcome: z.literal('outside_platform'), lot_id: z.string().uuid() }),
])

const ALREADY = 'Un artisan a déjà été retenu pour ce lot.'

// Phase 05.23 — choix de l'artisan par le partenaire (lien à jeton, sans compte).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-token:' + ip, { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  const body = parsed.data

  const framework = await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email })
  if (!framework) {
    throw createError({ statusCode: 409, statusMessage: 'Signez d\'abord votre convention de partenariat.', data: { code: 'FRAMEWORK_REQUIRED' } })
  }

  const { data: lot } = await supabase.from('b2b_tender_lots').select('id, category').eq('id', body.lot_id).eq('request_id', req.id).maybeSingle()
  if (!lot) throw createError({ statusCode: 404, statusMessage: 'Lot introuvable.' })

  const { data: already } = await supabase
    .from('b2b_engagements').select('id')
    .eq('type', 'lot_amendment').eq('lot_id', body.lot_id).not('selected_at', 'is', null).limit(1)
  if (Array.isArray(already) && already.length > 0) throw createError({ statusCode: 409, statusMessage: ALREADY })

  const now = new Date().toISOString()
  const engagementId = body.outcome === 'select' ? body.engagement_id : null
  let selectedProId: string | null = null

  if (body.outcome === 'select') {
    const { data: target } = await supabase
      .from('b2b_engagements').select('id')
      .eq('id', body.engagement_id).eq('lot_id', body.lot_id).eq('request_id', req.id)
      .eq('type', 'lot_amendment').eq('status', 'signed').maybeSingle()
    if (!target) throw createError({ statusCode: 404, statusMessage: 'Artisan introuvable pour ce lot.' })

    const { data: updated, error } = await supabase
      .from('b2b_engagements')
      .update({ status: 'selected', selected_at: now, partner_share_bps: PARTNER_SHARE_BPS })
      .eq('id', body.engagement_id).eq('status', 'signed')
      .select('id, pro_id')
    if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: ALREADY })
    if (error) throw createError({ statusCode: 500, statusMessage: 'Choix impossible pour le moment.' })
    if (!updated || updated.length === 0) {
      throw createError({ statusCode: 409, statusMessage: 'L\'artisan a changé de statut entre-temps. Rechargez la page.' })
    }
    selectedProId = updated[0].pro_id
  }

  const reason = body.outcome === 'select' ? 'other_selected' : 'outside_platform'
  let others = supabase
    .from('b2b_engagements')
    .update({ status: 'not_awarded', not_awarded_reason: reason })
    .eq('type', 'lot_amendment').eq('lot_id', body.lot_id).eq('status', 'signed')
  if (engagementId) others = others.neq('id', engagementId)
  const { data: notAwarded } = await others.select('id, pro_id')
  const notAwardedRows: Array<{ id: string; pro_id: string }> = notAwarded ?? []

  await supabase
    .from('b2b_tender_lots')
    .update({ status: 'closed', closed_at: now, closed_reason: 'awarded' })
    .eq('id', body.lot_id).neq('status', 'closed')

  const label = CATEGORY_LABELS[lot.category] ?? lot.category
  const ref = String(req.id).slice(0, 8).toUpperCase()
  const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
  const cta = { label: 'Ouvrir mes appels d\'offres', href: `${siteUrl}/espace/leads?tab=ao` }

  const proIds = [selectedProId, ...notAwardedRows.map(r => r.pro_id)].filter(Boolean) as string[]
  let companyOf = new Map<string, { email: string | null; company_name: string | null }>()
  try {
    const { data: pros } = await supabase.from('professionals').select('id, email, company_name').in('id', proIds)
    companyOf = new Map((pros ?? []).map((p: any) => [p.id, p]))
  } catch (err) {
    console.error('[05.23] Lecture des artisans pour e-mails impossible:', err)
  }

  const mail = async (proId: string, subject: string, title: string, intro: string) => {
    const to = companyOf.get(proId)?.email
    if (!to) return
    try {
      await sendEmail({ to, sender: 'notifications', subject, html: renderEmail({ title, intro, cta }) })
    } catch (err) {
      console.error('[05.23] Échec e-mail choix du partenaire:', err)
    }
  }

  if (selectedProId) {
    await mail(
      selectedProId,
      'Vous êtes retenu sur un chantier BÂTI-AXE',
      'Vous êtes retenu',
      `Le partenaire du dossier réf. ${ref} vous a retenu pour le lot ${escapeHtml(label)}. Le devis se fait directement avec lui : ses coordonnées sont dans votre espace. Une fois le devis signé par son client, il le déposera sur BÂTI-AXE et vous confirmerez le montant en un clic.`,
    )
  }
  const lostIntro = body.outcome === 'select'
    ? `Le partenaire a retenu une autre entreprise pour le lot ${escapeHtml(label)} du dossier réf. ${ref}.`
    : `Le partenaire a retenu une entreprise hors plateforme pour le lot ${escapeHtml(label)} du dossier réf. ${ref}.`
  for (const r of notAwardedRows) await mail(r.pro_id, 'Chantier non obtenu', 'Chantier non obtenu', lostIntro)

  const company = selectedProId ? (companyOf.get(selectedProId)?.company_name ?? 'artisan') : null
  await notifyAdmin({
    subject: 'Choix du partenaire sur un lot',
    title: 'Choix du partenaire sur un lot',
    bodyHtml: adminDetailsTable([
      ['Dossier', escapeHtml(ref)],
      ['Lot', escapeHtml(label)],
      ['Résultat', body.outcome === 'select' ? 'Artisan retenu : ' + escapeHtml(company ?? '') : 'Retenu hors plateforme'],
      ['Non retenus', String(notAwardedRows.length)],
    ]),
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: null,
      action: 'b2b_partner_selected',
      target_table: 'b2b_tender_lots',
      target_id: body.lot_id,
      metadata: { outcome: body.outcome, engagement_id: engagementId, not_awarded_count: notAwardedRows.length },
    })
  } catch (err) {
    console.error('[05.23] Échec audit choix du partenaire:', err)
  }

  return {
    status: body.outcome === 'select' ? 'SELECTED' : 'OUTSIDE_PLATFORM',
    lot_id: body.lot_id,
    selected_engagement_id: engagementId,
  }
})
