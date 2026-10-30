import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { computeCommission } from '../../../../utils/commission'

// Facturation manuelle (D-02) : l'admin constate l'acompte puis facture. D-07 : deposit_paid
// forçable depuis quote_declared (partenaire silencieux) UNIQUEMENT avec un motif, tracé dans
// audit_logs. Le forçage ne modifie aucun montant (déclaré/confirmé/commission existante).
export const ADMIN_TRANSITIONS: Record<'deposit_paid' | 'invoiced', string[]> = {
  deposit_paid: ['quote_declared', 'quote_confirmed'],
  invoiced: ['deposit_paid'],
}
export function canAdminTransition(from: string, to: 'deposit_paid' | 'invoiced'): boolean {
  return ADMIN_TRANSITIONS[to]?.includes(from) ?? false
}

const bodySchema = z.object({
  status: z.enum(['deposit_paid', 'invoiced']),
  reason: z.string().trim().min(10).max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const parsedId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  const id = parsedId.data
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Requête invalide.' })
  const { status, reason } = parsed.data

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: eng } = await supabase
    .from('b2b_engagements')
    .select('id, status, declared_amount_cents, confirmed_amount_cents, commission_cents')
    .eq('id', id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })
  if (!canAdminTransition(eng.status, status)) throw createError({ statusCode: 409, statusMessage: 'Transition impossible depuis le statut actuel.' })

  const forced = status === 'deposit_paid' && eng.status === 'quote_declared'
  if (forced && !reason) throw createError({ statusCode: 422, statusMessage: 'Motif obligatoire pour forcer l\'acompte sans confirmation du partenaire (D-07).' })

  const patch: Record<string, any> = { status, [status === 'deposit_paid' ? 'deposit_paid_at' : 'invoiced_at']: new Date().toISOString() }
  if (eng.commission_cents == null) patch.commission_cents = computeCommission(Number(eng.confirmed_amount_cents ?? eng.declared_amount_cents))

  const auditRow = {
    actor_id: user.id, action: 'b2b_engagement_status_changed', target_table: 'b2b_engagements', target_id: id,
    metadata: { from: eng.status, to: status, forced, reason: reason ?? null },
  }
  if (forced) {
    // Dérogation D-07 : audit bloquant AVANT l'update, jamais de forçage non tracé.
    const { error: auditErr } = await supabase.from('audit_logs').insert(auditRow)
    if (auditErr) throw createError({ statusCode: 500, statusMessage: 'Traçabilité impossible, forçage annulé.' })
  }

  const { data: updated, error } = await supabase
    .from('b2b_engagements').update(patch).eq('id', id).eq('status', eng.status).select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur mise à jour de l\'avenant.' })
  if (!updated?.length) throw createError({ statusCode: 409, statusMessage: 'L\'avenant a été modifié entre-temps.' })

  if (!forced) {
    try { await supabase.from('audit_logs').insert(auditRow) } catch (err) { console.error('[05.21] Échec audit statut avenant:', err) }
  }
  return { id, status }
})
