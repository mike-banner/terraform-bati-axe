<script setup lang="ts">
import { AMOUNT_INPUT_MAXLENGTH, AMOUNT_INPUT_PATTERN } from '~/utils/commissionTiers'
import {
  COMMISSION_STATUS_LABELS, PARTNER_SHARE_STATUS_LABELS, MOVEMENT_TYPE_LABELS, CANCEL_CASE_LABELS,
  REASON_MIN, REASON_MAX,
  type CommissionStatus, type PartnerShareStatus, type MovementType, type CancelCase,
} from '~/utils/b2bCommissionRules'

// Phase 05.23 — « Commissions en cours » : tout est calculé côté serveur (dépôts confirmés + journal).
interface Installment { seq: number; label: string; amount_cents: number; due_on: string | null; validated_at: string | null }
interface Row {
  engagement_id: string; request_ref: string; lot_label: string; partner_label: string; pro_company: string
  engagement_status: string; base_cents: number; commission_cents: number; partner_share_cents: number
  schedule: Installment[]; schedule_changed: boolean; snapshot_mismatch: boolean
  state: {
    status: CommissionStatus; partner_status: PartnerShareStatus; invoiced_cents: number; paid_cents: number; refunded_cents: number
    refund_due_cents: number; exigible_cents: number; partner_due_now_cents: number; partner_paid_cents: number; balance_cents: number
    next_due: { seq: number; label: string; amount_cents: number; due_on: string | null; validated: boolean } | null
  }
  open_contest: { submission_id: string; amount_ht_cents: number; reason: string | null } | null
  quote_files: Array<{ submission_id: string; amount_ht_cents: number; status: string; url: string }>
  amendment_url: string
  cancel: { case: string; reason: string; at: string; partner_share_kept_cents: number | null } | null
  movements: Array<{ id: string; type: MovementType; amount_cents: number; occurred_on: string; note: string | null; operator: string }>
}
interface Payload {
  rows: Row[]
  summary: { total_to_collect_cents: number; total_collected_cents: number; partner_shares_due_cents: number; contested_count: number; stale_without_quote_count: number }
  quote_stale_days: number
}

const { data, refresh, error: loadError } = useFetch<Payload>('/api/v1/admin/commissions', { server: false })

const eur = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100)
const fmtDay = (d: string | null) => d ? new Date(d.length === 10 ? d + 'T12:00:00Z' : d).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—'
const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const today = new Date().toISOString().slice(0, 10)

const exportOperator = ref<string | null>(null)
const exportHref = (scope?: 'movements') =>
  `/api/v1/admin/commissions/export?operator=${encodeURIComponent(exportOperator.value ?? '')}${scope ? '&scope=movements' : ''}`

const openPanel = ref<{ id: string; kind: 'movement' | 'cancel' | 'arbitrate' } | null>(null)
const errorMessage = ref<string | null>(null)
const resultMessage = ref<string | null>(null)
const busy = ref(false)

const form = reactive({
  type: 'commission_facturee' as MovementType, amount: '', occurredOn: today, note: '',
  cancelCase: '' as CancelCase | '', reason: '', kept: '', operator: null as string | null, arbNote: '',
})

function open(row: Row, kind: 'movement' | 'cancel' | 'arbitrate') {
  openPanel.value = { id: row.engagement_id, kind }
  errorMessage.value = null
  resultMessage.value = null
  Object.assign(form, { type: 'commission_facturee', amount: '', occurredOn: today, note: '', cancelCase: '', reason: '', kept: '', operator: null, arbNote: '' })
  if (kind === 'movement') form.amount = prefill(row, form.type)
}
function prefill(row: Row, type: MovementType): string {
  if (type === 'commission_facturee') {
    const left = row.state.exigible_cents - row.state.invoiced_cents
    return left > 0 ? centsToInput(left) : ''
  }
  if (type === 'remboursement') return row.state.refund_due_cents > 0 ? centsToInput(row.state.refund_due_cents) : ''
  return ''
}
const isOpen = (row: Row, kind: string) => openPanel.value?.id === row.engagement_id && openPanel.value.kind === kind

