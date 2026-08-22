<script setup lang="ts">
import type { Professional } from '~/types/admin'
import { CATEGORY_LABELS } from '~/types/admin'

const props = defineProps<{
  professionals: Professional[]
  isLoading: boolean
  actionLoading: string | null
  expiryDates: Record<string, string>
  uploadState: Record<string, { file: File | null, status: 'idle' | 'uploading' | 'error', error: string }>
}>()

defineEmits<{
  (e: 'approve', proId: string, approved: boolean): void
  (e: 'moderate', proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected'): void
  (e: 'view-doc', fileKey: string): void
  (e: 'update-expiry', key: string, value: string): void
  (e: 'file-select', event: Event, proId: string, docType: 'kbis' | 'decennale'): void
  (e: 'upload-doc', proId: string, docType: 'kbis' | 'decennale'): void
}>()

const searchQuery = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const perPage = 20

const availableCategories = computed(() => {
  const cats = new Set(props.professionals.map(p => p.category).filter(Boolean))
  return [...cats] as string[]
})

const filtered = computed(() => {
  let list = props.professionals

  // Category filter
  if (categoryFilter.value) {
    list = list.filter(p => p.category === categoryFilter.value)
  }

  // Search filter (name, company, email, siret)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      p.company_name?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.siret?.includes(q) ||
      p.phone?.includes(q)
    )
  }

  return list
})

const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

// Reset to page 1 when filters change
watch([searchQuery, categoryFilter], () => {
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
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return pages
})
</script>

<template>
  <!-- Filters bar -->
  <div class="flex items-center gap-3 flex-wrap">
    <!-- Search -->
    <div class="relative flex-1 min-w-[200px] max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Rechercher par nom, entreprise, email, SIRET..."
        class="h-9 w-full pl-9 pr-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>

    <!-- Category -->
    <select
      v-model="categoryFilter"
      class="h-9 px-3 pr-8 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
    >
      <option value="">Toutes catégories</option>
      <option v-for="cat in availableCategories" :key="cat" :value="cat">
        {{ CATEGORY_LABELS[cat] ?? cat }}
      </option>
    </select>

    <!-- Count -->
    <span class="text-xs text-muted-foreground whitespace-nowrap">
      {{ filtered.length }} résultat{{ filtered.length > 1 ? 's' : '' }}
    </span>
  </div>

  <!-- Loading -->
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="filtered.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">
        {{ searchQuery ? 'Aucun résultat pour"' + searchQuery + '"' : 'Aucun professionnel trouvé.' }}
      </p>
    </div>

    <template v-else>
      <!-- Pro cards -->
      <div class="space-y-3">
        <AdminProCard
          v-for="pro in paginated"
          :key="pro.id"
          :pro="pro"
          :action-loading="actionLoading"
          :expiry-dates="expiryDates"
          :upload-state="uploadState"
          @approve="(id, val) => $emit('approve', id, val)"
          @moderate="(id, doc, status) => $emit('moderate', id, doc, status)"
          @view-doc="(key) => $emit('view-doc', key)"
          @update-expiry="(key, val) => $emit('update-expiry', key, val)"
          @file-select="(e, id, doc) => $emit('file-select', e, id, doc)"
          @upload-doc="(id, doc) => $emit('upload-doc', id, doc)"
        />
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
              :class="p === currentPage
                ? 'bg-safety text-white border-safety'
                : 'bg-card border-border text-foreground hover:bg-muted'"
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
