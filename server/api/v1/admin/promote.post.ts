import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'

const schema = z.object({ email: z.string().email(), secret: z.string() })

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual exige des buffers de même longueur ; on égalise avant
  // comparaison pour ne pas fuiter la longueur du secret via une exception.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Bootstrap endpoint — callable only with ADMIN_BOOTSTRAP_SECRET
// Used to create the first admin before any admin exists in the system.
// Disable after first use by removing ADMIN_BOOTSTRAP_SECRET from env.
export default defineEventHandler(async (event) => {
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET
  if (!bootstrapSecret) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }

  // Rate limit best-effort : 5 tentatives / 10 min / IP sur un endpoint qui
  // permet de créer un admin — voir server/utils/rateLimit.ts pour les limites.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (isRateLimited(`admin-promote:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de tentatives. Réessayez plus tard.' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'email et secret requis.' })

  if (!secretsMatch(parsed.data.secret, bootstrapSecret)) {
    throw createError({ statusCode: 403, statusMessage: 'Secret invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { error } = await supabase.rpc('promote_to_admin', { target_email: parsed.data.email })
  if (error) serverError('admin.promote', error)

  return { status: 'SUCCESS', message: `${parsed.data.email} est maintenant administrateur.` }
})
