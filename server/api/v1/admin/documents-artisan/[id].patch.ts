import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.11-04 (B2B-SC-01/04) : mise à jour d'un document artisan — statut, expiration,
// activités souscrites, re-contrôle (devoir de vigilance 6 mois).

const DOC_STATUS = ['pending', 'valid', 'expired', 'suspended'] as const

const schema = z.object({
  status: z.enum(DOC_STATUS).optional(),
  expires_at: z.string().nullable().optional(),
  activities_subscribed: z.array(z.string().min(1).max(100)).max(20).optional(),
  last_reviewed_at: z.string().nullable().optional(),
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
    .from('documents_artisan')
    .update(changes)
    .eq('id', id)
    .select('id, doc_type, status, expires_at, activities_subscribed, last_reviewed_at, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const auditMeta: Record<string, any> = {}
  if (changes.status) auditMeta.status = changes.status
  if ('expires_at' in changes) auditMeta.expires_at = changes.expires_at
  if (changes.activities_subscribed) auditMeta.activities = changes.activities_subscribed.length
  if ('last_reviewed_at' in changes && changes.last_reviewed_at) auditMeta.reviewed = true

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'document_artisan_updated',
    target_table: 'documents_artisan',
    target_id: id,
    metadata: auditMeta,
  }).catch(() => {})

  return { status: 'SUCCESS', document: data }
})
