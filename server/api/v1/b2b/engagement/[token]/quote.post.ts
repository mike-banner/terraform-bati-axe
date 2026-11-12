import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { QUOTE_KEY_REGEX, signB2bObjectUrl } from '../../../../../utils/r2B2b'
import { parseAmountToCents, formatEurCents } from '../../../../../utils/commission'
import { computeQuoteBase, readB2bFlowConfig } from '../../../../../utils/b2bCommissionPlan'
import { sendEmail } from '../../../../../utils/email'
import { renderEmail } from '../../../../../utils/emailLayout'
import { notifyAdmin, adminDetailsTable } from '../../../../../utils/notifyAdmin'
import { escapeHtml } from '../../../../../utils/contracts'
import { AMOUNT_INPUT_MAXLENGTH } from '../../../../../../app/utils/commissionTiers'
import { QUOTE_ATTESTATION_TEXT, QUOTE_MAX_FILE_BYTES, installmentCount } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.object({
  engagement_id: z.string().uuid(),
  file_key: z.string().max(120).regex(QUOTE_KEY_REGEX),
  file_size: z.number().int().positive().max(QUOTE_MAX_FILE_BYTES),
  amount: z.string().trim().min(1).max(AMOUNT_INPUT_MAXLENGTH),
  // D-06 bis : une date prévue par versement de la commission (input type="date" côté client).
  planned_due_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(2).max(3),
  attestation: z.literal(true),
})

const OPEN = 'Un devis est déjà en attente de confirmation.'
const DAY = 86_400_000

function parseDay(s: string): number | null {
  const t = Date.parse(s + 'T00:00:00Z')
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s ? null : t
}

