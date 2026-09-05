import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.10-06 (B2B-06) : mise à jour d'une demande B2B — statut pipeline, assignation, notes.

const B2B_STATUS = ['nouveau', 'en_cours', 'rappele', 'qualifie', 'converti', 'perdu'] as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const POSTAL_RE = /^\d{5}$/
const DECISION_STATUS = ['confirme', 'en_attente'] as const

const schema = z.object({
  status: z.enum(B2B_STATUS).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  // 05.10-08 — Qualification DirCo
  qualifications_requises: z.array(z.string().min(1).max(100)).max(20).optional(),
  planning_start: z.string().regex(DATE_RE).nullable().optional(),
  planning_end: z.string().regex(DATE_RE).nullable().optional(),
  recommended_pros: z.array(z.string().uuid()).max(3).optional(),
  // Phase 7 — TEND-02 / support TEND-04
  decision_status: z.enum(DECISION_STATUS).optional(),
  project_postal_code: z.string().regex(POSTAL_RE, 'Le code postal doit comporter 5 chiffres.').nullable().optional(),
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
    .select('id, status, assigned_to, notes, description, decision_status, project_postal_code, qualifications_requises, planning_start, planning_end, recommended_pros, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Trace dans l'audit log
  const auditMeta: Record<string, any> = {}
  if (changes.status) auditMeta.status = changes.status
  if ('assigned_to' in changes) auditMeta.assigned_to = changes.assigned_to
  if ('notes' in changes) auditMeta.has_notes = true
  if (changes.qualifications_requises) auditMeta.qualifications = changes.qualifications_requises.length
  if ('planning_start' in changes || 'planning_end' in changes) auditMeta.planning = true
  if (changes.recommended_pros) auditMeta.recommended_pros = changes.recommended_pros.length
  if (changes.decision_status) auditMeta.decision_status = changes.decision_status
  if ('project_postal_code' in changes) auditMeta.postal_code = true

  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id,
      action: 'b2b_request_updated',
      target_table: 'b2b_requests',
      target_id: id,
      metadata: auditMeta,
    })
  } catch { /* non-blocking */ }

  return { status: 'SUCCESS', request: data }
})
