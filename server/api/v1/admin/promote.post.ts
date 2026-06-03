import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'

const schema = z.object({ email: z.string().email(), secret: z.string() })

// Bootstrap endpoint — callable only with ADMIN_BOOTSTRAP_SECRET
// Used to create the first admin before any admin exists in the system.
// Disable after first use by removing ADMIN_BOOTSTRAP_SECRET from env.
export default defineEventHandler(async (event) => {
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET
  if (!bootstrapSecret) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'email et secret requis.' })

  if (parsed.data.secret !== bootstrapSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Secret invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { error } = await supabase.rpc('promote_to_admin', { target_email: parsed.data.email })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { status: 'SUCCESS', message: `${parsed.data.email} est maintenant administrateur.` }
})
