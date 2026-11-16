import { ACTIVE_TENDER_STATUSES } from './b2bDiffusion'
import { sendEmail } from './email'
import { renderEmail } from './emailLayout'

// Labels français des 6 métiers (miroir de notifyProLead.ts / app/pages/espace/leads)
const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:  'Maçonnerie & Gros Œuvre',
  toiture:     'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie:   'Plomberie & Chauffage',
  peinture:    'Peinture & Finitions',
  isolation:   'Isolation & Cloisons',
}

export interface B2bTargetPro {
  id: string
  email: string
  company_name?: string | null
  full_name?: string | null
}

/**
 * D-04 / D-10 — sélection pure des cibles : exclut les pros déjà notifiés sur
 * ce lot (idempotence) et ceux ayant atteint leur plafond quotidien de
 * notifications B2B. Exclusion silencieuse, aucun throw.
 */
export function selectB2bTargets(opts: {
  pros: B2bTargetPro[]
  alreadyNotifiedProIds: string[]
  dailyCounts: Record<string, number>
  maxPerDay: number
}): B2bTargetPro[] {
  const notified = new Set(opts.alreadyNotifiedProIds)
  return opts.pros.filter(p => !notified.has(p.id) && (opts.dailyCounts[p.id] ?? 0) < opts.maxPerDay)
}

/**
 * TEND-14 / D-13 / D-14 — rendu de l'email d'AO partenaire. Fonction pure,
 * aucune coordonnée du partenaire (nom/email/téléphone) n'est injectée : la
 * révélation des coordonnées est Phase 9.
 */
export function renderTenderEmail(opts: {
  lotCategory: string
  lotId: string
  requestRef: string
  postalCode?: string | null
  budgetRange?: string | null
  siteUrl: string
}): { subject: string; html: string } {
  const label = CATEGORY_LABELS[opts.lotCategory] ?? opts.lotCategory

  const badgeHtml = `<p style="margin:0 0 16px;"><span style="display:inline-block;background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">✓ AO qualifié BÂTI-AXE</span></p>`

  // Seul le code postal (zone) est montré avant sélection — jamais le texte libre
  // du partenaire, qui peut contenir une adresse précise (cf. décision du 2026-11-11).
  const detailsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
      <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Corps de métier</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${label}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Code postal</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.postalCode || '—'}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Budget</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.budgetRange || '—'}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Référence</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.requestRef}</td></tr>
    </table>`

  const html = renderEmail({
    title: `Nouvel appel d'offres : ${label}`,
    preheader: `Un appel d'offres ${label} qualifié par BÂTI-AXE correspond à vos catégories.`,
    intro: undefined,
    bodyHtml: badgeHtml + detailsHtml,
    cta: { label: 'Voir l\'appel d\'offres', href: `${opts.siteUrl}/espace/leads?src=email` },
    footerNote: 'Cet appel d\'offres a été qualifié manuellement par l\'équipe BÂTI-AXE avant diffusion. Vous pouvez désactiver les alertes appels d\'offres partenaires depuis votre espace.',
  })

  return {
    subject: `Nouvel appel d'offres : ${label} — BÂTI-AXE`,
    html,
  }
}

/**
 * TEND-04 / TEND-06 — orchestrateur : matche les artisans actifs sur la zone
 * du lot (pro_zones, deux requêtes séquentielles, sans embedding PostgREST
 * filtré), vérifiés, opt-in B2B, exclut déjà-notifiés + plafond quotidien, envoie
 * l'email et trace après chaque succès. Jamais bloquant (clone du pattern
 * notifyMatchedPros / notifyProLead.ts).
 */
