<script setup lang="ts">
import { REASON_MIN, REASON_MAX } from '~/utils/b2bCommissionRules'

// Devis déposé par le partenaire : le pro confirme en un clic ou conteste (D-03, aucun montant saisi).
// Présentationnel : la page orchestre les appels réseau.
const props = defineProps<{ engagement: any }>()

const emit = defineEmits<{
  confirmQuote: [payload: { engagementId: string; submissionId: string }]
  contestQuote: [payload: { engagementId: string; submissionId: string; reason: string }]
}>()

const formatEur = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
const contesting = ref(false)
const contestReason = ref('')

function submitContest() {
  emit('contestQuote', {
    engagementId: props.engagement.id,
    submissionId: props.engagement.open_submission.id,
    reason: contestReason.value.trim(),
  })
  contesting.value = false
  contestReason.value = ''
}
</script>

<template>
  <div v-if="engagement.open_submission?.status === 'pending'" data-testid="quote-to-confirm" class="space-y-2 border border-border rounded-sm p-3">
    <p class="text-sm">
      Devis déposé par le partenaire : <strong>{{ formatEur(engagement.open_submission.amount_ht_cents) }} HT</strong>
      <template v-if="engagement.open_submission.planned_due_dates?.length">
        — versements prévus le {{ engagement.open_submission.planned_due_dates.map((d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' })).join(' / ') }}
      </template>
    </p>
    <a :href="engagement.open_submission.file_url" target="_blank" rel="noopener" class="text-xs underline underline-offset-2">Voir le devis (PDF)</a>
    <p class="text-xs text-muted-foreground">
      En confirmant, vous déclarez le montant HT du devis signé (article 5 de votre avenant). La commission est calculée par BÂTI-AXE.
    </p>
    <div v-if="!contesting" class="flex flex-wrap gap-2">
      <button
        type="button"
        class="h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-80"
        @click="emit('confirmQuote', { engagementId: engagement.id, submissionId: engagement.open_submission.id })"
      >
        Confirmer le montant
      </button>
      <button type="button" class="h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted" @click="contesting = true">
        Contester
      </button>
    </div>
    <form v-else class="space-y-2" @submit.prevent="submitContest">
      <textarea
        :id="`contest-reason-${engagement.id}`"
        v-model="contestReason"
        aria-label="Motif de la contestation"
        :minlength="REASON_MIN"
        :maxlength="REASON_MAX"
        required
        rows="3"
        class="w-full px-3 py-2 border border-border rounded-sm text-sm"
      />
      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="contestReason.trim().length < REASON_MIN"
          class="h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-80 disabled:opacity-40"
        >
          Envoyer la contestation
        </button>
        <button type="button" class="h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted" @click="contesting = false">
          Annuler
        </button>
      </div>
    </form>
  </div>
  <p v-else-if="engagement.open_submission?.status === 'contested'" class="text-xs text-muted-foreground">
    Montant contesté — BÂTI-AXE arbitre.
  </p>
</template>