function movementTypes(row: Row): MovementType[] {
  const list: MovementType[] = ['commission_facturee', 'encaissement']
  // D-26 : la rétro-commission n'est proposée qu'une fois due (fin de chantier, commission encaissée).
  if (row.state.partner_status === 'a_verser') list.push('retro_commission_versee')
  if (row.state.refund_due_cents > 0) list.push('remboursement')
  return list
}

async function call(path: string, body: Record<string, unknown>, ok: (res: any) => string) {
  busy.value = true
  errorMessage.value = null
  try {
    const res = await $fetch(path, { method: 'POST', body })
    resultMessage.value = ok(res)
    openPanel.value = null
    await refresh()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Action impossible.'
  } finally {
    busy.value = false
  }
}

const submitMovement = (row: Row) => call(`/api/v1/admin/commissions/${row.engagement_id}/movements`, {
  type: form.type, amount: form.amount, occurred_on: form.occurredOn, ...(form.note.trim() ? { note: form.note.trim() } : {}), operator: form.operator,
}, () => 'Mouvement enregistré.')

const submitCancel = (row: Row) => call(`/api/v1/admin/commissions/${row.engagement_id}/cancel`, {
  case: form.cancelCase, reason: form.reason.trim(), ...(form.kept.trim() ? { partner_share_kept: form.kept.trim() } : {}), operator: form.operator,
}, (r) => {
  const parts = ['Commission annulée.']
  if (r.refund_due_cents > 0) parts.push(`Remboursement à traiter : ${eur(r.refund_due_cents)}.`)
  if (r.warning_partner_already_paid) parts.push(`Attention : ${eur(r.partner_to_recover_cents)} de rétro-commission à récupérer auprès du partenaire.`)
  return parts.join(' ')
})

const submitArbitration = (row: Row, decision: 'confirm' | 'reject') => call(`/api/v1/admin/commissions/${row.engagement_id}/arbitrate`, {
  submission_id: row.open_contest?.submission_id, decision, note: form.arbNote.trim(), operator: form.operator,
}, () => decision === 'confirm' ? 'Montant validé : commission calculée.' : 'Dépôt refusé : le partenaire redépose.')

const movementValid = computed(() => Boolean(form.operator) && form.amount.trim().length > 0 && Boolean(form.occurredOn))
const cancelValid = computed(() => Boolean(form.operator) && Boolean(form.cancelCase) && form.reason.trim().length >= REASON_MIN)
const arbValid = computed(() => Boolean(form.operator) && form.arbNote.trim().length >= REASON_MIN)

const badgeClass = (s: CommissionStatus) =>
  s === 'contestee' ? 'border-amber-300 bg-amber-50 text-amber-800'
    : s === 'annulee' ? 'border-slate-300 bg-slate-100 text-slate-600'
      : 'border-border'
