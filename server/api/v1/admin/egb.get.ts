import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { isEgbNaf } from '../../../utils/siretLookup'

// Liste des Entreprises Générales en attente de validation (05.19-05).
// Le NAF est un signal affiché à l'admin, pas une décision.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data, error } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, email, siret, siret_status, siret_naf_code, egb_status, created_at')
    .eq('egb_status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des EGB.' })

  return {
    egb: (data || []).map((p: any) => ({ ...p, naf_coherent: isEgbNaf(p.siret_naf_code) }))
  }
})
