<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Indicateur de fraîcheur d'un lead : pousse le pro à contacter vite.
// Le ton « chauffe » à mesure que le lead vieillit (neutre → ambre → rouge).
const props = defineProps<{ createdAt: string }>()

const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => { now.value = Date.now() }, 60000)
})
onUnmounted(() => { if (interval) clearInterval(interval) })

const ageMinutes = computed(() =>
  Math.max(0, Math.floor((now.value - new Date(props.createdAt).getTime()) / 60000))
)

const label = computed(() => {
  const mins = ageMinutes.value
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
})

// fresh < 24 h · recent < 3 j · stale < 7 j · old ≥ 7 j
const tone = computed(() => {
  const hours = ageMinutes.value / 60
  if (hours < 24) return 'fresh'
  if (hours < 72) return 'recent'
  if (hours < 168) return 'stale'
  return 'old'
})

const isFresh = computed(() => tone.value === 'fresh')

const toneClass = computed(() => ({
  fresh:  'text-emerald-700 bg-emerald-50 border-emerald-200',
  recent: 'text-muted-foreground bg-muted border-border',
  stale:  'text-amber-700 bg-amber-50 border-amber-300',
  old:    'text-red-700 bg-red-50 border-red-300',
}[tone.value]))
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 border rounded-full"
    :class="toneClass"
    :title="`Reçu ${label}`"
  >
    <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span>{{ isFresh ? 'Nouveau · ' : '' }}{{ label }}</span>
  </span>
</template>
