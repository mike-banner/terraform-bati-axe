import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID prospect invalide.'
      })
    }

    const supabase = await serverSupabaseServiceRole(event) as any

    const { data: prospect, error } = await supabase
      .from('prospects')
      .select('company_name, siret, zip_code, converted_professional_id')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur serveur lors de la récupération du prospect.'
      })
    }

    if (!prospect) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Prospect introuvable.'
      })
    }

    if (prospect.converted_professional_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ce profil entreprise a déjà été revendiqué.'
      })
    }

    return {
      status: 'SUCCESS',
      company_name: prospect.company_name,
      siret: prospect.siret,
      postal_code: prospect.zip_code
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
