import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { CATEGORY_LABELS } from '../../utils/categoryLabels'

// CNV-04: pro-zone market signal — aggregate project count + top categories (last 30 days)
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro } = await supabase
    .from('professionals')
    .select('id, zone_id')
    .eq('id', user.id)
    .single()

  if (!pro?.zone_id) return { data: null }

  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('zone_id', pro.zone_id)
    .gte('created_at', cutoff)

  const { data: rows } = await supabase
    .from('projects')
    .select('category')
    .eq('zone_id', pro.zone_id)
    .gte('created_at', cutoff)
    .limit(500)

  const freq: Record<string, number> = {}
  for (const r of (rows ?? [])) {
    if (r.category) freq[r.category] = (freq[r.category] ?? 0) + 1
  }
  const topCategories = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => CATEGORY_LABELS[key] ?? key)

  return { data: { projectCount: projectCount ?? 0, topCategories } }
})
