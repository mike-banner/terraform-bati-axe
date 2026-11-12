import { serverSupabaseServiceRole } from '#supabase/server'
import { renderContract, CONTRACT_VERSIONS } from '../../../../utils/contracts'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../utils/signature'
import { isRateLimited } from '../../../../utils/rateLimit'
import { CATEGORY_LABELS } from '../../../../utils/categoryLabels'

// Phase 05.21 / 05.23 — espace de suivi partenaire (sans compte) : seule la possession du jeton authentifie.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-token:' + ip, { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const token = getRouterParam(event, 'token') ?? ''
  const req = await findRequestByToken(supabase, token)
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const requestRef = String(req.id).slice(0, 8).toUpperCase()
  const framework = await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email })

  let html: string | null
  if (framework) {
    const { data: eng } = await supabase.from('b2b_engagements').select('content_html').eq('id', framework.id).single()
    html = eng?.content_html ?? null
  } else {
    html = renderContract('framework_partner', {
      contactName: req.contact_name, contactCompany: req.contact_company, email: req.contact_email, requestRef,
    })
  }

  const { data: lotRows } = await supabase
    .from('b2b_tender_lots')
    .select('id, category, status, closed_reason')
    .eq('request_id', req.id)
    .order('created_at')

  // Colonnes explicites : ni e-mail ni nom du contact artisan ne sortent jamais (T-05.23-08).
  const { data: engRows } = await supabase
    .from('b2b_engagements')
    .select('id, lot_id, pro_id, status, signed_at, selected_at, not_awarded_reason, professionals(company_name, categories, professional_type, rge_status, decennal_status, is_verified, canonical_slug, postal_code, zone, phone)')
    .eq('type', 'lot_amendment')
    .eq('request_id', req.id)
    .order('signed_at')

  // Pas de file_key ni de motif de contestation : réservés à l'admin.
  const { data: subRows } = await supabase
    .from('b2b_quote_submissions')
    .select('id, engagement_id, amount_ht_cents, deposit_due_on, status, created_at')
    .eq('request_id', req.id)
    .order('created_at')

  const engs: any[] = engRows ?? []
  const subs: any[] = subRows ?? []

  const lots = (lotRows ?? []).map((l: any) => {
    const lotEngs = engs.filter(e => e.lot_id === l.id)
    const selected = lotEngs.find(e => e.selected_at)
    const lotSubs = subs.filter(s => lotEngs.some(e => e.id === s.engagement_id))
    let outcome: 'pending' | 'selected' | 'outside_platform' | 'expired' = 'pending'
    if (selected) outcome = 'selected'
    else if (lotEngs.some(e => e.not_awarded_reason === 'outside_platform')) outcome = 'outside_platform'
    else if (lotEngs.some(e => e.not_awarded_reason === 'expired')) outcome = 'expired'
    const hasOpen = lotSubs.some(s => s.status === 'pending' || s.status === 'contested')
    return {
      lot_id: l.id,
      lot_label: CATEGORY_LABELS[l.category] ?? l.category,
      lot_status: l.status,
      selected_engagement_id: selected?.id ?? null,
      outcome,
      candidates: lotEngs.map((e) => {
        const p = e.professionals ?? {}
        return {
          engagement_id: e.id,
          status: e.status,
          signed_at: e.signed_at,
          not_awarded_reason: e.not_awarded_reason ?? null,
          pro: {
            company_name: p.company_name ?? null,
            categories: (p.categories ?? []).map((c: string) => CATEGORY_LABELS[c] ?? c),
            professional_type: p.professional_type ?? null,
            is_verified: Boolean(p.is_verified),
            decennale_valid: p.decennal_status === 'valid',
            rge_valid: p.rge_status === 'valid',
            zone: p.zone ?? null,
            profile_url: p.postal_code && p.canonical_slug ? `/pro/${String(p.postal_code).slice(0, 2)}/${p.canonical_slug}` : null,
            // D-08 : téléphone révélé au partenaire après signature de l'avenant (consentement du pro) — filtrage serveur.
            phone: e.signed_at ? (p.phone ?? null) : null,
          },
        }
      }),
      submissions: lotSubs.map(s => ({
        id: s.id,
        engagement_id: s.engagement_id,
        amount_ht_cents: s.amount_ht_cents,
        deposit_due_on: s.deposit_due_on,
        status: s.status,
        created_at: s.created_at,
        file_url: `/api/v1/b2b/engagement/${token}/quotes/${s.id}/file`,
      })),
      can_submit_quote: Boolean(selected && ['selected', 'quote_confirmed'].includes(selected.status)) && !hasOpen,
    }
  })

  return {
    request_ref: requestRef,
    contact_name: req.contact_name,
    on_behalf_of: req.on_behalf_of ?? null,
    framework: {
      signed: Boolean(framework),
      signed_at: framework?.signed_at ?? null,
      version: CONTRACT_VERSIONS.framework_partner,
      html,
    },
    lots,
  }
})
