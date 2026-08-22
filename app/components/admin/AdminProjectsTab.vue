<script setup lang="ts">
import type { Project } from '~/types/admin'
import { CATEGORY_LABELS, leadAge } from '~/types/admin'

const props = defineProps<{
  projects: Project[]
  isLoading: boolean
}>()

const searchQuery = ref('')
const sortKey = ref<'date' | 'age' | 'leads' | 'budget'>('date')
const sortAsc = ref(false)
const currentPage = ref(1)
const perPage = 20
const expandedProjectId = ref<string | null>(null)

type SortKey = typeof sortKey.value

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date de réception' },
  { key: 'age', label: 'Ancienneté' },
  { key: 'leads', label: "Nombre d'intéressés" },
  { key: 'budget', label: 'Budget' },
]

const BUDGET_ORDER: Record<string, number> = {
  '< 10k': 1, '10k - 30k': 2, '30k - 80k': 3, '80k - 200k': 4, '> 200k': 5,
}

const filtered = computed(() => {
  let list = props.projects

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.budget_range?.toLowerCase().includes(q) ||
      p.timeline_range?.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.customer_phone?.includes(q) ||
      p.postal_code?.includes(q)
    )
  }

  return list
})

const sorted = computed(() => {
  return [...filtered.value].sort((a, b) => {
    let diff = 0
    switch (sortKey.value) {
      case 'date':
        diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'age':
        diff = leadAge(a.created_at).days - leadAge(b.created_at).days
        break
      case 'leads':
        diff = (a.lead_count || 0) - (b.lead_count || 0)
        break
      case 'budget':
        diff = (BUDGET_ORDER[a.budget_range || ''] || 0) - (BUDGET_ORDER[b.budget_range || ''] || 0)
        break
    }
    return sortAsc.value ? diff : -diff
  })
})

const totalPages = computed(() => Math.ceil(sorted.value.length / perPage))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return sorted.value.slice(start, start + perPage)
})

