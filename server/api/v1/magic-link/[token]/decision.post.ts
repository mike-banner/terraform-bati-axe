import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { handleLeadDecision } from '../../../../utils/handleLeadDecision'

// REQ-06 — Décision du particulier sur un artisan engagé, depuis l'espace magic-link.
// Auth : possession de l'access_token du projet (friction zéro, pas de compte).
// "refused" → si TOUS les pros engagés sont refusés, remise au marché automatique
// (les leads refusés passent en 'lost' pour libérer les slots du cap à 3) + email.
// "selected" → le particulier a retenu cet artisan (empêche toute relance).
// Orchestration dans server/utils/handleLeadDecision.ts (testée en unit).

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
  const outcome = await handleLeadDecision(supabase, { token, lead_id, decision })

  if (!outcome.ok) {
    if (outcome.reason === 'project_not_found') {
      throw createError({ statusCode: 404, statusMessage: 'Projet introuvable ou lien expiré.' })
    }
    throw createError({ statusCode: 403, statusMessage: 'Cet artisan ne correspond pas à votre projet.' })
  }

  // Remise au marché effectuée → notifier le particulier (même canal email que le
  // magic link, pas de compte).
  if (outcome.relaunched && outcome.customerEmail) {
    const siteUrl = useRuntimeConfig(event).public.siteUrl
    await sendEmail({
      to: outcome.customerEmail,
      subject: 'Votre projet est de nouveau visible sur BÂTI-AXE',
      html: `
        <p>Bonjour,</p>
        <p>Votre projet est de nouveau proposé à des artisans certifiés de votre secteur.
        De nouveaux professionnels pourront bientôt vous contacter.</p>
        <p>
          <a href="${siteUrl}/mon-projet/${token}" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Suivre mon projet
          </a>
        </p>
        <p>L'équipe BÂTI-AXE</p>
      `
    })
  }

  return { success: true, relaunched: outcome.relaunched }
})
