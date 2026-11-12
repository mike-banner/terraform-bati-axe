import { computeCommission } from './commission'
import { computeQuoteBase } from './b2bCommissionPlan'
import { notifyAdmin, adminDetailsTable } from './notifyAdmin'

// Phase 05.23 — confirmation d'un dépôt de devis (par l'artisan en un clic, ou par l'admin à l'arbitrage).
// L'assiette cumule les devis confirmés de l'engagement (avenants de travaux, D-17) ; la commission est
// recalculée sur cette assiette par computeCommission (seule fonction de calcul du taux, D-04).
export async function confirmQuoteSubmission(supabase: any, p: {
  submissionId: string; engagementId: string; from: 'pending' | 'contested'
  decidedBy: 'pro' | 'admin'; note?: string | null; capCents: number | null
}): Promise<{ base_cents: number; commission_cents: number }> {
  const now = new Date().toISOString()

  const { data: moved, error } = await supabase
    .from('b2b_quote_submissions')
    .update({
      status: 'confirmed',
      decided_at: now,
      decided_by: p.decidedBy,
      ...(p.decidedBy === 'admin' && p.note ? { arbitration_note: p.note } : {}),
    })
    .eq('id', p.submissionId).eq('engagement_id', p.engagementId).eq('status', p.from)
    .select('id')
  if (error || !moved || moved.length === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ce dépôt a déjà été traité.' })
  }

  const { data: rows } = await supabase
    .from('b2b_quote_submissions').select('amount_ht_cents')
    .eq('engagement_id', p.engagementId).eq('status', 'confirmed')
  const base = computeQuoteBase(((rows ?? []) as Array<{ amount_ht_cents: number | string }>).map(r => Number(r.amount_ht_cents)), p.capCents)
  const commission = computeCommission(base)

  const { data: eng } = await supabase.from('b2b_engagements').select('confirmed_at').eq('id', p.engagementId).maybeSingle()
  const { data: updated, error: updError } = await supabase
    .from('b2b_engagements')
    .update({ status: 'quote_confirmed', confirmed_amount_cents: base, commission_cents: commission, confirmed_at: eng?.confirmed_at ?? now })
    .eq('id', p.engagementId).eq('type', 'lot_amendment')
    .in('status', ['quote_submitted', 'contested', 'quote_confirmed'])
    .select('id')

  // ponytail: deux écritures non transactionnelles ; l'admin est alerté en cas d'écart (RPC SQL si cela se produit en pratique).
  if (updError || !updated || updated.length === 0) {
    await notifyAdmin({
      subject: 'Incohérence : devis confirmé sans mise à jour du suivi',
      title: 'Incohérence sur un devis confirmé',
      bodyHtml: adminDetailsTable([['Engagement', p.engagementId], ['Dépôt', p.submissionId], ['Assiette', String(base)]]),
    })
    throw createError({ statusCode: 500, statusMessage: 'Montant confirmé mais suivi non mis à jour : BÂTI-AXE est prévenu.' })
  }

  return { base_cents: base, commission_cents: commission }
}
