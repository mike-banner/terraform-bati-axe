<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const props = withDefaults(defineProps<{
  coutTravauxMin: number
  coutTravauxMax: number
  codePostalInitial?: string
  surface?: number
}>(), { codePostalInitial: '', surface: 0 })

const emit = defineEmits<{
  (e: 'complete', p: { aides_estimees: number; reste_a_charge_min: number; reste_a_charge_max: number }): void
  (e: 'skip'): void
}>()

// ─── Options (label FR + valeur API Publicodes) ───────────────────────────────
const logementTypes = [
  { id: 'maison', label: 'Maison' },
  { id: 'appartement', label: 'Appartement' },
]

// ponytail: valeurs Publicodes exactes à re-valider (la recherche n'a pas épinglé ce champ).
const periodesConstruction = [
  { id: 'avant_1948', label: 'Avant 1948' },
  { id: '1948_1974', label: '1948 – 1974' },
  { id: '1975_1977', label: '1975 – 1977' },
  { id: '1978_1996', label: '1978 – 1996' },
  { id: 'apres_1996', label: 'Après 1996' },
]

// ponytail: valeur 'locataire' à re-valider.
const statutsProprietaire = [
  { id: 'proprietaire', label: 'Propriétaire' },
  { id: 'locataire', label: 'Locataire' },
]

// 'modeste' confirmé par la recherche, les deux autres à re-valider.
const revenusClasses = [
  { id: 'modeste', label: 'Modeste' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'superieure', label: 'Supérieure' },
]

// ─── State ────────────────────────────────────────────────────────────────────
const step = ref(1) // 1 = logement, 2 = foyer/revenu, 3 = résultat
const form = reactive({
  logement_type: '',
  periode_construction: '',
  statut_proprietaire: '',
  surface: props.surface ?? 0,
  revenu_classe: '',
  code_postal: props.codePostalInitial,
})
const result = ref<null | { aides_total: number; reste_a_charge_min: number; reste_a_charge_max: number }>(null)
const unavailable = ref(false)
const isLoading = ref(false)

const hasSurface = computed(() => (props.surface ?? 0) > 0)

const isStepValid = computed(() => {
  if (step.value === 1) {
    return !!form.logement_type && !!form.periode_construction && !!form.statut_proprietaire && form.surface > 0
  }
  return !!form.revenu_classe && /^\d{5}$/.test(form.code_postal)
})

const formatEuro = (n: number) => n.toLocaleString('fr-FR') + ' €'

const normalizePostalCode = (e: Event) => {
  form.code_postal = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 5)
}

const next = () => { if (step.value < 3 && isStepValid.value) step.value++ }
const prev = () => { if (step.value > 1) step.value-- }
const skip = () => emit('skip')

const submit = async () => {
  if (!isStepValid.value || isLoading.value) return
  isLoading.value = true
  try {
    const res = await $fetch<{ ok: boolean; aides_total?: number; reste_a_charge_min?: number; reste_a_charge_max?: number }>('/api/v1/aides-reno', {
      method: 'POST',
      body: {
        situation: {
          revenu_classe: form.revenu_classe,
          logement_type: form.logement_type,
          statut_proprietaire: form.statut_proprietaire,
          periode_construction: form.periode_construction,
          surface: form.surface,
          code_postal: form.code_postal,
        },
        cout_travaux_min: props.coutTravauxMin,
        cout_travaux_max: props.coutTravauxMax,
      },
    })

    if (res?.ok && res.aides_total != null) {
      result.value = {
        aides_total: res.aides_total,
        reste_a_charge_min: res.reste_a_charge_min ?? 0,
        reste_a_charge_max: res.reste_a_charge_max ?? 0,
      }
      step.value = 3
    } else {
      unavailable.value = true
    }
  } catch {
    unavailable.value = true
  } finally {
    isLoading.value = false
  }
}

