import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { computeB2bAlerts, loadB2bAlertInput, readAlertConfig } from '../../../utils/b2bAlerts'
import { readB2bFlowConfig } from '../../../utils/b2bCommissionPlan'

// Phase 05.23 (D-23/D-24) — alertes du flux B2B, calculées à la volée. Lecture seule, réservée à l'admin.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  setResponseHeaders(event, { 'Cache-Control': 'no-store' })

  const supabase = serverSupabaseServiceRole(event) as any
  const config = useRuntimeConfig(event) as any
  const input = await loadB2bAlertInput(supabase, readB2bFlowConfig(config))
  return computeB2bAlerts(input, new Date(), readAlertConfig(config))
})
