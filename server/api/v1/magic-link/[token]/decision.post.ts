import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { shouldRelaunch, canRelaunch } from '../../../../utils/leadFeedback'

// REQ-06 — Décision du particulier sur un artisan engagé, depuis l'espace magic-link.
// Auth : possession de l'access_token du projet (friction zéro, pas de compte).
// "refused" → si TOUS les pros engagés sont refusés, remise au marché automatique
// (les leads refusés passent en 'lost' pour libérer les slots du cap à 3) + email.
// "selected" → le particulier a retenu cet artisan (empêche toute relance).

const decisionSchema = z.object({
  lead_id: z.string().uuid(),
  decision: z.enum(['refused', 'selected'])
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Token manquant.' })

  const body = await readBody(event)
  const parsed = decisionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Requête invalide', data: parsed.error.format() })
  }
  const { lead_id, decision } = parsed.data

  const supabase = await serverSupabaseServiceRole(event) as any

  // 1. Résoudre le projet via le token (auth particulier).
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, customer_email, access_token, relaunch_count')
    .eq('access_token', token)
    .single()

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable ou lien expiré.' })
  }

  // 2. Vérifier que le lead appartient bien à ce projet.
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, project_id, status')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead || lead.project_id !== project.id) {
    throw createError({ statusCode: 403, statusMessage: 'Cet artisan ne correspond pas à votre projet.' })
  }

  // 3. Enregistrer la décision.
  const { error: updateError } = await supabase
    .from('leads')
    .update({ customer_decision: decision })
    .eq('id', lead.id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'enregistrement de votre choix.' })
  }

  // "selected" → rien d'autre : la présence d'un retenu empêche toute relance.
  if (decision === 'selected') {
    return { success: true, relaunched: false }
  }

  // 4. "refused" → faut-il remettre le projet au marché ?
  const { data: projectLeads } = await supabase
    .from('leads')
    .select('status, customer_decision')
    .eq('project_id', project.id)

  if (!shouldRelaunch(projectLeads || []) || !canRelaunch(project.relaunch_count ?? 0)) {
    return { success: true, relaunched: false }
  }

  // 5. Remise au marché : libérer les slots du cap en passant les leads engagés
  // refusés à 'lost' (ils ne comptent plus comme 'claimed' dans claim.patch).
  await supabase
    .from('leads')
    .update({ status: 'lost' })
    .eq('project_id', project.id)
    .eq('status', 'claimed')
    .eq('customer_decision', 'refused')

  await supabase
    .from('projects')
    .update({
      relaunch_count: (project.relaunch_count ?? 0) + 1,
      last_relaunched_at: new Date().toISOString()
    })
    .eq('id', project.id)

  // 6. Notifier le particulier (même canal email que le magic link, pas de compte).
  if (project.customer_email) {
    const siteUrl = useRuntimeConfig(event).public.siteUrl
    await sendEmail({
      to: project.customer_email,
      subject: 'Votre projet est de nouveau visible sur BÂTI-AXE',
      html: `
        <p>Bonjour,</p>
        <p>Votre projet est de nouveau proposé à des artisans certifiés de votre secteur.
        De nouveaux professionnels pourront bientôt vous contacter.</p>
        <p>
          <a href="${siteUrl}/mon-projet/${project.access_token}" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Suivre mon projet
          </a>
        </p>
        <p>L'équipe BÂTI-AXE</p>
      `
    })
  }

  return { success: true, relaunched: true }
})
