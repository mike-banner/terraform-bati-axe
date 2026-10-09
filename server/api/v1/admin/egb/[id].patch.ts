import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({ decision: z.enum(['approved', 'rejected']) })

// Approuver / refuser une Entreprise Générale (05.19-05). Seul un admin change egb_status.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Décision invalide.' })

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data, error } = await supabase
    .from('professionals')
    .update({ egb_status: parsed.data.decision })
    .eq('id', id)
    .eq('professional_type', 'entreprise_generale')
    .select('id')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Mise à jour impossible.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Entreprise générale introuvable.' })

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'egb_decided',
    target_table: 'professionals',
    target_id: id,
    metadata: { decision: parsed.data.decision }
  })

  return { status: 'SUCCESS', egb_status: parsed.data.decision }
})
