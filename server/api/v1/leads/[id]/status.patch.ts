import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['new', 'contacted', 'won', 'lost'])
})

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de lead manquant.' })

  const body = await readBody(event)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const newStatus = parsed.data.status

  // We use serverSupabaseClient (RLS authenticated as the pro) so they can only update their own leads
  const { data: lead, error: leadError } = await supabaseAuth
    .from('leads')
    .select('id, status')
    .eq('id', id)
    .eq('pro_id', user.id)
    .single()

  if (leadError || !lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead introuvable.' })
  }

  if (lead.status === 'claimed') {
    throw createError({ statusCode: 403, statusMessage: 'Impossible de modifier le statut d\'un lead attribué à un autre pro.' })
  }

  const { error: updateError } = await supabaseAuth
    .from('leads')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('pro_id', user.id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la mise à jour du statut CRM.' })
  }

  return { success: true, status: newStatus }
})
