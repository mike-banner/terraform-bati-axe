<script setup lang="ts">
import { computed } from 'vue'
import { COMPATIBILITY_MATRIX } from '~/utils/workTypeMatrix'

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
const ENERGETIQUE = ['pac', 'chaudiere_reno', 'borne_irve', 'vmc_chauffage', 'isolation_ite_iti', 'geothermie', 'poele_bois_granules', 'photovoltaique', 'menuiserie_ext_rge']
const PRESTATIONS = ['salle_de_bain', 'cuisine', 'toiture', 'facade', 'extension', 'surelevation', 'combles', 'demolition', 'terrasse', 'cloture_portail', 'assainissement']

// Blocs affichés selon la catégorie (un seul bloc, sauf rénovation globale)
const blocks = computed<{ title?: string; items: string[] }[]>(() => {
  if (props.selectedCategory === 'renovation_globale') {
    return [{ title: 'Gros Œuvre', items: GROS_OEUVRE }, { title: 'Second Œuvre', items: SECOND_OEUVRE }]
  }
  if (props.selectedCategory === 'renovation_energetique') return [{ items: ENERGETIQUE }]
  if (props.selectedCategory === 'prestations_ciblees') return [{ items: PRESTATIONS }]
  return []
})

function toggle(id: string) {
  const next = props.selectedItems.includes(id)
    ? props.selectedItems.filter(i => i !== id)
    : [...props.selectedItems, id]
  emit('update:selectedItems', next)
}

// Postes sans spécialiste (PAC, géothermie, photovoltaïque) : on prévient qu'une entreprise générale sera proposée
const needsCoordinator = computed(() =>
  props.selectedCategory === 'renovation_energetique'
  && props.selectedItems.length > 0
  && props.selectedItems.every(i => COMPATIBILITY_MATRIX[i]?.defaultRole === 'entreprise_generale'),
)
</script>

<template>
  <div class="space-y-6 pt-2">
    <div
      v-if="needsCoordinator"
      role="status"
      class="p-3 text-sm rounded-sm border border-yellow-300 bg-yellow-50 text-yellow-900"
    >
      Certains équipements nécessitent une coordination — nous vous proposerons une entreprise générale.
    </div>

    <div v-for="(block, i) in blocks" :key="i">
      <h2 v-if="block.title" class="text-base font-bold mb-3">{{ block.title }}</h2>
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
    </div>
  </div>
</template>
