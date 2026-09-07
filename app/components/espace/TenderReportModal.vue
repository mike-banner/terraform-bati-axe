<script setup lang="ts">
// Modale de signalement d'un AO suspect (D-09/D-10) — purement informative pour
// l'artisan. Aucun appel réseau : elle émet, la page orchestre.
import { ref } from 'vue'

defineProps<{
  tender: any
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { reason: string; details: string }]
  cancel: []
}>()

const REASONS = [
  { value: 'coordonnees_suspectes', label: 'Coordonnées ou identité suspectes' },
  { value: 'hors_perimetre', label: 'Hors de mon périmètre / de ma zone' },
  { value: 'doublon', label: "Doublon d'un autre appel d'offres" },
  { value: 'contenu_abusif', label: 'Contenu abusif ou trompeur' },
  { value: 'autre', label: 'Autre' },
]

const reason = ref('')
const details = ref('')

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="$emit('cancel')"
    @keydown="onKeydown"
  >
    <div class="bg-white rounded-lg max-w-md w-full p-6 space-y-4" role="dialog" aria-modal="true">
      <h2 class="text-base font-bold text-foreground">Signaler cet appel d'offres</h2>

      <div class="space-y-1.5">
        <label for="tender-report-reason" class="text-xs font-semibold text-muted-foreground">Raison</label>
        <select
          id="tender-report-reason"
          v-model="reason"
          class="w-full h-11 px-3 border border-border rounded-sm text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <option value="" disabled>Choisir une raison</option>
          <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="tender-report-details" class="text-xs font-semibold text-muted-foreground">Détails (facultatif)</label>
        <textarea
          id="tender-report-details"
          v-model="details"
          maxlength="500"
          rows="4"
          placeholder="Précisez (facultatif)"
          class="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
        />
        <p class="text-[11px] text-muted-foreground text-right">{{ details.length }}/500</p>
      </div>

      <p class="text-xs text-muted-foreground">
        Votre signalement est transmis à l'équipe BÂTI-AXE. L'appel d'offres reste visible tant qu'aucune décision n'est prise.
      </p>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          class="flex-1 h-11 px-4 border border-border rounded-full text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button
          type="button"
          class="flex-1 h-11 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!reason || submitting"
          @click="$emit('submit', { reason, details })"
        >
          {{ submitting ? 'Envoi…' : 'Envoyer le signalement' }}
        </button>
      </div>
    </div>
  </div>
</template>