// Phase 05.23 — dépôt du devis signé par le partenaire (montant HT, dates prévues, attestation horodatée).
// Aucune commission n'est calculée ici : elle l'est à la confirmation par l'artisan.
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
  const body = parsed.data

  if (!body.file_key.startsWith('b2b-quotes/' + body.engagement_id + '/')) {
    throw createError({ statusCode: 400, statusMessage: 'Fichier invalide.' })
  }
  const cents = parseAmountToCents(body.amount)
  if (cents == null) throw createError({ statusCode: 422, statusMessage: 'Montant HT invalide (ex. 250000 ou 250 000,50).' })

  const { data: eng } = await supabase
    .from('b2b_engagements').select('id, status, pro_id')
    .eq('id', body.engagement_id).eq('request_id', req.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })
  if (!['selected', 'quote_confirmed'].includes(eng.status)) {
    throw createError({ statusCode: 409, statusMessage: 'Aucun artisan retenu sur ce lot.' })
  }

  // D-06 bis / D-17 : le nombre de versements dépend de l'assiette cumulée des devis confirmés.
  const { data: confirmed } = await supabase
    .from('b2b_quote_submissions').select('amount_ht_cents')
    .eq('engagement_id', body.engagement_id).eq('status', 'confirmed')
  const previousBase = ((confirmed ?? []) as Array<{ amount_ht_cents: number }>).reduce((a, r) => a + Number(r.amount_ht_cents), 0)
  const { quoteBaseCapCents } = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const expected = installmentCount(computeQuoteBase([previousBase, cents], quoteBaseCapCents))
  if (body.planned_due_dates.length !== expected) {
    throw createError({ statusCode: 422, statusMessage: 'Indiquez une date prévue par versement.' })
  }
  const days = body.planned_due_dates.map(parseDay)
  const now = Date.now()
  const valid = days.every((d, i) => d != null && d >= now - 365 * DAY && d <= now + 1095 * DAY && (i === 0 || d > (days[i - 1] as number)))
  if (!valid) throw createError({ statusCode: 422, statusMessage: 'Dates prévues invalides.' })

  // T-05.23-17 : le fichier doit réellement être sur R2 avant l'enregistrement.
  const head = await fetch(await signB2bObjectUrl(event, body.file_key, 'HEAD', 60), { method: 'HEAD' })
  if (!head.ok) throw createError({ statusCode: 422, statusMessage: 'Fichier du devis introuvable : recommencez le dépôt.' })
  // Le type et la taille sont déjà verrouillés dans l'URL d'envoi ; on recontrôle l'objet réellement stocké.
  const storedType = String(head.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
  const storedSize = Number(head.headers.get('content-length'))
  if (storedType !== 'application/pdf') {
    throw createError({ statusCode: 422, statusMessage: 'Seuls les PDF sont acceptés.' })
  }
  if (!Number.isFinite(storedSize) || storedSize <= 0 || storedSize > QUOTE_MAX_FILE_BYTES) {
    throw createError({ statusCode: 422, statusMessage: 'Fichier trop volumineux (20 Mo maximum).' })
  }
  if (storedSize !== body.file_size) {
    throw createError({ statusCode: 422, statusMessage: 'Fichier du devis incohérent : recommencez le dépôt.' })
  }

  const { data: inserted, error } = await supabase
    .from('b2b_quote_submissions')
    .insert({
      engagement_id: body.engagement_id,
      request_id: req.id,
      amount_ht_cents: cents,
      deposit_due_on: body.planned_due_dates[0],
      planned_due_dates: body.planned_due_dates,
      file_key: body.file_key,
      file_size: body.file_size,
      attestation_text: QUOTE_ATTESTATION_TEXT,
      submitted_ip: meta.ip,
      submitted_user_agent: meta.userAgent,
      status: 'pending',
    })
    .select('id, attested_at')
    .single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: OPEN })
  if (error || !inserted) throw createError({ statusCode: 500, statusMessage: 'Enregistrement du devis impossible.' })

  // Avenant de travaux (D-17) : l'engagement est déjà confirmé, son statut ne bouge pas.
  const revision = eng.status === 'quote_confirmed'
  if (!revision) {
    const { data: moved } = await supabase
      .from('b2b_engagements').update({ status: 'quote_submitted' })
      .eq('id', body.engagement_id).eq('status', 'selected').select('id')
    if (!moved || moved.length === 0) console.error('[05.23] Engagement non passé en quote_submitted:', body.engagement_id)
  }

  const ref = String(req.id).slice(0, 8).toUpperCase()
  const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
  try {
    const { data: pro } = await supabase.from('professionals').select('email, company_name').eq('id', eng.pro_id).maybeSingle()
    if (pro?.email) {
      await sendEmail({
        to: pro.email,
        sender: 'notifications',
        subject: 'Devis déposé : confirmez le montant',
        html: renderEmail({
          title: 'Devis déposé : confirmez le montant',
          intro: `Le partenaire du dossier réf. ${escapeHtml(ref)} a déposé le devis signé (${escapeHtml(formatEurCents(cents))} HT). Vérifiez-le et confirmez le montant en un clic, ou contestez-le.`,
          cta: { label: 'Confirmer le montant', href: `${siteUrl}/espace/leads?tab=ao` },
        }),
      })
    }
  } catch (err) {
    console.error('[05.23] Échec e-mail devis déposé:', err)
  }

  await notifyAdmin({
    subject: revision ? 'Nouveau devis (avenant de travaux) déposé' : 'Devis déposé par le partenaire',
    title: revision ? 'Nouveau devis (avenant de travaux) déposé' : 'Devis déposé par le partenaire',
    bodyHtml: adminDetailsTable([
      ['Dossier', escapeHtml(ref)],
      ['Montant HT', escapeHtml(formatEurCents(cents))],
      ['Versements prévus', escapeHtml(body.planned_due_dates.join(' / '))],
    ]),
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: null,
      action: 'b2b_quote_submitted',
      target_table: 'b2b_quote_submissions',
      target_id: inserted.id,
      metadata: { engagement_id: body.engagement_id, amount_ht_cents: cents, revision, attested_at: inserted.attested_at, on_behalf_of: req.on_behalf_of ?? null },
    })
  } catch (err) {
    console.error('[05.23] Échec audit dépôt de devis:', err)
  }

  return { status: 'SUBMITTED', submission_id: inserted.id, revision }
})
