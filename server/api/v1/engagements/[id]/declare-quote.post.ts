import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { computeCommission, parseAmountToCents, formatEurCents } from '../../../../utils/commission'
import { issuePartnerToken, renderPartnerLinkEmail } from '../../../../utils/signature'
import { notifyAdmin, adminDetailsTable } from '../../../../utils/notifyAdmin'
import { sendEmail } from '../../../../utils/email'

export const MAX_DECLARATIONS = 3
const EDITABLE = ['signed', 'quote_declared', 'not_awarded']
const NOTIFY_INTERVAL_MS = 24 * 3_600_000

/** Pure : au plus 1 email partenaire par avenant et par 24 h. */
export function canNotifyPartner(lastNotifiedAt: string | null, now: Date): boolean {
  return !lastNotifiedAt || now.getTime() - new Date(lastNotifiedAt).getTime() >= NOTIFY_INTERVAL_MS
}

const idSchema = z.string().uuid('Identifiant invalide.')
// max(16) = AMOUNT_INPUT_MAXLENGTH côté UI.
const bodySchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('quote'), amount: z.string().trim().min(1).max(16) }),
  z.object({ outcome: z.literal('not_awarded') }),
])

// Phase 05.21 — le pro déclare le devis signé (HT) ou « chantier non obtenu » (D-06).
// La commission est TOUJOURS calculée serveur (D-01) : le body ne porte que le montant.
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  const id = parsedId.data
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  const body = parsed.data

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: eng } = await supabase
    .from('b2b_engagements')
    .select('id, status, request_id, lot_id, pro_id, declared_amount_cents, declare_count, partner_notified_at')
    .eq('id', id).eq('pro_id', user.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })

  if (!EDITABLE.includes(eng.status)) throw createError({ statusCode: 409, statusMessage: 'Le montant a déjà été confirmé par le partenaire.' })
  if (eng.declare_count >= MAX_DECLARATIONS) throw createError({ statusCode: 429, statusMessage: 'Nombre maximal de déclarations atteint pour cet avenant. Contactez BÂTI-AXE.' })

  const now = new Date()
  let cents: number | null = null
  let commission: number | null = null
  let patch: Record<string, any>
  if (body.outcome === 'quote') {
    cents = parseAmountToCents(body.amount)
    if (cents === null) throw createError({ statusCode: 422, statusMessage: 'Montant HT invalide (ex. 250000 ou 250 000,50).' })
    commission = computeCommission(cents)
    patch = { status: 'quote_declared', declared_amount_cents: cents, declared_at: now.toISOString(), commission_cents: commission, declare_count: eng.declare_count + 1 }
  } else {
    patch = { status: 'not_awarded', declared_at: now.toISOString(), declare_count: eng.declare_count + 1 }
  }

  const { data: updated, error: upErr } = await supabase
    .from('b2b_engagements').update(patch)
    .eq('id', id).in('status', EDITABLE).eq('declare_count', eng.declare_count)
    .select('id')
  if (upErr) throw createError({ statusCode: 500, statusMessage: 'Erreur enregistrement de la déclaration.' })
  if (!updated?.length) throw createError({ statusCode: 409, statusMessage: 'L\'avenant a été modifié entre-temps. Rechargez la page.' })

  const { data: pro } = await supabase.from('professionals').select('company_name, full_name').eq('id', user.id).maybeSingle()
  const proCompany = pro?.company_name || pro?.full_name || 'Une entreprise'
  const { data: req } = await supabase.from('b2b_requests').select('id, contact_name, contact_email').eq('id', eng.request_id).maybeSingle()
  const requestRef = String(eng.request_id).slice(0, 8).toUpperCase()

  // D-06 : « non obtenu » alerte l'admin inconditionnellement et n'est jamais soumis à la limite 24 h.
  if (body.outcome === 'not_awarded') {
    await notifyAdmin({
      subject: 'Chantier déclaré non obtenu',
      title: 'Chantier déclaré non obtenu',
      bodyHtml: adminDetailsTable([['Dossier', requestRef], ['Entreprise', proCompany]]),
    })
  }

  // Email partenaire non bloquant.
  try {
    if (req?.contact_email) {
      let send = true
      if (body.outcome === 'quote') {
        if (!canNotifyPartner(eng.partner_notified_at, now)) send = false
        else {
          // Réservation en base AVANT l'envoi : un envoi concurrent récent annule celui-ci.
          const { data: reserved } = await supabase
            .from('b2b_engagements').update({ partner_notified_at: now.toISOString() })
            .eq('id', id)
            .or('partner_notified_at.is.null,partner_notified_at.lt.' + new Date(now.getTime() - NOTIFY_INTERVAL_MS).toISOString())
            .select('id')
          send = Boolean(reserved?.length)
        }
      } else {
        await supabase.from('b2b_engagements').update({ partner_notified_at: now.toISOString() }).eq('id', id)
      }
      if (send) {
        const token = await issuePartnerToken(supabase, eng.request_id, { revokePrevious: false })
        const siteUrl = (useRuntimeConfig().public as any).siteUrl || 'https://bati-axe.com'
        const { subject, html } = renderPartnerLinkEmail({
          contactName: req.contact_name, requestRef, link: `${siteUrl}/b2b/engagement/${token}`,
          reason: body.outcome === 'quote' ? 'confirm_quote' : 'not_awarded',
          proCompany, amountLabel: cents !== null ? formatEurCents(cents) : undefined,
        })
        await sendEmail({ to: req.contact_email, sender: 'notifications', subject, html })
      }
    }
  } catch (err) {
    console.error('[05.21] Échec email partenaire (déclaration devis):', err)
  }

  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id, action: 'b2b_quote_declared', target_table: 'b2b_engagements', target_id: id,
      metadata: { outcome: body.outcome, declared_amount_cents: cents, commission_cents: commission },
    })
  } catch (err) {
    console.error('[05.21] Échec audit déclaration devis:', err)
  }

  return { status: patch.status, declared_amount_cents: cents, commission_cents: commission }
})
