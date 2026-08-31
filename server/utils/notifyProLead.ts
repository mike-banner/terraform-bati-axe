import { useRuntimeConfig } from '#imports'
import { sendEmail } from './email'
import { renderEmail } from './emailLayout'

// Labels français des 6 métiers (miroir de app/pages/espace/leads)
const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:  'Maçonnerie & Gros Œuvre',
  toiture:     'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie:   'Plomberie & Chauffage',
  peinture:    'Peinture & Finitions',
  isolation:   'Isolation & Cloisons',
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
export async function notifyMatchedPros(supabase: any, project: any, category: string): Promise<void> {
  try {
    const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://bati-axe.pages.dev'
    const label = CATEGORY_LABELS[category] ?? category

    // Pros vérifiés, opt-in email actif, dont les catégories contiennent celle du projet
    const { data: pros, error: prosError } = await supabase
      .from('professionals')
      .select('id, email, company_name, full_name')
      .contains('categories', [category])
      .eq('is_verified', true)
      .eq('lead_alerts_email', true)

    if (prosError) {
      console.error('[P4] Erreur fetch pros:', prosError.message)
      return
    }
    if (!pros || pros.length === 0) return

    // Idempotence : on exclut les pros déjà notifiés pour ce projet
    const { data: already } = await supabase
      .from('lead_notifications')
      .select('pro_id')
      .eq('project_id', project.id)
    const notifiedSet = new Set((already ?? []).map((n: any) => n.pro_id))
    const targets = pros.filter((p: any) => !notifiedSet.has(p.id))

    if (targets.length === 0) return

    const detailsHtml = `
      <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
        <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Budget estimé</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.budget_range || '—'}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Délai souhaité</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.timeline_range || 'Flexible'}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Localisation</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${project.postal_code || '—'}</td></tr>
      </table>`

    const html = renderEmail({
      title: `Nouveau lead : ${label}`,
      preheader: `Un projet ${label} correspond à vos catégories d'intervention.`,
      intro: "Un projet correspond à vos catégories d'intervention.",
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
