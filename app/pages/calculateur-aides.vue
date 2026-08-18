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
const onSkip = () => {}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-page flex items-start justify-center px-4 py-12 md:py-16">
    <div class="w-full max-w-xl bg-white rounded-sm border border-slate-200 shadow-sm p-8 md:p-10">
      <!-- Saisie du coût travaux -->
      <div v-if="cout === null">
        <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground">Estimez vos aides de rénovation</h1>
        <p class="text-sm text-muted-foreground mt-2">MaPrimeRénov' · CEE · Éco-PTZ — quel est le montant estimé de vos travaux ?</p>
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
          class="mt-4 inline-flex h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 transition-transform disabled:opacity-30"
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
</template>
