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
  projectLocation?: string | null
  postalCode?: string | null
  budgetRange?: string | null
  siteUrl: string
}): { subject: string; html: string } {
  const label = CATEGORY_LABELS[opts.lotCategory] ?? opts.lotCategory

  const badgeHtml = `<p style="margin:0 0 16px;"><span style="display:inline-block;background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">✓ AO qualifié BÂTI-AXE</span></p>`

  const detailsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
      <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Corps de métier</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${label}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Localisation</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.projectLocation || opts.postalCode || '—'}</td></tr>
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
  request: { id: string; project_location?: string | null; project_postal_code?: string | null; budget_range?: string | null },
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
      projectLocation: request.project_location,
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