watch([searchQuery, sortKey, sortAsc], () => {
  currentPage.value = 1
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

const criticalCount = computed(() => filtered.value.filter(p => leadAge(p.created_at).days >= 3).length)

function toggleExpand(id: string) {
  expandedProjectId.value = expandedProjectId.value === id ? null : id
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}
</script>

<template>
  <!-- Filters bar -->
  <div class="flex items-center gap-3 flex-wrap">
    <div class="relative flex-1 min-w-[200px] max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Nom, email, description, catégorie, code postal..."
        class="h-9 w-full pl-9 pr-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>

    <div class="flex items-center gap-1.5">
      <select
        v-model="sortKey"
        class="h-9 px-3 pr-8 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      >
        <option v-for="opt in SORT_OPTIONS" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
      </select>
      <button
        @click="sortAsc = !sortAsc"
        class="h-9 w-9 flex items-center justify-center border border-border rounded-sm bg-card text-foreground hover:bg-muted transition-colors"
        :title="sortAsc ? 'Croissant' : 'Décroissant'"
      >
        <svg class="w-4 h-4 transition-transform" :class="sortAsc ? '' : 'rotate-180'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"/>
        </svg>
      </button>
    </div>

    <span class="text-xs text-muted-foreground whitespace-nowrap">
      {{ filtered.length }} projet{{ filtered.length > 1 ? 's' : '' }}
      <span v-if="criticalCount > 0" class="text-destructive font-medium"> · {{ criticalCount }} critique{{ criticalCount > 1 ? 's' : '' }}</span>
    </span>
  </div>

  <!-- Loading -->
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="filtered.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">
        {{ searchQuery ? 'Aucun résultat pour "' + searchQuery + '"' : 'Aucun projet trouvé.' }}
      </p>
    </div>

    <template v-else>
      <div class="space-y-2">
        <div
          v-for="project in paginated"
          :key="project.id"
          class="bg-card border rounded-sm overflow-hidden transition-all cursor-pointer"
          :class="[
            leadAge(project.created_at).days >= 3 ? 'border-destructive/30' : 'border-border',
            expandedProjectId === project.id ? 'ring-1 ring-safety/20' : ''
          ]"
          @click="toggleExpand(project.id)"
        >
          <!-- Collapsed row -->
          <div class="flex items-center gap-4 px-5 py-3.5">
            <!-- Status indicator -->
            <div class="w-2 h-2 rounded-full shrink-0" :class="leadAge(project.created_at).days >= 3 ? 'bg-red-400' : 'bg-emerald-400'" />

            <!-- Main info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-foreground truncate">{{ project.customer_name }}</span>
                <span v-if="project.category" class="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/30">
                  {{ CATEGORY_LABELS[project.category] ?? project.category }}
                </span>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  :class="project.status === 'qualified' ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15' : 'border-amber-400/50 text-amber-200 bg-amber-500/20'"
                >
                  {{ project.status === 'qualified' ? 'Qualifié' : 'En attente' }}
                </span>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  :class="leadAge(project.created_at).cls"
                >
                  {{ leadAge(project.created_at).days >= 3 ? '⚠ ' : '' }}{{ leadAge(project.created_at).label }}
                </span>
                <span v-if="project.lead_count > 0" class="text-[11px] px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/15">
                  {{ project.lead_count }} intéressé{{ project.lead_count > 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <!-- Meta -->
            <div class="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
              <span v-if="project.budget_range">{{ project.budget_range }}</span>
              <span>{{ timeAgo(project.created_at) }}</span>
            </div>

            <!-- Expand arrow -->
            <svg class="w-4 h-4 text-muted-foreground shrink-0 transition-transform" :class="expandedProjectId === project.id ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </div>

          <!-- Expanded detail -->
          <div v-if="expandedProjectId === project.id" class="border-t border-border px-5 py-4 space-y-3 bg-muted/20">
            <!-- Customer info -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Demandeur</p>
                <p class="text-sm font-medium text-foreground">{{ project.customer_name }}</p>
              </div>
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                <a :href="`mailto:${project.customer_email}`" class="text-sm text-safety hover:underline" @click.stop>{{ project.customer_email }}</a>
              </div>
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Téléphone</p>
                <a :href="`tel:${project.customer_phone}`" class="text-sm text-foreground hover:text-safety transition-colors" @click.stop>{{ project.customer_phone }}</a>
              </div>
            </div>

            <!-- Project details -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div v-if="project.postal_code">
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Code postal</p>
                <p class="text-sm text-foreground">{{ project.postal_code }}</p>
              </div>
              <div v-if="project.budget_range">
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Budget</p>
                <p class="text-sm text-foreground">{{ project.budget_range }}</p>
              </div>
              <div v-if="project.timeline_range">
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Délai</p>
                <p class="text-sm text-foreground">{{ project.timeline_range }}</p>
              </div>
            </div>

            <!-- Description -->
            <div v-if="project.description">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Description</p>
              <p class="text-sm text-foreground leading-relaxed">{{ project.description }}</p>
            </div>

            <!-- Date -->
            <p class="text-xs text-muted-foreground">
              Reçu le {{ new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between pt-4">
        <p class="text-xs text-muted-foreground">
          Page {{ currentPage }} / {{ totalPages }}
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="h-8 px-2 text-xs font-medium border border-border rounded-sm bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <template v-for="(p, i) in pageNumbers" :key="i">
            <span v-if="p === '...'" class="px-1.5 text-xs text-muted-foreground">…</span>
            <button
              v-else
              @click="currentPage = p"
              class="h-8 min-w-8 px-2 text-xs font-medium rounded-sm border transition-colors"
              :class="p === currentPage ? 'bg-safety text-white border-safety' : 'bg-card border-border text-foreground hover:bg-muted'"
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="h-8 px-2 text-xs font-medium border border-border rounded-sm bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    </template>
  </template>
</template>