export async function notifyMatchedB2bPros(
  supabase: any,
  request: { id: string; project_postal_code?: string | null; budget_range?: string | null },
  lot: { id: string; category: string; zone_id: string },
  opts: { siteUrl: string; maxPerDay: number },
): Promise<{ sent: number; skipped: number; failed: number }> {
  try {
    const { data: zoneRows } = await supabase
      .from('pro_zones').select('pro_id')
      .eq('zone_id', lot.zone_id).eq('status', 'active')
    const zoneProIds = (zoneRows ?? []).map((z: any) => z.pro_id)
    if (zoneProIds.length === 0) return { sent: 0, skipped: 0, failed: 0 }

    const { data: pros, error } = await supabase
      .from('professionals')
      .select('id, email, company_name, full_name')
      .in('id', zoneProIds)
      .contains('categories', [lot.category])
      .eq('is_verified', true)
      .eq('b2b_alerts_email', true)

    if (error) {
      console.error('[Phase8] Erreur fetch pros B2B:', error.message)
      return { sent: 0, skipped: 0, failed: 0 }
    }
    if (!pros || pros.length === 0) return { sent: 0, skipped: 0, failed: 0 }

    const { data: already } = await supabase
      .from('b2b_tender_notifications').select('pro_id').eq('lot_id', lot.id)

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: todayRows } = await supabase
      .from('b2b_tender_notifications').select('pro_id')
      .in('pro_id', pros.map((p: any) => p.id))
      .gte('sent_at', startOfDay.toISOString())
    const dailyCounts: Record<string, number> = {}
    for (const r of todayRows ?? []) dailyCounts[r.pro_id] = (dailyCounts[r.pro_id] ?? 0) + 1

    const targets = selectB2bTargets({
      pros,
      alreadyNotifiedProIds: (already ?? []).map((a: any) => a.pro_id),
      dailyCounts,
      maxPerDay: opts.maxPerDay,
    })

    const skipped = pros.length - targets.length
    let sent = 0
    let failed = 0

    const { subject, html } = renderTenderEmail({
      lotCategory: lot.category,
      lotId: lot.id,
      requestRef: request.id.slice(0, 8).toUpperCase(),
      postalCode: request.project_postal_code,
      budgetRange: request.budget_range,
      siteUrl: opts.siteUrl,
    })

    for (const pro of targets) {
      try {
        const res = await sendEmail({
          to: pro.email,
          sender: 'notifications',
          subject,
          html,
        })
        if (res.success) {
          await supabase
            .from('b2b_tender_notifications')
            .insert({ pro_id: pro.id, lot_id: lot.id, channel: 'email' })
            .maybeSingle()
          sent++
        } else {
          failed++
        }
      } catch (err) {
        console.error(`[Phase8] Échec envoi email B2B à ${pro.email}:`, err)
        failed++
      }
    }

    return { sent, skipped, failed }
  } catch (err) {
    console.error('[Phase8] notifyMatchedB2bPros erreur globale:', err)
    return { sent: 0, skipped: 0, failed: 0 }
  }
}

// ---------------------------------------------------------------------------
// Audience d'un lot (écran admin) et rattrapage automatique des pros qui entrent
// dans le gabarit d'un appel d'offres déjà diffusé (nouveau pro, nouveau métier,
// nouvelle zone, vérification validée).
// ---------------------------------------------------------------------------

export type AudienceState = 'notified' | 'pending' | 'capped' | 'excluded'
export type AudienceReason = 'non_verifie' | 'alertes_desactivees' | 'plafond_quotidien'

export interface AudienceRow {
  pro_id: string
  company_name: string | null
  email: string | null
  state: AudienceState
  reason?: AudienceReason
  sent_at?: string | null
}

/** Classe un pro vis-à-vis d'un lot : pure, testable. */
export function classifyAudience(opts: {
  pro: { verified: boolean, alerts: boolean }
  notifiedAt: string | null
  dailyCount: number
  maxPerDay: number
}): { state: AudienceState, reason?: AudienceReason } {
  if (opts.notifiedAt) return { state: 'notified' }
  if (!opts.pro.verified) return { state: 'excluded', reason: 'non_verifie' }
  if (!opts.pro.alerts) return { state: 'excluded', reason: 'alertes_desactivees' }
  if (opts.dailyCount >= opts.maxPerDay) return { state: 'capped', reason: 'plafond_quotidien' }
  return { state: 'pending' }
}

/**
 * Pros dont le profil correspond au gabarit du lot (zone active + catégorie), avec leur état.
 * Réservé à l'admin : expose nom et e-mail.
 */
export async function listLotAudience(
  supabase: any,
  lot: { id: string, category: string, zone_id: string },
  maxPerDay: number,
): Promise<AudienceRow[]> {
  const { data: zoneRows } = await supabase
    .from('pro_zones').select('pro_id').eq('zone_id', lot.zone_id).eq('status', 'active')
  const ids = [...new Set((zoneRows ?? []).map((z: any) => z.pro_id))] as string[]
  if (ids.length === 0) return []

  const { data: pros } = await supabase
    .from('professionals')
    .select('id, email, company_name, is_verified, b2b_alerts_email')
    .in('id', ids)
    .contains('categories', [lot.category])
  if (!pros?.length) return []

  const { data: notified } = await supabase
    .from('b2b_tender_notifications').select('pro_id, sent_at').eq('lot_id', lot.id)
  const sentAt = new Map<string, string>((notified ?? []).map((n: any) => [n.pro_id, n.sent_at]))

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data: todayRows } = await supabase
    .from('b2b_tender_notifications').select('pro_id')
    .in('pro_id', pros.map((p: any) => p.id)).gte('sent_at', startOfDay.toISOString())
  const daily: Record<string, number> = {}
  for (const r of todayRows ?? []) daily[r.pro_id] = (daily[r.pro_id] ?? 0) + 1

  return pros.map((p: any) => ({
    pro_id: p.id,
    company_name: p.company_name ?? null,
    email: p.email ?? null,
    sent_at: sentAt.get(p.id) ?? null,
    ...classifyAudience({
      pro: { verified: p.is_verified === true, alerts: p.b2b_alerts_email === true },
      notifiedAt: sentAt.get(p.id) ?? null,
      dailyCount: daily[p.id] ?? 0,
      maxPerDay,
    }),
  }))
}

