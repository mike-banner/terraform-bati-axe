<script setup lang="ts">
import { PhHouseLine, PhLeaf, PhWrench } from '@phosphor-icons/vue'

const props = defineProps<{ selected?: string }>()

const emit = defineEmits<{
  'select-category': [data: { category: string }]
}>()

const categories = [
  { id: 'renovation_globale', label: 'Rénovation Globale', description: 'Rénovation complète : gros œuvre et second œuvre', icon: PhHouseLine },
  { id: 'renovation_energetique', label: 'Rénovation Énergétique', description: 'Équipements, isolation thermique et énergies renouvelables', icon: PhLeaf },
  { id: 'prestations_ciblees', label: 'Prestations / Rénovation Ciblée', description: 'Intervention spécifique : pièce ou aménagement', icon: PhWrench },
]
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2" role="radiogroup" aria-label="Catégorie de travaux">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      role="radio"
      :aria-checked="props.selected === cat.id"
      :aria-label="cat.label"
      class="bento-card flex flex-col items-start gap-3 p-5 border-2 rounded-sm text-left transition-all min-h-11 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      :class="props.selected === cat.id
        ? 'border-orange-500 bg-orange-50 shadow-md'
        : 'border-border hover:border-foreground/40 hover:bg-muted'"
      @click="emit('select-category', { category: cat.id })"
    >
      <component :is="cat.icon" weight="duotone" :size="36" :class="props.selected === cat.id ? 'text-safety' : 'text-slate-700'" />
      <span class="text-sm font-bold">{{ cat.label }}</span>
      <span class="text-xs text-muted-foreground">{{ cat.description }}</span>
    </button>
  </div>
</template>
