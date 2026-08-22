<script setup lang="ts">
import type { Project } from '~/types/admin'
import { CATEGORY_LABELS, leadAge } from '~/types/admin'

const props = defineProps<{
  projects: Project[]
  isLoading: boolean
}>()

const sortAsc = ref(true)

const sorted = computed(() => {
  return [...props.projects].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sortAsc.value ? diff : -diff
  })
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="projects.length > 0" class="flex items-center justify-between text-xs text-muted-foreground">
      <span>{{ projects.length }} projet(s) — <span class="text-destructive font-medium">{{ projects.filter(p => leadAge(p.created_at).days >= 3).length }} critique(s)</span></span>
      <button
        @click="sortAsc = !sortAsc"
        class="flex items-center gap-1.5 h-8 px-3 bg-card border border-border rounded-sm hover:bg-muted transition-colors font-medium text-foreground"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M7 12h10M11 17h2" />
        </svg>
        {{ sortAsc ? 'Plus anciens d\'abord' : 'Plus récents d\'abord' }}
      </button>
    </div>

    <div v-if="projects.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucun projet trouvé.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="project in sorted"
        :key="project.id"
        class="bg-card border rounded-sm overflow-hidden transition-colors"
        :class="leadAge(project.created_at).days >= 3 ? 'border-destructive/30' : 'border-border'"
      >
        <div class="flex items-start justify-between gap-4 px-5 py-4">
          <div class="space-y-1 flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="project.category" class="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                {{ CATEGORY_LABELS[project.category] ?? project.category }}
              </span>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full border"
                :class="project.status === 'qualified' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'"
              >
                {{ project.status === 'qualified' ? 'Qualifié' : 'En attente' }}
              </span>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full border"
                :class="leadAge(project.created_at).cls"
              >
                {{ leadAge(project.created_at).days >= 3 ? '⚠ ' : '' }}{{ leadAge(project.created_at).label }}
              </span>
              <span v-if="project.lead_count > 0" class="text-xs px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-400 bg-sky-500/10">
                {{ project.lead_count }} intéressé{{ project.lead_count > 1 ? 's' : '' }}
              </span>
            </div>
            <p v-if="project.description" class="text-sm text-foreground line-clamp-2">{{ project.description }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span v-if="project.budget_range">Budget : {{ project.budget_range }}</span>
              <span v-if="project.timeline_range">Délai : {{ project.timeline_range }}</span>
              <span>Reçu le {{ new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
