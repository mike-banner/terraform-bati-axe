import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { COMPATIBILITY_MATRIX } from '../../../../../app/utils/workTypeMatrix'

// Fiche projet côté admin : le projet du particulier + les artisans qui s'y sont intéressés
// (leads), avec leur statut et la décision du particulier. Relue à chaque ouverture : la fiche
// suit la vie du projet (qualifié, débloqué, contacté, retenu, gagné/perdu).
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, customer_name, customer_email, customer_phone, category, status, description, budget_range, timeline_range, postal_code, created_at, selected_items, selected_category, selected_sub_category, qualify_score, relaunch_count, last_relaunched_at')
    .eq('id', id)
    .maybeSingle()
  if (error) serverError('admin.projects.detail', error)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })

  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, status, customer_decision, created_at, unlocked_at, professionals(id, company_name, full_name, email, phone, categories, professional_type, is_verified)')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
  if (leadsErr) serverError('admin.projects.detail.leads', leadsErr)

  const works = (project.selected_items ?? []).map((k: string) => COMPATIBILITY_MATRIX[k]?.label ?? k)

  return {
    project: { ...project, works },
    actors: (leads ?? []).map((l: any) => ({
      lead_id: l.id,
      status: l.status,
      customer_decision: l.customer_decision,
      created_at: l.created_at,
      unlocked_at: l.unlocked_at,
      pro: l.professionals ?? null,
    })),
  }
})
