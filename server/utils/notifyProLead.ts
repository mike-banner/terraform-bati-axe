import { useRuntimeConfig } from '#imports'
import { sendEmail } from './email'
import { renderEmail } from './emailLayout'

import { COMPATIBILITY_MATRIX, PROFESSIONAL_CATEGORIES, proMatchesProject, effectiveProType } from '../../app/utils/workTypeMatrix'

type ProjectLike = { selected_items?: string[] | null; category?: string | null }

/** Catégories de pros pouvant recouper le projet (valeurs issues de la matrice, jamais du client). */
export function candidateCategories(project: ProjectLike): string[] {
  const items = project.selected_items ?? []
  if (items.length === 0) return project.category ? [project.category] : []
  return [...new Set(items.flatMap(i => {
    const r = COMPATIBILITY_MATRIX[i]
    return r ? [...r.specialistMatches, ...(r.egbMatches ?? [])] : []
  }))]
}

/** Même règle que GET /api/v1/leads (/espace/leads). */
export function filterMatchedPros<T extends { professional_type?: string | null; egb_status?: string | null; categories?: string[] | null; rge_status?: string | null; decennal_status?: string | null }>(pros: T[], project: ProjectLike): T[] {
  return pros.filter(p => proMatchesProject(effectiveProType(p), project))
}

export function projectLabel(project: ProjectLike): string {
  const labels = (project.selected_items ?? []).map(i => COMPATIBILITY_MATRIX[i]?.label).filter(Boolean) as string[]
  if (labels.length > 0) return labels.slice(0, 3).join(', ') + (labels.length > 3 ? ' …' : '')
  return (project.category && PROFESSIONAL_CATEGORIES[project.category]) || project.category || 'Travaux'
}

/**
 * P4 — Notifie par email les pros vérifiés dont les catégories matchent le
 * nouveau projet. La notification ne débloque RIEN : les coordonnées restent
 * masquées pour un pro non premium (le lien ouvre la page lead, qui applique
 * la règle free-grant / 48h / Premium).
 *
 * Idempotence : table lead_notifications (UNIQUE pro_id, project_id, channel)
 * → pas de double envoi même si le POST est rejoué.
 *
 * Jamais bloquant : toute erreur est loggée et avalée, le POST /projects
 * répond toujours 201.
 */
export async function notifyMatchedPros(supabase: any, project: any): Promise<void> {
  try {
    const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://bati-axe.pages.dev'
    const cats = candidateCategories(project)
    if (cats.length === 0) return
    const label = projectLabel(project)

    // Pros vérifiés, opt-in email actif ; pré-filtre SQL par recouvrement de catégories
    const { data: pros, error: prosError } = await supabase
      .from('professionals')
      .select('id, email, company_name, full_name, categories, professional_type, egb_status, rge_status, decennal_status')
      .overlaps('categories', cats)
      .eq('is_verified', true)
      .eq('lead_alerts_email', true)

    if (prosError) {
      console.error('[P4] Erreur fetch pros:', prosError.message)
      return
    }
    const matched: any[] = filterMatchedPros((pros ?? []) as any[], project)
    if (matched.length === 0) return

    // Idempotence : on exclut les pros déjà notifiés pour ce projet
    const { data: already } = await supabase
      .from('lead_notifications')
      .select('pro_id')
      .eq('project_id', project.id)
    const notifiedSet = new Set((already ?? []).map((n: any) => n.pro_id))
    const targets = matched.filter((p: any) => !notifiedSet.has(p.id))

    if (targets.length === 0) return

    const detailsHtml = `
      <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
        <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Budget estimé</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.budget_range || '—'}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Délai souhaité</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.timeline_range || 'Flexible'}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Localisation</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.postal_code || '—'}</td></tr>
      </table>`

    const html = renderEmail({
      title: `Nouveau lead : ${label}`,
      preheader: `Un projet ${label} correspond à vos métiers.`,
      intro: 'Un projet correspond à vos métiers.',
      bodyHtml: detailsHtml,
      cta: { label: 'Voir le lead', href: `${siteUrl}/espace/leads/${project.id}?src=email` },
      footerNote: 'Les coordonnées du client sont débloquées immédiatement si vous êtes Premium. Vous pouvez désactiver ces alertes depuis votre espace.',
    })

    // Envoi séquentiel + trace d'idempotence après chaque succès.
    // Jamais bloquant : une panne email ne doit pas casser la création du projet.
    for (const pro of targets) {
      try {
        const res = await sendEmail({
          to: pro.email,
          sender: 'notifications',
          subject: `Nouveau lead : ${label} — BÂTI-AXE`,
          html,
        })
        if (res.success) {
          await supabase
            .from('lead_notifications')
            .insert({ pro_id: pro.id, project_id: project.id, channel: 'email' })
            .maybeSingle()
        }
      } catch (err) {
        console.error(`[P4] Échec envoi email à ${pro.email}:`, err)
      }
    }
  } catch (err) {
    // Filet de sécurité : la notification ne doit jamais faire échouer le POST
    console.error('[P4] notifyMatchedPros erreur globale:', err)
  }
}
