import { serverSupabaseServiceRole } from '#supabase/server'
import { renderContract, CONTRACT_VERSIONS } from '../../../../utils/contracts'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../utils/signature'
import { isRateLimited } from '../../../../utils/rateLimit'
import { CATEGORY_LABELS } from '../../../../utils/categoryLabels'

// Phase 05.21 — espace de suivi partenaire (sans compte) : seule la possession du jeton authentifie.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-token:' + ip, { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
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

  const { data: rows } = await supabase
    .from('b2b_engagements')
    .select('id, status, declared_amount_cents, declared_at, confirmed_amount_cents, confirmed_at, b2b_tender_lots(category), professionals(company_name)')
    .eq('type', 'lot_amendment')
    .eq('request_id', req.id)
    .order('signed_at')

  const amendments = (rows ?? []).map((r: any) => {
    const cat = r.b2b_tender_lots?.category
    return {
      id: r.id,
      lot_label: CATEGORY_LABELS[cat] ?? cat ?? null,
      pro_company: r.professionals?.company_name ?? null,
      status: r.status,
      declared_amount_cents: r.declared_amount_cents,
      declared_at: r.declared_at,
      confirmed_amount_cents: r.confirmed_amount_cents,
      confirmed_at: r.confirmed_at,
    }
  })

  return {
    request_ref: requestRef,
    contact_name: req.contact_name,
    framework: {
      signed: Boolean(framework),
      signed_at: framework?.signed_at ?? null,
      version: CONTRACT_VERSIONS.framework_partner,
      html,
    },
    amendments,
  }
})
