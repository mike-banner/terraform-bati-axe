import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// CNV-07: pro logs paywall_view or checkout_started events for funnel analytics
// 'checkout_completed' is webhook-only (T-04.5-11: Zod enum excludes it here)

const eventSchema = z.object({
  event_type: z.enum(['paywall_view', 'checkout_started']),
  lead_id: z.string().uuid().optional(),
  qualify_score: z.number().int().min(0).max(4).optional(),
})

// T-04.5-13: in-process per-pro throttle — no Redis dependency (INFRA-04 not required)
const lastEventAt = new Map<string, number>()

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const body = await readBody(event)
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.message })

  const { event_type, lead_id, qualify_score } = parsed.data

  // Rate limit: 2-second window per pro (silent — returns logged:false, no error to avoid retries)
  const now = Date.now()
  const last = lastEventAt.get(user.id) ?? 0
  if (now - last < 2000) {
    return { logged: false, reason: 'rate_limited' }
  }
  lastEventAt.set(user.id, now)

  const supabase = await serverSupabaseServiceRole(event) as any
  await supabase.from('paywall_events').insert({
    pro_id: user.id,
    event_type,
    lead_id: lead_id ?? null,
    qualify_score: qualify_score ?? null,
    metadata: { source: 'client', user_agent: getHeader(event, 'user-agent') },
  })

  return { logged: true }
})