const overdue = (i: Installment) => !i.validated_at && Boolean(i.due_on) && (i.due_on as string) < today
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 class="text-base font-bold text-foreground">Commissions en cours</h2>
      <div class="flex flex-wrap items-end gap-4">
        <AdminOperatorSelect id="commissions-export-operator" v-model="exportOperator" />
        <template v-if="exportOperator">
          <a :href="exportHref()" class="text-xs underline">Exporter les commissions (CSV)</a>
          <a :href="exportHref('movements')" class="text-xs underline">Exporter le journal (CSV)</a>
        </template>
        <template v-else>
          <span aria-disabled="true" class="text-xs text-muted-foreground">Exporter les commissions (CSV)</span>
          <span aria-disabled="true" class="text-xs text-muted-foreground">Exporter le journal (CSV)</span>
        </template>
      </div>
    </div>

    <p v-if="errorMessage" role="alert" class="text-sm text-destructive">{{ errorMessage }}</p>
    <p v-if="resultMessage" class="text-sm text-foreground">{{ resultMessage }}</p>
    <p v-if="loadError" role="alert" class="text-sm text-destructive">Impossible de charger les commissions.</p>
    <p v-if="!data && !loadError" class="text-sm text-muted-foreground">Chargement…</p>

    <template v-if="data">
      <div data-testid="commissions-summary" class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))">
        <div class="border border-border rounded-sm p-3"><p class="text-xs text-muted-foreground">À encaisser</p><p class="text-lg font-bold">{{ eur(data.summary.total_to_collect_cents) }}</p></div>
        <div class="border border-border rounded-sm p-3"><p class="text-xs text-muted-foreground">Encaissé</p><p class="text-lg font-bold">{{ eur(data.summary.total_collected_cents) }}</p></div>
        <div class="border border-border rounded-sm p-3"><p class="text-xs text-muted-foreground">Rétro-commissions dues</p><p class="text-lg font-bold">{{ eur(data.summary.partner_shares_due_cents) }}</p></div>
        <div class="border border-border rounded-sm p-3"><p class="text-xs text-muted-foreground">Contestés</p><p class="text-lg font-bold">{{ data.summary.contested_count }}</p></div>
        <div class="border border-border rounded-sm p-3"><p class="text-xs text-muted-foreground">Sans devis après {{ data.quote_stale_days }} j</p><p class="text-lg font-bold">{{ data.summary.stale_without_quote_count }}</p></div>
      </div>

      <p v-if="!data.rows.length" class="text-sm text-muted-foreground">Aucune commission en cours.</p>

      <div v-else class="overflow-x-auto">
        <table data-testid="commissions-table" class="w-full text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr class="text-left border-b border-border text-muted-foreground">
              <th class="py-2 pr-3">Dossier / lot</th><th class="pr-3">Partenaire</th><th class="pr-3">Artisan</th>
              <th class="pr-3">Montant HT confirmé</th><th class="pr-3">Commission BÂTI-AXE</th><th class="pr-3">Part partenaire</th>
              <th class="pr-3">Statut</th><th class="pr-3">Rétro-commission</th><th class="pr-3">Échéancier</th>
              <th class="pr-3">Prochaine échéance</th><th class="pr-3">Solde restant</th><th class="pr-3">Documents</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in data.rows" :key="row.engagement_id">
              <tr class="align-top border-b border-border">
                <td class="py-2 pr-3"><span class="font-semibold">{{ row.request_ref }}</span><br>{{ row.lot_label }}</td>
                <td class="pr-3">{{ row.partner_label }}</td>
                <td class="pr-3">{{ row.pro_company }}</td>
                <td class="pr-3">{{ eur(row.base_cents) }}</td>
                <td class="pr-3">{{ eur(row.commission_cents) }}</td>
                <td class="pr-3">{{ eur(row.partner_share_cents) }}</td>
                <td class="pr-3">
                  <span class="inline-block px-2 py-0.5 rounded-sm border" :class="badgeClass(row.state.status)">{{ COMMISSION_STATUS_LABELS[row.state.status] }}</span>
                  <span v-if="row.snapshot_mismatch" class="block mt-1 px-2 py-0.5 rounded-sm border border-amber-300 bg-amber-50 text-amber-800">Écart de suivi</span>
                  <span v-if="row.schedule_changed" class="block mt-1 px-2 py-0.5 rounded-sm border border-amber-300 bg-amber-50 text-amber-800">Échéancier modifié par un avenant</span>
                  <span v-if="row.state.refund_due_cents > 0" class="block mt-1 text-destructive font-semibold">Remboursement à traiter : {{ eur(row.state.refund_due_cents) }}</span>
                </td>
                <td class="pr-3">
                  {{ PARTNER_SHARE_STATUS_LABELS[row.state.partner_status] }}
                  <span class="block text-muted-foreground">due à ce jour : {{ eur(row.state.partner_due_now_cents) }}</span>
                  <span v-if="row.state.partner_status === 'a_recuperer'" class="block px-2 py-0.5 rounded-sm border border-red-300 bg-red-50 text-red-700">À récupérer</span>
                </td>
                <td class="pr-3" data-testid="commission-schedule">
                  <p v-for="i in row.schedule" :key="i.seq">
                    {{ i.label }} — {{ eur(i.amount_cents) }} — prévu le {{ fmtDay(i.due_on) }} —
                    <span v-if="i.validated_at">Validé le {{ fmtDay(i.validated_at) }}</span>
                    <span v-else :class="overdue(i) ? 'text-amber-700 font-semibold' : ''">À valider par le partenaire</span>
                  </p>
                </td>
                <td class="pr-3">
                  <template v-if="row.state.next_due">
                    {{ row.state.next_due.label }} — {{ eur(row.state.next_due.amount_cents) }}
                    <span class="block text-muted-foreground">{{ row.state.next_due.validated ? 'à facturer' : 'en attente de validation du partenaire' }}</span>
                  </template>
                  <template v-else>—</template>
                </td>
                <td class="pr-3">{{ eur(row.state.balance_cents) }}</td>
                <td class="pr-3">
                  <a v-for="(f, n) in row.quote_files" :key="f.submission_id" :href="f.url" target="_blank" rel="noopener" class="block underline">Devis {{ n + 1 }} (PDF)</a>
                  <a :href="row.amendment_url" target="_blank" rel="noopener" class="block underline">Avenant</a>
                </td>
                <td class="space-y-1">
                  <button type="button" :disabled="row.state.status === 'contestee'" class="block h-7 px-2.5 rounded-sm border border-border disabled:opacity-40" @click="open(row, 'movement')">Enregistrer un mouvement</button>
                  <button v-if="row.state.status !== 'annulee'" type="button" class="block h-7 px-2.5 rounded-sm border border-border" @click="open(row, 'cancel')">Annuler la commission</button>
                  <button v-if="row.open_contest" type="button" class="block h-7 px-2.5 rounded-sm border border-border" @click="open(row, 'arbitrate')">Arbitrer</button>
                </td>
              </tr>

              <tr v-if="openPanel && openPanel.id === row.engagement_id" class="bg-muted/30">
                <td colspan="13" class="p-4">
                  <!-- Mouvement -->
                  <form v-if="isOpen(row, 'movement')" class="flex flex-wrap items-end gap-3" @submit.prevent="submitMovement(row)">
                    <label class="text-xs font-semibold">Type
                      <select v-model="form.type" required aria-label="Type de mouvement" class="block h-8 px-2 rounded-sm border border-border bg-background" @change="form.amount = prefill(row, form.type)">
                        <option v-for="t in movementTypes(row)" :key="t" :value="t">{{ MOVEMENT_TYPE_LABELS[t] }}</option>
                      </select>
                    </label>
                    <label class="text-xs font-semibold">Montant (€)
                      <input v-model="form.amount" type="text" inputmode="decimal" :maxlength="AMOUNT_INPUT_MAXLENGTH" :pattern="AMOUNT_INPUT_PATTERN" required aria-label="Montant (€)" class="block h-8 w-32 px-2 rounded-sm border border-border bg-background">
                    </label>
                    <label class="text-xs font-semibold">Date de l'opération
                      <input v-model="form.occurredOn" type="date" required :max="today" min="2026-01-01" aria-label="Date de l'opération" class="block h-8 px-2 rounded-sm border border-border bg-background">
                    </label>
                    <label class="text-xs font-semibold">Note
                      <textarea v-model="form.note" :maxlength="REASON_MAX" rows="1" aria-label="Note" class="block w-56 px-2 py-1 rounded-sm border border-border bg-background" />
                    </label>
                    <AdminOperatorSelect id="commission-movement-operator" v-model="form.operator" />
                    <p v-if="form.type === 'commission_facturee' && row.state.exigible_cents - row.state.invoiced_cents <= 0" class="text-xs text-muted-foreground w-full">Aucun versement validé par le partenaire à facturer.</p>
                    <button type="submit" :disabled="busy || !movementValid" class="h-8 px-3 rounded-sm bg-foreground text-background text-xs font-semibold disabled:opacity-40">Enregistrer</button>
                    <button type="button" class="h-8 px-3 rounded-sm border border-border text-xs" @click="openPanel = null">Fermer</button>
                  </form>

                  <!-- Annulation -->
                  <form v-else-if="isOpen(row, 'cancel')" class="space-y-3" @submit.prevent="submitCancel(row)">
                    <div class="flex flex-wrap items-end gap-3">
                      <label class="text-xs font-semibold">Cas d'annulation
                        <select v-model="form.cancelCase" required aria-label="Cas d'annulation" class="block h-8 px-2 rounded-sm border border-border bg-background">
                          <option value="">— Choisir —</option>
                          <option v-for="(label, key) in CANCEL_CASE_LABELS" :key="key" :value="key">{{ label }}</option>
                        </select>
                      </label>
                      <label class="text-xs font-semibold">Part partenaire conservée (€) — facultatif
                        <input v-model="form.kept" type="text" inputmode="decimal" :maxlength="AMOUNT_INPUT_MAXLENGTH" :pattern="AMOUNT_INPUT_PATTERN" aria-label="Part partenaire conservée (€)" class="block h-8 w-32 px-2 rounded-sm border border-border bg-background">
                      </label>
                      <AdminOperatorSelect id="commission-cancel-operator" v-model="form.operator" />
                    </div>
                    <label class="block text-xs font-semibold">Motif de l'annulation
                      <textarea v-model="form.reason" required :minlength="REASON_MIN" :maxlength="REASON_MAX" rows="2" aria-label="Motif de l'annulation" class="block w-full px-2 py-1 rounded-sm border border-border bg-background" />
                    </label>
                    <p v-if="row.state.partner_paid_cents > 0" class="text-xs text-destructive font-semibold">Attention : {{ eur(row.state.partner_paid_cents) }} de rétro-commission déjà versés au partenaire.</p>
                    <p v-if="row.state.paid_cents - row.state.refunded_cents > 0" class="text-xs">Un remboursement de {{ eur(row.state.paid_cents - row.state.refunded_cents) }} sera à traiter (jamais automatique).</p>
                    <div class="flex gap-3">
                      <button type="submit" :disabled="busy || !cancelValid" class="h-8 px-3 rounded-sm bg-foreground text-background text-xs font-semibold disabled:opacity-40">Confirmer l'annulation</button>
                      <button type="button" class="h-8 px-3 rounded-sm border border-border text-xs" @click="openPanel = null">Fermer</button>
                    </div>
                  </form>

                  <!-- Arbitrage -->
                  <div v-else-if="isOpen(row, 'arbitrate') && row.open_contest" class="space-y-3">
                    <p class="text-xs">Montant contesté : <strong>{{ eur(row.open_contest.amount_ht_cents) }} HT</strong></p>
                    <p v-if="row.open_contest.reason" class="text-xs">Motif de l'artisan : {{ row.open_contest.reason }}</p>
                    <label class="block text-xs font-semibold">Note d'arbitrage
                      <textarea v-model="form.arbNote" required :minlength="REASON_MIN" :maxlength="REASON_MAX" rows="2" aria-label="Note d'arbitrage" class="block w-full px-2 py-1 rounded-sm border border-border bg-background" />
                    </label>
                    <AdminOperatorSelect id="commission-arbitrate-operator" v-model="form.operator" />
                    <div class="flex gap-3">
                      <button type="button" :disabled="busy || !arbValid" class="h-8 px-3 rounded-sm bg-foreground text-background text-xs font-semibold disabled:opacity-40" @click="submitArbitration(row, 'confirm')">Valider le montant</button>
                      <button type="button" :disabled="busy || !arbValid" class="h-8 px-3 rounded-sm border border-border text-xs font-semibold disabled:opacity-40" @click="submitArbitration(row, 'reject')">Refuser (le partenaire redépose)</button>
                      <button type="button" class="h-8 px-3 rounded-sm border border-border text-xs" @click="openPanel = null">Fermer</button>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td colspan="13" class="pb-3">
                  <details>
                    <summary class="cursor-pointer text-xs underline">Journal ({{ row.movements.length }})</summary>
                    <ul class="mt-2 space-y-1 text-xs">
                      <li v-for="m in row.movements" :key="m.id">
                        {{ fmtDay(m.occurred_on) }} — {{ MOVEMENT_TYPE_LABELS[m.type] }} — {{ eur(m.amount_cents) }} — {{ m.operator }}<template v-if="m.note"> — {{ m.note }}</template>
                      </li>
                      <li v-if="row.cancel">Annulée le {{ fmtDay(row.cancel.at) }} — {{ CANCEL_CASE_LABELS[row.cancel.case as CancelCase] ?? row.cancel.case }} : {{ row.cancel.reason }}</li>
                      <li v-if="!row.movements.length && !row.cancel" class="text-muted-foreground">Aucun mouvement.</li>
                    </ul>
                  </details>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
