import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { loadCommissionRows, type CommissionRow } from '../../../../utils/b2bCommissionsQuery'
import { readB2bFlowConfig, centsToCsv, toCsv } from '../../../../utils/b2bCommissionPlan'
import { requireAdminOperator } from '../../../../utils/adminOperator'
import {
  COMMISSION_STATUS_LABELS, PARTNER_SHARE_STATUS_LABELS, CANCEL_CASE_LABELS, MOVEMENT_TYPE_LABELS,
  ENGAGEMENT_STATUS_LABELS_ADMIN, type EngagementStatus, type CancelCase,
} from '../../../../../app/utils/b2bCommissionRules'

const COMMISSION_HEADER = [
  'Référence dossier', 'Lot', 'Partenaire', 'Artisan', 'Statut avenant', 'Montant HT confirmé (€)', 'Commission HT (€)',
  'Part partenaire (€)', 'Net BÂTI-AXE (€)', 'Statut commission', 'Statut rétro-commission', 'Facturé (€)', 'Encaissé (€)',
  'Remboursé (€)', 'Remboursement à traiter (€)', 'Rétro-commission versée (€)', 'Solde restant (€)',
  'Échéancier (montant / date prévue / validé le)', 'Prochaine échéance', 'Date échéance', 'Cas d\'annulation', 'Motif d\'annulation',
]
const MOVEMENT_HEADER = ['Date opération', 'Enregistré le', 'Référence dossier', 'Lot', 'Artisan', 'Type', 'Montant (€)', 'Opérateur', 'Note']

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : 'non')

function commissionLine(r: CommissionRow): (string | number | null)[] {
  const s = r.state
  const schedule = r.schedule
    .map(i => `${i.label} ${centsToCsv(i.amount_cents)} prévu ${i.due_on ?? '—'} validé ${day(i.validated_at)}`)
    .join(' | ')
  const next = s.next_due ? s.next_due.label + (s.next_due.validated ? '' : ' (à valider par le partenaire)') : ''
  return [
    r.request_ref, r.lot_label, r.partner_label, r.pro_company,
    ENGAGEMENT_STATUS_LABELS_ADMIN[r.engagement_status as EngagementStatus] ?? r.engagement_status,
    centsToCsv(r.base_cents), centsToCsv(r.commission_cents), centsToCsv(r.partner_share_cents), centsToCsv(r.platform_net_cents),
    COMMISSION_STATUS_LABELS[s.status], PARTNER_SHARE_STATUS_LABELS[s.partner_status],
    centsToCsv(s.invoiced_cents), centsToCsv(s.paid_cents), centsToCsv(s.refunded_cents), centsToCsv(s.refund_due_cents),
    centsToCsv(s.partner_paid_cents), centsToCsv(s.balance_cents),
    schedule, next, s.next_due?.due_on ?? '',
    r.cancel ? (CANCEL_CASE_LABELS[r.cancel.case as CancelCase] ?? r.cancel.case) : '',
    r.cancel?.reason ?? '',
  ]
}

// Phase 05.23 — export CSV pour l'expert-comptable (commissions ou journal des mouvements).
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  // D-29 : opérateur obligatoire avant toute lecture.
  const query = getQuery(event)
  const operator = requireAdminOperator(useRuntimeConfig(event) as any, query.operator)
  const scope = query.scope === 'movements' ? 'movements' : 'commissions'

  const supabase = serverSupabaseServiceRole(event) as any
  const flow = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const rows = await loadCommissionRows(supabase, flow)

  const lines = scope === 'movements'
    ? rows.flatMap(r => r.movements.map(m => [
      m.occurred_on, m.created_at.slice(0, 10), r.request_ref, r.lot_label, r.pro_company,
      MOVEMENT_TYPE_LABELS[m.type] ?? m.type, centsToCsv(m.amount_cents), m.operator, m.note ?? '',
    ]))
    : rows.map(commissionLine)

  // audit_logs.target_id est NOT NULL : pas d'audit sans ligne exportée.
  const first = rows[0]
  if (first) {
    try {
      await supabase.from('audit_logs').insert({
        actor_id: (user as any).id, action: 'b2b_commission_movement', target_table: 'b2b_requests', target_id: first.request_id,
        metadata: { export: scope, operator, rows: lines.length },
      })
    } catch { /* non bloquant */ }
  }

  const today = new Date().toISOString().slice(0, 10)
  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${scope === 'movements' ? 'mouvements' : 'commissions'}-${today}.csv"`,
    'Cache-Control': 'no-store',
  })
  return toCsv([scope === 'movements' ? MOVEMENT_HEADER : COMMISSION_HEADER, ...lines])
})
