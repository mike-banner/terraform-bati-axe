<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })

interface Lead {
  id: string; status: string; unlocked_at: string | null; created_at: string
  category?: string; budget_range?: string; timeline_range?: string
  description?: string; customer_name?: string; customer_phone?: string
  customer_email?: string; postal_code?: string
  projects?: { category: string; budget_range: string }
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie',
  toiture:      'Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie',
  peinture:     'Peinture',
  isolation:    'Isolation',
}

const user = useSupabaseUser()
useHead({ title: 'Leads — BÂTI-AXE' })

watchEffect(() => {
  if (user.value === null) navigateTo('/pro/claim')
})

const leads        = ref<Lead[]>([])
const leadsLoading = ref(false)
const leadsLoaded  = ref(false)

async function loadLeads() {
  if (leadsLoaded.value) return
  leadsLoading.value = true
  try {
    const res = await $fetch<{ leads: Lead[] }>('/api/v1/leads')
    leads.value = res.leads ?? []
  } catch (e) {
    console.error('[leads] leads fetch:', e)
  } finally {
    leadsLoading.value = false
    leadsLoaded.value  = true
  }
}

onMounted(() => {
  loadLeads()
})

function leadCategory(lead: Lead): string {
  const cat = lead.category || lead.projects?.category || ''
  return CATEGORY_LABELS[cat] || cat
}

function leadStatusLabel(status: string): { label: string; cls: string } {
  if (status === 'unlocked') return { label: 'Déverrouillé', cls: 'text-foreground border-foreground/30' }
  if (status === 'claimed')  return { label: 'Pris', cls: 'text-muted-foreground border-border' }
  return { label: 'Verrouillé', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
}

function timeUntilUnlock(unlocked_at: string | null): string {
  if (!unlocked_at) return ''
  const diff = new Date(unlocked_at).getTime() - Date.now()
  if (diff <= 0) return 'Déverrouillage imminent'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `Déverrouillage dans ${h}h${m > 0 ? m + 'min' : ''}`
  return `Déverrouillage dans ${m} min`
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <h1 class="text-3xl font-black tracking-tight text-foreground mb-8">Leads</h1>

    <!-- Loading -->
    <div v-if="leadsLoading" class="py-12 flex justify-center">
      <svg class="w-5 h-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="leadsLoaded && leads.length === 0" class="py-12 text-center">
      <p class="text-sm text-muted-foreground">Aucun lead disponible pour le moment.</p>
      <p class="text-xs text-muted-foreground mt-1">Vous serez notifié dès qu'un chantier correspond à votre activité.</p>
    </div>

    <!-- Lead cards -->
    <div v-else-if="leads.length" class="space-y-3">
      <div
        v-for="lead in leads"
        :key="lead.id"
        class="border border-border rounded-lg p-5"
      >
        <!-- Top row: category + status -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {{ leadCategory(lead) }}
          </span>
          <span
            class="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border"
            :class="leadStatusLabel(lead.status).cls"
          >
            {{ leadStatusLabel(lead.status).label }}
          </span>
        </div>

        <!-- Budget + postal -->
        <div class="flex items-center gap-4 mb-2">
          <p v-if="lead.budget_range" class="text-sm font-semibold text-foreground">{{ lead.budget_range }}</p>
          <p v-if="lead.postal_code && lead.status === 'unlocked'" class="text-sm text-muted-foreground">{{ lead.postal_code }}</p>
        </div>

        <!-- Description (unlocked) -->
        <p v-if="lead.description" class="text-sm text-muted-foreground mb-3 line-clamp-2">{{ lead.description }}</p>

        <!-- Customer info (unlocked) -->
        <div v-if="lead.status === 'unlocked'" class="pt-3 border-t border-border space-y-1">
          <p class="text-sm font-medium text-foreground">{{ lead.customer_name }}</p>
          <p class="text-xs text-muted-foreground">{{ lead.customer_phone }} · {{ lead.customer_email }}</p>
        </div>

        <!-- Unlock countdown (locked) -->
        <p v-if="lead.status === 'locked' && lead.unlocked_at" class="text-xs text-amber-700 mt-2">
          {{ timeUntilUnlock(lead.unlocked_at) }}
        </p>

        <!-- Date -->
        <p class="text-xs text-muted-foreground mt-3">
          Reçu le {{ new Date(lead.created_at).toLocaleDateString('fr-FR') }}
        </p>
      </div>
    </div>
  </div>
</template>
