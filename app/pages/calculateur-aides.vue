<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: "Calculateur d'aides — BÂTI-AXE",
  meta: [
    { name: 'description', content: 'Estimez vos aides MaPrimeRénov, CEE et Éco-PTZ et votre reste à charge réel.' }
  ]
})

const cout = ref<number | null>(null)
const coutInput = ref<number>(0)

const onComplete = (_p: { aides_estimees: number; reste_a_charge_min: number; reste_a_charge_max: number }) => {}
// Annuler depuis le tunnel ramène à la saisie du coût plutôt que de laisser
// l'utilisateur bloqué sans action visible.
const onSkip = () => { cout.value = null }
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-page px-4 py-12 md:py-16">
    <div class="mx-auto w-full max-w-xl">
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Calculateur d'aides</span>
      <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground text-left mt-1 mb-8 whitespace-nowrap">Estimez vos aides de rénovation</h1>

      <div class="w-full bg-white rounded-sm border border-slate-200 shadow-sm p-8 md:p-10">
        <!-- Saisie du coût travaux -->
        <div v-if="cout === null">
          <p class="text-sm text-muted-foreground">Quel est le montant estimé de vos travaux ?</p>
          <input
            v-model.number="coutInput"
            type="number"
            min="0"
            step="500"
            inputmode="numeric"
            placeholder="40000"
            class="w-full h-14 px-4 mt-6 border border-border rounded-sm text-xl font-semibold bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="button"
            @click="cout = coutInput"
            :disabled="coutInput <= 0"
            class="mt-6 inline-flex items-center justify-center h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 transition-transform disabled:opacity-30"
          >Continuer</button>
        </div>

        <!-- Délégation au mini-tunnel (pas de duplication de logique) -->
        <AidesMiniTunnel
          v-else
          :cout-travaux-min="cout"
          :cout-travaux-max="cout"
          @complete="onComplete"
          @skip="onSkip"
        />
      </div>
    </div>
  </div>
</template>
