import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.10-06 (B2B-06) : mise à jour d'une demande B2B — statut pipeline, assignation, notes.

const B2B_STATUS = ['nouveau', 'en_cours', 'rappele', 'qualifie', 'converti', 'perdu'] as const

const schema = z.object({
  status: z.enum(B2B_STATUS).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const changes = parsed.data as Record<string, any>
  if (Object.keys(changes).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune modification fournie.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data, error } = await supabase
    .from('b2b_requests')
    .update(changes)
    .eq('id', id)
    .select('id, status, assigned_to, notes, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Trace dans l'audit log
  const auditMeta: Record<string, any> = {}
  if (changes.status) auditMeta.status = changes.status
  if ('assigned_to' in changes) auditMeta.assigned_to = changes.assigned_to
  if ('notes' in changes) auditMeta.has_notes = true

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'b2b_request_updated',
    target_table: 'b2b_requests',
    target_id: id,
    metadata: auditMeta,
  }).catch(() => {})

  return { status: 'SUCCESS', request: data }
})