/**
 * Rattrapage : envoie à un pro les appels d'offres déjà diffusés (dossier actif, lot ouvert)
 * qui correspondent à son profil actuel et dont il n'a pas encore été notifié.
 * Idempotent (b2b_tender_notifications), plafond quotidien respecté, jamais bloquant.
 */
export async function notifyProOpenTenders(
  supabase: any,
  proId: string,
  opts: { siteUrl: string, maxPerDay?: number, event?: { context?: Record<string, any> } },
): Promise<{ sent: number }> {
  try {
    const maxPerDay = opts.maxPerDay ?? 5
    const { data: pro } = await supabase
      .from('professionals')
      .select('id, email, categories, is_verified, b2b_alerts_email')
      .eq('id', proId).maybeSingle()
    if (!pro?.email || pro.is_verified !== true || pro.b2b_alerts_email !== true) return { sent: 0 }
    const categories: string[] = pro.categories ?? []
    if (categories.length === 0) return { sent: 0 }

    const { data: zoneRows } = await supabase
      .from('pro_zones').select('zone_id').eq('pro_id', proId).eq('status', 'active')
    const zoneIds = (zoneRows ?? []).map((z: any) => z.zone_id)
    if (zoneIds.length === 0) return { sent: 0 }

    // Un dossier est « diffusé » quand l'admin a cliqué Diffuser (trace d'audit).
    const { data: logs } = await supabase
      .from('audit_logs').select('target_id')
      .eq('action', 'b2b_tender_diffused').order('created_at', { ascending: false }).limit(500)
    const requestIds = [...new Set((logs ?? []).map((l: any) => l.target_id).filter(Boolean))] as string[]
    if (requestIds.length === 0) return { sent: 0 }

    const { data: requests } = await supabase
      .from('b2b_requests').select('id, project_postal_code, budget_range')
      .in('id', requestIds).in('status', [...ACTIVE_TENDER_STATUSES])
    if (!requests?.length) return { sent: 0 }
    const byId = new Map<string, any>(requests.map((r: any) => [r.id, r]))

    const { data: lots } = await supabase
      .from('b2b_tender_lots').select('id, request_id, category, zone_id')
      .in('request_id', [...byId.keys()]).eq('status', 'open')
      .in('zone_id', zoneIds).in('category', categories)
    if (!lots?.length) return { sent: 0 }

    const { data: already } = await supabase
      .from('b2b_tender_notifications').select('lot_id').eq('pro_id', proId).in('lot_id', lots.map((l: any) => l.id))
    const done = new Set((already ?? []).map((a: any) => a.lot_id))

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('b2b_tender_notifications').select('id', { count: 'exact', head: true })
      .eq('pro_id', proId).gte('sent_at', startOfDay.toISOString())
    let room = maxPerDay - (count ?? 0)

    let sent = 0
    for (const lot of lots) {
      if (room <= 0) break
      if (done.has(lot.id)) continue
      const req = byId.get(lot.request_id)
      const { subject, html } = renderTenderEmail({
        lotCategory: lot.category, lotId: lot.id, requestRef: String(req.id).slice(0, 8).toUpperCase(),
        postalCode: req.project_postal_code, budgetRange: req.budget_range, siteUrl: opts.siteUrl,
      })
      const res = await sendEmail({ to: pro.email, sender: 'notifications', subject, html, event: opts.event })
      if (!res?.success) continue
      await supabase.from('b2b_tender_notifications').insert({ pro_id: proId, lot_id: lot.id, channel: 'email' }).maybeSingle()
      sent++
      room--
    }
    return { sent }
  } catch (err) {
    console.error('[notifyProOpenTenders] erreur:', err)
    return { sent: 0 }
  }
}
