<script setup lang="ts">
// Barre de progression d'upload réutilisable (logo, documents…).
// Présentationnel uniquement : la logique (compression, PUT XHR) reste côté appelant.
withDefaults(defineProps<{
  stage?: 'compress' | 'upload'
  progress?: number
  label?: string
}>(), {
  stage: 'upload',
  progress: 0,
  label: '',
})
</script>

<template>
  <div class="w-56 max-w-full" role="status" aria-live="polite">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        {{ label || (stage === 'compress' ? 'Compression…' : 'Téléchargement…') }}
      </span>
      <span v-if="stage === 'upload'" class="text-xs font-semibold text-foreground tabular-nums">{{ progress }}%</span>
    </div>
    <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-safety rounded-full transition-all duration-200"
        :class="stage === 'compress' ? 'animate-pulse w-1/3' : ''"
        :style="stage === 'upload' ? { width: progress + '%' } : undefined"
      />
    </div>
  </div>
</template>
