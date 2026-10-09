<script setup lang="ts">
import { computed, ref } from 'vue'
import { COMPATIBILITY_MATRIX, ENERGY_ITEMS, hasEnergyItems, isEgbReserved } from '~/utils/workTypeMatrix'

const props = defineProps<{
  selectedCategory: string
  /** Postes déjà sélectionnés (état porté par le parent) */
  selectedItems: string[]
}>()

const emit = defineEmits<{
  'update:selectedItems': [items: string[]]
}>()

const GROS_OEUVRE = ['maconnerie', 'charpente_couverture', 'menuiserie_ext']
const SECOND_OEUVRE = ['isolation_platrerie', 'menuiserie_int', 'plomberie_sanitaire', 'revetement_sol', 'peinture_finitions', 'electricite']
const PRESTATIONS = ['salle_de_bain', 'cuisine', 'toiture', 'facade', 'extension', 'surelevation', 'combles', 'demolition', 'terrasse', 'cloture_portail', 'assainissement']

// Case opt-in « rénovation énergétique » : état local, le composant est remonté à chaque retour à l'étape 2
// ponytail: une case cochée sans poste n'est pas mémorisée au retour arrière (sans effet sur payload/fork)
const OPT_IN_CATEGORIES = ['renovation_globale', 'prestations_ciblees']
const showEnergyOptIn = computed(() => OPT_IN_CATEGORIES.includes(props.selectedCategory))
const energyOptIn = ref(hasEnergyItems(props.selectedItems))

type Block = { title?: string; items: string[]; id?: string; optIn?: boolean }

// Blocs affichés selon la catégorie ; la case opt-in est rendue à la fin du dernier bloc principal
const blocks = computed<Block[]>(() => {
  let main: Block[] = []
  if (props.selectedCategory === 'renovation_globale') {
    main = [{ title: 'Gros Œuvre', items: GROS_OEUVRE }, { title: 'Second Œuvre', items: SECOND_OEUVRE }]
  } else if (props.selectedCategory === 'renovation_energetique') return [{ title: 'Rénovation énergétique', items: [...ENERGY_ITEMS] }]
  else if (props.selectedCategory === 'prestations_ciblees') main = [{ title: 'Rénovation ciblée', items: PRESTATIONS }]
  if (!main.length) return []
  main[main.length - 1]!.optIn = true
  return energyOptIn.value ? [...main, { title: 'Rénovation énergétique', items: [...ENERGY_ITEMS], id: 'bloc-energie' }] : main
})

function toggleEnergyOptIn(checked: boolean) {
  energyOptIn.value = checked
  if (!checked) emit('update:selectedItems', props.selectedItems.filter(i => !(ENERGY_ITEMS as readonly string[]).includes(i)))
}

function toggle(id: string) {
  const next = props.selectedItems.includes(id)
    ? props.selectedItems.filter(i => i !== id)
    : [...props.selectedItems, id]
  emit('update:selectedItems', next)
}

// Postes réservés aux entreprises générales (pac, géothermie, photovoltaïque, démolition, assainissement)
const reservedLabels = computed(() =>
  props.selectedItems.filter(isEgbReserved).map(i => COMPATIBILITY_MATRIX[i]!.label))
</script>

<template>
  <div class="space-y-6 pt-2">
    <div
      v-if="reservedLabels.length"
      role="status"
      class="p-3 text-sm rounded-sm border border-yellow-300 bg-yellow-50 text-yellow-900"
    >
      {{ reservedLabels.join(', ') }} : ces travaux nécessitent une coordination. Nous vous proposerons une entreprise générale du bâtiment.
    </div>

    <div
      v-for="(block, i) in blocks"
      :id="block.id"
      :key="i"
      :class="block.id ? 'mt-8 pt-6 border-t-2 border-orange-200' : ''"
    >
      <h2 v-if="block.title" class="text-base font-bold mb-3" :class="block.id ? 'text-orange-600 uppercase tracking-wide' : ''">{{ block.title }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label
          v-for="id in block.items"
          :key="id"
          class="flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-colors min-h-11 focus-within:ring-2 focus-within:ring-orange-500"
          :class="selectedItems.includes(id)
            ? 'border-orange-500 bg-orange-50 text-slate-900'
            : 'border-border hover:border-foreground/40 hover:bg-muted'"
        >
          <input
            type="checkbox"
            class="accent-safety w-4 h-4 shrink-0"
            :checked="selectedItems.includes(id)"
            @change="toggle(id)"
          />
          <span class="text-sm font-semibold">{{ COMPATIBILITY_MATRIX[id]?.label }}</span>
        </label>
      </div>
      <label
        v-if="block.optIn && showEnergyOptIn"
        class="flex items-center gap-3 p-3 mt-3 border border-dashed rounded-sm cursor-pointer min-h-11 focus-within:ring-2 focus-within:ring-orange-500"
      >
        <input
          type="checkbox"
          class="accent-safety w-4 h-4 shrink-0"
          :checked="energyOptIn"
          aria-controls="bloc-energie"
          :aria-expanded="energyOptIn"
          @change="toggleEnergyOptIn(($event.target as HTMLInputElement).checked)"
        />
        <span class="text-sm font-semibold">J’envisage aussi de la rénovation énergétique</span>
      </label>
    </div>
  </div>
</template>
