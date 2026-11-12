<script setup lang="ts">
import type { B2bAlertType } from '~/composables/useB2bAlerts'

const emit = defineEmits<{ (e: 'open-request', requestId: string): void }>()

const { data, pending } = useB2bAlerts()

const TYPE_LABELS: Record<B2bAlertType, string> = {
  choix_en_attente: 'Choix du partenaire en attente',
  lot_expire: 'Lot expiré',
  devis_non_depose: 'Devis non déposé',
  confirmation_en_attente: 'Devis non confirmé par l\'artisan',
  devis_conteste: 'Devis contesté',
  ecart_suivi: 'Écart de suivi',
  retro_a_verser: 'Rétro-commission à verser',
  avenant_sans_suite: 'Avenant signé sans suite',
  relance_planifiee: 'Relance planifiée échue',
  validation_en_retard: 'Versement en retard de validation',
}
const SEVERITY_LABELS = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' } as const
const SEVERITY_CLASS = {
  haute: 'border-red-500/40 bg-red-500/10 text-red-400',
  moyenne: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  basse: 'border-border bg-muted text-muted-foreground',
} as const

const openId = ref<string | null>(null)
const showSnoozed = ref(false)
const fmtDay = (d: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : ''
</script>

<template>
  <div data-testid="alerts-tab" class="space-y-4">
    <h2 class="text-base font-semibold text-foreground">Alertes ({{ data.counts.total }})</h2>

    <p v-if="pending && !data.alerts.length" class="text-sm text-muted-foreground">Chargement…</p>
    <p v-else-if="!data.alerts.length" class="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-sm">
      Aucune alerte : tout est à jour.
    </p>
    <div v-else class="overflow-x-auto border border-border rounded-sm">
      <table class="w-full text-xs">
        <thead>
          <tr class="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th class="p-2">Sévérité</th><th class="pr-3">Dossier</th><th class="pr-3">Lot</th><th class="pr-3">Type</th>
            <th class="pr-3">Ancienneté</th><th class="pr-3">Action suggérée</th><th />
          </tr>
        </thead>
        <tbody>
          <template v-for="a in data.alerts" :key="a.id">
            <tr data-testid="alert-row" class="align-top border-b border-border">
              <td class="p-2"><span class="px-1.5 py-0.5 rounded-sm border" :class="SEVERITY_CLASS[a.severity]">{{ SEVERITY_LABELS[a.severity] }}</span></td>
              <td class="pr-3 font-semibold">{{ a.request_ref }}</td>
              <td class="pr-3">{{ a.lot_label || '—' }}</td>
              <td class="pr-3">{{ TYPE_LABELS[a.type] ?? a.type }}</td>
              <td class="pr-3">{{ a.age_days }} j</td>
              <td class="pr-3 max-w-xs">{{ a.suggested_action }}</td>
              <td class="pr-2 whitespace-nowrap">
                <button type="button" class="underline text-safety" @click="openId = openId === a.id ? null : a.id">Appeler / suivre</button>
                <button type="button" class="ml-2 underline text-muted-foreground" @click="emit('open-request', a.request_id)">Ouvrir le dossier</button>
              </td>
            </tr>
            <tr v-if="openId === a.id" class="bg-muted/30">
              <td colspan="7" class="p-3"><AdminFollowupPanel :request-id="a.request_id" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="data.snoozed.length">
      <button type="button" class="text-xs underline text-muted-foreground" @click="showSnoozed = !showSnoozed">
        En attente de relance ({{ data.snoozed.length }})
      </button>
      <ul v-if="showSnoozed" class="mt-2 space-y-1 text-xs text-muted-foreground">
        <li v-for="a in data.snoozed" :key="a.id">
          {{ a.request_ref }} · {{ TYPE_LABELS[a.type] ?? a.type }} · relance le {{ fmtDay(a.snoozed_until) }}
        </li>
      </ul>
    </div>
  </div>
</template>