// Émis au clic sur « Continuer » du résultat (le parent stocke puis mène au lead wall).
const finish = () => {
  if (!result.value) return
  emit('complete', {
    aides_estimees: result.value.aides_total,
    reste_a_charge_min: result.value.reste_a_charge_min,
    reste_a_charge_max: result.value.reste_a_charge_max,
  })
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header + progression (masqué sur le résultat) -->
    <div v-if="step < 3 && !unavailable">
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs text-muted-foreground">Étape {{ step }} / 2</span>
        <button type="button" @click="skip" class="text-xs text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
      </div>
      <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-safety transition-all duration-300 ease-out" :style="{ width: `${((step - 1) / 2) * 100}%` }" />
      </div>
    </div>

    <!-- ─── Étape 1 : Votre logement ─────────────────────────────────────────── -->
    <div v-if="step === 1" class="space-y-4">
      <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">Votre logement</h1>

      <div>
        <p class="text-sm font-semibold text-foreground mb-1.5">Type de logement</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="t in logementTypes"
            :key="t.id"
            type="button"
            @click="form.logement_type = t.id"
            class="bento-card min-h-10 flex items-center justify-between px-3 py-2.5 border rounded-sm text-left transition-colors"
            :class="form.logement_type === t.id ? 'border-orange-500 bg-orange-50 text-slate-900' : 'border-border hover:border-foreground/40 hover:bg-muted'"
          >
            <span class="text-sm font-semibold">{{ t.label }}</span>
            <svg v-if="form.logement_type === t.id" class="w-4 h-4 shrink-0 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </button>
        </div>
      </div>

      <div>
        <p class="text-sm font-semibold text-foreground mb-1.5">Période de construction</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="p in periodesConstruction"
            :key="p.id"
            type="button"
            @click="form.periode_construction = p.id"
            class="bento-card min-h-10 flex items-center justify-center px-3 py-2.5 border rounded-sm text-center transition-colors"
            :class="form.periode_construction === p.id ? 'border-orange-500 bg-orange-50 text-slate-900' : 'border-border hover:border-foreground/40 hover:bg-muted'"
          >
            <span class="text-sm font-semibold">{{ p.label }}</span>
          </button>
        </div>
      </div>

      <div>
        <p class="text-sm font-semibold text-foreground mb-1.5">Vous êtes</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="s in statutsProprietaire"
            :key="s.id"
            type="button"
            @click="form.statut_proprietaire = s.id"
            class="bento-card min-h-10 flex items-center px-3 py-2.5 border rounded-sm text-left transition-colors"
            :class="form.statut_proprietaire === s.id ? 'border-orange-500 bg-orange-50 text-slate-900' : 'border-border hover:border-foreground/40 hover:bg-muted'"
          >
            <span class="text-sm font-semibold">{{ s.label }}</span>
          </button>
        </div>
      </div>

      <div v-if="!hasSurface">
        <label for="aid-surface" class="block text-sm font-medium text-foreground mb-1.5">Surface du logement (m²)</label>
        <input
          id="aid-surface"
          type="number"
          v-model.number="form.surface"
          min="1"
          max="10000"
          step="1"
          inputmode="numeric"
          placeholder="100"
          class="w-32 h-10 px-3 border border-border rounded-sm text-base font-semibold bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
        />
      </div>
    </div>

    <!-- ─── Étape 2 : Votre foyer & revenus ──────────────────────────────────── -->
    <div v-else-if="step === 2" class="space-y-5">
      <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">Votre foyer & revenus</h1>
      <p class="text-sm text-muted-foreground">Ces informations servent uniquement à estimer vos aides MaPrimeRénov' / CEE / Éco-PTZ.</p>


      <div>
        <p class="text-sm font-semibold text-foreground mb-2">Revenu du foyer</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="r in revenusClasses"
            :key="r.id"
            type="button"
            @click="form.revenu_classe = r.id"
            class="bento-card min-h-11 flex items-center justify-center p-3 border rounded-sm text-center transition-colors"
            :class="form.revenu_classe === r.id ? 'border-orange-500 bg-orange-50 text-slate-900' : 'border-border hover:border-foreground/40 hover:bg-muted'"
          >
            <span class="text-sm font-semibold">{{ r.label }}</span>
          </button>
        </div>
      </div>

      <div>
        <label for="aid-cp" class="block text-sm font-medium text-foreground mb-1.5">Code postal du logement</label>
        <input
          id="aid-cp"
          type="text"
          v-model="form.code_postal"
          placeholder="78955"
          maxlength="5"
          minlength="5"
          pattern="[0-9]{5}"
          inputmode="numeric"
          @input="normalizePostalCode"
          class="w-full h-11 px-3 border border-border rounded-sm text-base font-semibold tracking-widest bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
        />
      </div>
    </div>

    <!-- ─── Étape 3 : Résultat ───────────────────────────────────────────────── -->
    <div v-else-if="step === 3 && result" class="space-y-6">
      <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">Vos aides estimées</h1>

      <div class="space-y-3">
        <div class="p-5 border border-slate-200 bg-slate-50 rounded-sm">
          <p class="text-xs text-muted-foreground mb-1">Aides estimées</p>
          <p class="text-2xl font-black text-safety">{{ formatEuro(result.aides_total) }}</p>
        </div>
        <div class="p-5 border border-slate-200 bg-slate-50 rounded-sm">
          <p class="text-xs text-muted-foreground mb-1">Reste à charge estimé</p>
          <p class="text-2xl font-black text-foreground">{{ formatEuro(result.reste_a_charge_min) }} – {{ formatEuro(result.reste_a_charge_max) }}</p>
        </div>
        <p class="text-xs text-slate-500">Estimation indicative basée sur les barèmes d'État en vigueur. Un artisan certifié vous confirmera les montants exacts.</p>
      </div>
    </div>

    <!-- ─── Fallback (API indisponible) ──────────────────────────────────────── -->
    <div v-else-if="unavailable" class="space-y-5">
      <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">Calcul indisponible</h1>
      <p class="text-sm text-muted-foreground">Le calcul des aides est temporairement indisponible. Vous pouvez continuer sans.</p>
      <button
        type="button"
        @click="skip"
        class="inline-flex items-center justify-center h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform"
      >Continuer sans les aides</button>
    </div>

    <!-- ─── Navigation bas de tunnel ─────────────────────────────────────────── -->
    <div v-if="!unavailable" class="pt-5 border-t border-border flex items-center justify-between">
      <button
        v-if="step === 2"
        type="button"
        @click="prev"
        class="inline-flex items-center gap-1.5 h-10 px-4 border border-border text-sm font-medium text-foreground rounded-sm hover:bg-muted transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Retour
      </button>
      <button
        v-else-if="step === 1"
        type="button"
        @click="skip"
        class="inline-flex items-center gap-1.5 h-10 px-4 border border-border text-sm font-medium text-foreground rounded-sm hover:bg-muted transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Retour
      </button>
      <button
        v-else-if="step === 3"
        type="button"
        @click="step = 2"
        class="inline-flex items-center gap-1.5 h-10 px-4 border border-border text-sm font-medium text-foreground rounded-sm hover:bg-muted transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Retour
      </button>

      <button
        v-if="step === 1"
        type="button"
        @click="next"
        :disabled="!isStepValid"
        class="inline-flex items-center gap-1.5 h-10 px-5 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-30 disabled:pointer-events-none"
      >
        Suivant
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>

      <button
        v-else-if="step === 2"
        type="button"
        @click="submit"
        :disabled="!isStepValid || isLoading"
        class="inline-flex items-center gap-2 h-10 px-5 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <span>{{ isLoading ? 'Calcul en cours…' : 'Voir mes aides' }}</span>
      </button>

      <button
        v-else-if="step === 3"
        type="button"
        @click="finish"
        class="inline-flex items-center gap-1.5 h-10 px-5 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform"
      >
        Continuer
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>
