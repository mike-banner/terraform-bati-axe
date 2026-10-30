<script setup lang="ts">
import { COMMISSION_RATE_LOW_PCT, COMMISSION_RATE_HIGH_PCT, COMMISSION_THRESHOLD_LABEL } from '~/utils/commissionTiers'

// Modale de confirmation avant claim d'un AO — rappelle l'exclusivité (D-04/D-06).
// Aucun appel réseau : elle émet, la page orchestre.
defineProps<{
  tender: any
  submitting: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

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
      <h2 class="text-base font-bold text-foreground">Vous positionner sur cet appel d'offres ?</h2>

      <p class="text-sm text-slate-600">
        <span class="font-semibold">{{ tender?.category }}</span> · {{ tender?.zone_name }} ·
        réf. {{ tender?.request_ref }}
      </p>

      <div
        v-if="tender?.decision_status === 'confirme'"
        class="border border-amber-300 bg-amber-50 p-3 rounded-sm text-sm text-amber-800"
      >
        Ce chantier est <strong>confirmé</strong> : en vous positionnant, vous fermez cet appel d'offres pour tous les autres artisans. Vous vous engagez à recontacter le partenaire sous 48h.
      </div>
      <div v-else class="border border-border bg-muted/40 p-3 rounded-sm text-sm text-muted-foreground">
        Ce chantier est <strong>en attente de décision</strong> : jusqu'à 3 artisans peuvent se
        positionner. Le partenaire recevra vos coordonnées après signature de l'avenant.
      </div>

      <p class="text-xs text-muted-foreground">
        Étape suivante : vous recevez par email un code pour signer l'avenant de mise en relation (commission de succès {{ COMMISSION_RATE_LOW_PCT }} % HT jusqu'à {{ COMMISSION_THRESHOLD_LABEL }} de devis, {{ COMMISSION_RATE_HIGH_PCT }} % HT au-delà ; non-contournement 24 mois). Les coordonnées du partenaire sont révélées après signature.
      </p>
      <p class="text-xs text-muted-foreground">
        Ce positionnement ne peut pas être annulé depuis votre espace.
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
          :disabled="submitting"
          @click="$emit('confirm')"
        >
          {{ submitting ? 'Envoi…' : 'Continuer vers l\'avenant' }}
        </button>
      </div>
    </div>
  </div>
</template>
