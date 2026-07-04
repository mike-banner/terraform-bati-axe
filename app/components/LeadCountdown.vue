<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ unlockedAt: string }>()

const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => { now.value = Date.now() }, 60000)
})
onUnmounted(() => { if (interval) clearInterval(interval) })

const remaining = computed(() => Math.max(0, new Date(props.unlockedAt).getTime() - now.value))
const hours     = computed(() => Math.floor(remaining.value / 3600000))
const minutes   = computed(() => Math.floor((remaining.value % 3600000) / 60000))
</script>

<template>
  <div class="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-1 px-2.5 py-1 rounded-full border border-slate-200 bg-white">
    <svg class="w-3.5 h-3.5 shrink-0 text-safety" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span>Disponible dans <span class="font-semibold text-slate-900">{{ hours }}h {{ minutes }}min</span></span>
  </div>
</template>
