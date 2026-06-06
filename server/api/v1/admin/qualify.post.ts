import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({ project_id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { project_id } = parsed.data
  const supabase = await serverSupabaseServiceRole(event) as any

  // Mark project as qualified and get its category
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .update({ status: 'qualified' })
    .eq('id', project_id)
    .select('category')
    .single()

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }

  // Find all verified pros in the same category (D-01: category matching only)
  const { data: pros, error: prosError } = await supabase
    .from('professionals')
    .select('id')
    .eq('category', project.category)
    .eq('is_verified', true)

  if (prosError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la recherche des professionnels.' })
  }

  // Upsert leads for each matching pro (idempotent via onConflict guard — T-04-08)
  if (pros && pros.length > 0) {
    const leads = pros.map((p: any) => ({
      project_id,
      pro_id: p.id,
      status: 'new',
      unlocked_at: null,
    }))

    const { error: upsertError } = await supabase
      .from('leads')
      .upsert(leads, { onConflict: 'project_id,pro_id' })

    if (upsertError) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la création des leads.' })
    }
  }

  return { qualified: true, leads_created: pros?.length ?? 0 }
})
