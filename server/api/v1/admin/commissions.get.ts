import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { loadCommissionRows, summarizeCommissions, countStaleWithoutQuote } from '../../../utils/b2bCommissionsQuery'
import { readB2bFlowConfig } from '../../../utils/b2bCommissionPlan'

// Phase 05.23 — « Commissions en cours » : liste et synthèse recalculées depuis les dépôts confirmés et le journal.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  setResponseHeaders(event, { 'Cache-Control': 'no-store' })

  const supabase = serverSupabaseServiceRole(event) as any
  const flow = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const rows = await loadCommissionRows(supabase, flow)
  const stale = await countStaleWithoutQuote(supabase, flow.quoteStaleDays)
  return { rows, summary: summarizeCommissions(rows, stale), quote_stale_days: flow.quoteStaleDays }
})
