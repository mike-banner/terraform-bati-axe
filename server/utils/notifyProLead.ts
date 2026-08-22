import { useRuntimeConfig } from '#imports'
import { sendEmail } from './email'

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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
        <h2 style="color: #1e293b; margin: 0 0 8px;">Nouveau lead : ${label}</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">Un projet correspond à vos catégories d'intervention.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Budget estimé</td>
            <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">${project.budget_range || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Délai souhaité</td>
            <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">${project.timeline_range || 'Flexible'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Localisation</td>
            <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">${project.postal_code || '—'}</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 13px; margin: 0 0 20px;">
          Les coordonnées du client sont débloquées immédiatement si vous êtes Premium,
          ou automatiquement après <strong>48 h</strong>. Connectez-vous pour voir le lead.
        </p>
        <a href="${siteUrl}/espace/leads/${project.id}?src=email"
           style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Voir le lead
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">BÂTI-AXE — Des chantiers qualifiés, sans démarchage.</p>
      </div>
    `

    // Envoi séquentiel + trace d'idempotence après chaque succès.
    // Jamais bloquant : une panne email ne doit pas casser la création du projet.
    for (const pro of targets) {
      try {
        const res = await sendEmail({
          to: pro.email,
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
