import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'

export const TENDER_EXPIRY_DAYS = 14 // D-07

export interface ExpiryCandidate { id: string; status: string; reference_at: string | null }

/** Pure : lots ouverts dont la diffusion date de plus de TENDER_EXPIRY_DAYS. */
export function selectExpiredLots(lots: ExpiryCandidate[], now: Date): string[] {
  return lots
    .filter(l => l.status === 'open' && l.reference_at
      && (now.getTime() - new Date(l.reference_at).getTime()) / 86_400_000 >= TENDER_EXPIRY_DAYS)
    .map(l => l.id)
}

export default defineEventHandler(async (event) => {
  // Secret partagé : sans lui l'endpoint est publiquement déclenchable.
  const secret = (useRuntimeConfig() as any).cronSecret
  const auth = getHeader(event, 'authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: lots, error } = await supabase
    .from('b2b_tender_lots')
    .select('id, status, created_at')
    .eq('status', 'open')
    .limit(1000)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture des lots.' })

  const lotIds = (lots || []).map((l: any) => l.id)
  const referenceByLot = new Map<string, string>()
  if (lotIds.length > 0) {
    const { data: notifications, error: notifError } = await supabase
      .from('b2b_tender_notifications')
      .select('lot_id, sent_at')
      .in('lot_id', lotIds)
    if (notifError) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture des diffusions.' })
    for (const n of notifications || []) {
      const current = referenceByLot.get(n.lot_id)
      if (!current || new Date(n.sent_at).getTime() < new Date(current).getTime()) {
        referenceByLot.set(n.lot_id, n.sent_at)
      }
    }
  }

  const now = new Date()
  const candidates: ExpiryCandidate[] = (lots || []).map((l: any) => ({
    id: l.id,
    status: l.status,
    reference_at: referenceByLot.get(l.id) ?? null,
  }))

  const expired = selectExpiredLots(candidates, now)

  if (expired.length > 0) {
    const { error: updateError } = await supabase
      .from('b2b_tender_lots')
      .update({ status: 'closed', closed_at: now.toISOString(), closed_reason: 'expired' })
      .in('id', expired)
    if (updateError) throw createError({ statusCode: 500, statusMessage: 'Erreur clôture des lots.' })
  }

  return { status: 'SUCCESS', checked: lots?.length ?? 0, closed: expired.length }
})
