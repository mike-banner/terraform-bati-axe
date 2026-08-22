<script setup lang="ts">
import type { Realisation } from '~/types/admin'

defineProps<{
  realisations: Realisation[]
  isLoading: boolean
  actionLoading: string | null
}>()

defineEmits<{
  (e: 'toggle-showcase', projectId: string, isShowcased: boolean): void
}>()
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="realisations.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucune réalisation pour l'instant.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="realisation in realisations"
        :key="realisation.id"
        class="bg-card border border-border rounded-sm overflow-hidden"
      >
        <div class="flex items-center justify-between gap-4 px-5 py-4">
          <div class="space-y-1 flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-bold text-foreground">{{ realisation.title }}</span>
              <span v-if="realisation.city" class="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                {{ realisation.city }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground">{{ realisation.professionals?.company_name }}</p>
          </div>
          <label class="flex items-center gap-2 shrink-0 cursor-pointer select-none">
            <span class="text-xs font-medium text-muted-foreground">En avant</span>
            <input
              type="checkbox"
              :checked="realisation.is_showcased"
              :disabled="actionLoading === `${realisation.id}-showcase`"
              @change="$emit('toggle-showcase', realisation.id, ($event.target as HTMLInputElement).checked)"
              class="h-5 w-5 rounded border-border text-safety focus:ring-safety accent-[#F97316] disabled:opacity-40"
            />
          </label>
        </div>
      </div>
    </div>
  </template>
</template>
