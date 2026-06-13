<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'Mes leads — BÂTI-AXE' })

useRequireAuth()

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie & Gros Œuvre',
  toiture:      'Charpente & Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie & Chauffage',
  peinture:     'Peinture & Finitions',
  isolation:    'Isolation & Cloisons',
}

const { data: leadsData, pending, error, refresh } = await useAsyncData('pro-leads', () =>
  $fetch<{ leads: any[], isPremium: boolean }>('/api/v1/leads')
)

const { data: profile } = await useAsyncData('pro-profile-leads', () =>
  $fetch<{ profile: any }>('/api/v1/pro/profile/me').then(r => r.profile).catch(() => null)
)

const { data: marketData } = await useAsyncData('market-local', () =>
  $fetch<{ data: any }>('/api/v1/market-local').then(r => r.data).catch(() => null)
)

const leads = computed(() => leadsData.value?.leads || [])
const isPremium = computed(() => leadsData.value?.isPremium ?? false)
const freeLeadsUsed = computed(() => profile.value?.free_leads_used ?? 0)
const freeRemaining = computed(() => Math.max(0, 3 - freeLeadsUsed.value))
const hasLockedUnfreeLead = computed(() => leads.value.some((l: any) => l.status === 'locked'))
const showFreeLeadsBanner = computed(() => !isPremium.value && freeLeadsUsed.value < 3)
const showPaywallBanner = computed(() => !isPremium.value && freeLeadsUsed.value >= 3 && hasLockedUnfreeLead.value)

// ─── Filtre + pagination ───────────────────────────────────────────────────────
const PAGE_SIZE = 5
const categoryFilter = ref('')
// Tri par défaut : 'urgent' = les plus anciens (donc les plus critiques) en haut,
// pour qu'aucun lead ne se perde en bas de liste. Le pro peut basculer.
const sortMode = ref<'urgent' | 'recent'>('urgent')
const currentPage = ref(1)

const availableCategories = computed(() => {
  const cats = new Set(leads.value.map((l: any) => l.category).filter(Boolean))
  return [...cats] as string[]
})

const filteredLeads = computed(() => {
  if (!categoryFilter.value) return leads.value
  return leads.value.filter((l: any) => l.category === categoryFilter.value)
})

const sortedLeads = computed(() => {
  const ts = (l: any) => new Date(l.created_at ?? 0).getTime()
  // 'urgent' → ancien d'abord (asc) ; 'recent' → récent d'abord (desc)
  const dir = sortMode.value === 'urgent' ? 1 : -1
  return [...filteredLeads.value].sort((a, b) => (ts(a) - ts(b)) * dir)
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedLeads.value.length / PAGE_SIZE)))

const paginatedLeads = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedLeads.value.slice(start, start + PAGE_SIZE)
})

watch([categoryFilter, sortMode], () => { currentPage.value = 1 })

const route = useRoute()
const showSuccessBanner = ref(route.query.upgrade === 'success')
onMounted(() => {
  if (showSuccessBanner.value) setTimeout(() => { showSuccessBanner.value = false }, 6000)
  // Log paywall_view for each locked lead once per session (T-04.5-21: dedupe via Set)
  const logged = new Set<string>()
  for (const lead of leads.value) {
    if (lead.status === 'locked' && !logged.has(lead.id)) {
      logged.add(lead.id)
      logPaywallView(lead.id, lead.qualify_score)
    }
  }
})

async function logPaywallView(leadId: string, qualifyScore: number) {
  try {
    await $fetch('/api/v1/paywall-events', { method: 'POST', body: { event_type: 'paywall_view', lead_id: leadId, qualify_score: qualifyScore } })
  } catch { /* silent */ }
}

async function logCheckoutStarted() {
  try {
    await $fetch('/api/v1/paywall-events', { method: 'POST', body: { event_type: 'checkout_started' } })
  } catch { /* silent */ }
}

async function updateLeadStatus(lead: any, newStatus: string) {
  const oldStatus = lead.db_status
  lead.db_status = newStatus
  try {
    await $fetch(`/api/v1/leads/${lead.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
  } catch (err) {
    lead.db_status = oldStatus
    alert("Impossible de mettre à jour le statut du lead.")
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* silent */ }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-16">

    <!-- Success banner (?upgrade=success) -->
    <div v-if="showSuccessBanner" class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-8">
      <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
      </svg>
      <div>
        <p class="text-sm font-semibold text-foreground">Bienvenue dans BÂTI-AXE Premium !</p>
        <p class="text-xs text-muted-foreground mt-0.5">Vos leads sont maintenant accessibles sans délai.</p>
      </div>
    </div>

    <!-- Page header -->
    <div class="mb-12">
      <h1 class="text-3xl font-semibold tracking-tight text-foreground">Mes leads</h1>
      <p class="text-sm text-muted-foreground mt-1">Leads qualifiés pour votre métier</p>
      <NuxtLink
        v-if="!isPremium"
        to="/espace/premium"
        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
      >
        Passer Premium pour débloquer tous les contacts
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </NuxtLink>
      <NuxtLink
        v-else
        to="/espace/premium"
        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        Abonnement Premium actif · Gérer
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </NuxtLink>
    </div>

    <!-- Marché local widget (shown only when data available) -->
    <div v-if="marketData" class="border border-border rounded-lg divide-y divide-border mb-8">
      <div class="flex items-center justify-between px-6 py-3">
        <p class="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Marché local</p>
        <span class="text-xs text-muted-foreground">Ce mois</span>
      </div>
      <div class="flex items-center justify-between px-6 py-3">
        <span class="text-sm text-muted-foreground">Projets dans votre zone</span>
        <span class="text-sm font-semibold text-foreground">{{ marketData.projectCount }}</span>
      </div>
      <div class="px-6 py-3">
        <span class="text-sm text-muted-foreground block mb-2">Catégories dominantes</span>
        <div v-if="marketData.topCategories?.length" class="flex flex-wrap gap-2">
          <span v-for="cat in marketData.topCategories" :key="cat"
            class="inline-flex items-center text-xs font-semibold px-3 py-1 border border-border rounded-full text-foreground">
            {{ cat }}
          </span>
        </div>
        <p v-else class="text-xs text-muted-foreground">Aucun projet dans votre zone ce mois.</p>
      </div>
    </div>

    <!-- Free leads counter banner (BASIC, used < 3) -->
    <div v-if="showFreeLeadsBanner" class="flex items-center gap-3 p-4 border border-border rounded-lg mb-8">
      <svg class="w-4 h-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1010.058 8.4M12 4.875A2.625 2.625 0 1113.942 8.4M12 4.875V21m-9.375-9.75h18.75M6.375 8.4H3.75a1.5 1.5 0 000 3h15a1.5 1.5 0 000-3h-2.625M12 4.875a2.625 2.625 0 00-2.625 2.625h5.25A2.625 2.625 0 0012 4.875z"/>
      </svg>
      <p class="text-sm text-foreground flex-1">
        <span class="font-semibold">{{ freeRemaining }} lead{{ freeRemaining !== 1 ? 's' : '' }} gratuit{{ freeRemaining !== 1 ? 's' : '' }} restant{{ freeRemaining !== 1 ? 's' : '' }}.</span>
        <span class="text-muted-foreground"> Passez Premium pour un accès illimité.</span>
      </p>
      <NuxtLink to="/espace/premium"
        class="shrink-0 text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity">
        Voir l'offre
      </NuxtLink>
    </div>

    <!-- Paywall banner (BASIC, used >= 3 + has locked lead) -->
    <div v-if="showPaywallBanner" class="flex items-center gap-3 p-4 border border-amber-300 bg-amber-50 rounded-lg mb-8">
      <svg class="w-4 h-4 shrink-0 text-amber-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
      </svg>
      <p class="text-sm text-amber-700 flex-1">
        <span class="font-semibold">Vous avez utilisé vos 3 leads gratuits.</span>
        Passez Premium pour continuer à accéder aux coordonnées.
      </p>
      <NuxtLink to="/espace/premium" @click="logCheckoutStarted"
        class="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:opacity-70 transition-opacity">
        Passer Premium
      </NuxtLink>
    </div>

    <!-- Skeleton loading -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="border border-border rounded-lg h-[160px] bg-muted animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-4 border border-border rounded-lg">
      <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger les leads</p>
      <p class="text-xs text-muted-foreground mb-3">Réessayez dans quelques instants.</p>
      <button @click="() => refresh()" class="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
        Réessayer
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!leads?.length" class="py-16 text-center">
      <p class="text-sm font-semibold text-foreground mb-1">Aucun lead pour l'instant</p>
      <p class="text-xs text-muted-foreground">Les leads qualifiés apparaîtront ici dès que vous avez sélectionné vos catégories dans votre profil.</p>
    </div>

    <!-- Filtre catégorie + compteur -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs text-muted-foreground">
          {{ filteredLeads.length }} lead{{ filteredLeads.length !== 1 ? 's' : '' }}
          <template v-if="categoryFilter"> · {{ CATEGORY_LABELS[categoryFilter] ?? categoryFilter }}</template>
        </span>
        <div class="flex items-center gap-2">
          <select
            v-model="sortMode"
            aria-label="Trier les leads"
            class="h-9 px-3 pr-8 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
          >
            <option value="urgent">Plus urgents</option>
            <option value="recent">Plus récents</option>
          </select>
          <select
            v-model="categoryFilter"
            aria-label="Filtrer par catégorie"
            class="h-9 px-3 pr-8 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
          >
            <option value="">Toutes catégories</option>
            <option v-for="cat in availableCategories" :key="cat" :value="cat">
              {{ CATEGORY_LABELS[cat] ?? cat }}
            </option>
          </select>
        </div>
      </div>

      <!-- Empty filtered state -->
      <div v-if="filteredLeads.length === 0" class="py-12 text-center">
        <p class="text-sm text-muted-foreground">Aucun lead pour cette catégorie.</p>
      </div>

    <!-- Lead grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div
        v-for="lead in paginatedLeads"
        :key="lead.id"
        class="border border-border rounded-lg divide-y divide-border"
      >

        <!-- ── Variant A: Locked ── -->
        <template v-if="lead.status === 'locked'">
          <div class="flex items-center justify-between px-5 py-4">
            <div class="space-y-1.5">
              <p class="text-sm font-semibold text-foreground">{{ CATEGORY_LABELS[lead.category] ?? lead.category }}</p>
              <LeadAge v-if="lead.created_at" :created-at="lead.created_at" />
            </div>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-amber-300 text-amber-700 bg-amber-50">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              Flouté
            </span>
          </div>
          <div class="px-5 py-4 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Budget</span>
              <span class="text-foreground font-semibold">{{ lead.budget_range }}</span>
            </div>
            <div v-if="lead.timeline_range" class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Délai</span>
              <span class="text-foreground font-semibold">{{ lead.timeline_range }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Contact</span>
              <span class="text-muted-foreground font-mono select-none" aria-hidden="true">*** *** ***</span>
            </div>
            <LeadCountdown v-if="lead.unlocked_at" :unlocked-at="lead.unlocked_at" />
            <!-- Qualification badges (D-12) -->
            <div class="flex items-center gap-2 pt-1">
              <span :title="lead.qualify_budget ? 'Budget renseigné' : 'Budget non renseigné'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_budget ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </span>
              <span :title="lead.qualify_phone ? 'Téléphone vérifié' : 'Téléphone manquant'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_phone ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                </svg>
              </span>
              <span :title="lead.qualify_description ? 'Description détaillée' : 'Description courte'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_description ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/>
                </svg>
              </span>
              <span :title="lead.qualify_returning ? 'Client récurrent' : 'Nouveau prospect'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_returning ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
              </span>
              <span class="ml-1 text-xs text-muted-foreground">{{ lead.qualify_score }}/4</span>
            </div>
          </div>
          <div class="px-5 py-4">
            <NuxtLink
              v-if="freeRemaining > 0"
              :to="`/espace/leads/${lead.id}`"
              class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity"
            >
              Débloquer (1 crédit gratuit)
            </NuxtLink>
            <NuxtLink
              v-else
              to="/espace/premium"
              @click="logCheckoutStarted"
              class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              Passer Premium
            </NuxtLink>
          </div>
        </template>

        <!-- ── Variant B: Unlocked ── -->
        <template v-else-if="lead.status === 'unlocked'">
          <div class="flex items-center justify-between px-5 py-4">
            <div class="space-y-1.5">
              <p class="text-sm font-semibold text-foreground">{{ CATEGORY_LABELS[lead.category] ?? lead.category }}</p>
              <LeadAge v-if="lead.created_at" :created-at="lead.created_at" />
            </div>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-foreground/30 text-foreground">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              Débloqué
            </span>
          </div>
          <div class="px-5 py-4 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Budget</span>
              <span class="text-foreground font-semibold">{{ lead.budget_range }}</span>
            </div>
            <div v-if="lead.timeline_range" class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Délai</span>
              <span class="text-foreground font-semibold">{{ lead.timeline_range }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Nom</span>
              <span class="text-foreground font-semibold">{{ lead.customer_name }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Tél.</span>
              <span class="text-foreground font-semibold flex items-center gap-2">
                {{ lead.customer_phone }}
                <button @click="copyToClipboard(lead.customer_phone)" title="Copier le numéro" class="text-muted-foreground hover:text-foreground transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
                  </svg>
                </button>
              </span>
            </div>
            <!-- Description Preview -->
            <div class="pt-1">
              <span class="text-muted-foreground text-xs line-clamp-2">{{ lead.description }}</span>
            </div>
            <!-- Qualification badges (D-12) -->
            <div class="flex items-center gap-2 pt-1">
              <span :title="lead.qualify_budget ? 'Budget renseigné' : 'Budget non renseigné'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_budget ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </span>
              <span :title="lead.qualify_phone ? 'Téléphone vérifié' : 'Téléphone manquant'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_phone ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                </svg>
              </span>
              <span :title="lead.qualify_description ? 'Description détaillée' : 'Description courte'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_description ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/>
                </svg>
              </span>
              <span :title="lead.qualify_returning ? 'Client récurrent' : 'Nouveau prospect'">
                <svg class="w-3.5 h-3.5" :class="lead.qualify_returning ? 'text-foreground' : 'text-muted-foreground/40'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
              </span>
              <span class="ml-1 text-xs text-muted-foreground">{{ lead.qualify_score }}/4</span>
            </div>
          </div>
            <div class="flex items-center justify-between gap-3">
              <div class="flex-1">
                <select
                  :value="lead.db_status"
                  @change="updateLeadStatus(lead, ($event.target as HTMLSelectElement).value)"
                  class="w-full h-9 px-3 border border-border rounded-md text-xs font-semibold text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none cursor-pointer"
                >
                  <option value="new">Nouveau lead</option>
                  <option value="contacted">Déjà contacté</option>
                  <option value="won">Chantier gagné</option>
                  <option value="lost">Chantier perdu</option>
                </select>
              </div>
              <div class="flex gap-2 shrink-0">
                <a
                  :href="`tel:${lead.customer_phone}`"
                  class="inline-flex items-center justify-center w-9 h-9 border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                  title="Appeler"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                  </svg>
                </a>
                <a
                  :href="`mailto:${lead.customer_email}`"
                  class="inline-flex items-center justify-center w-9 h-9 border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                  title="Envoyer un email"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                </a>
              </div>
            </div>
            <div class="px-5 pb-4">
              <NuxtLink
                :to="`/espace/leads/${lead.id}`"
                class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 text-muted-foreground text-xs font-semibold rounded-md hover:text-foreground transition-colors"
              >
                Voir les détails du projet
              </NuxtLink>
            </div>
        </template>

        <!-- ── Variant C: Claimed ── -->
        <template v-else>
          <div class="flex items-center justify-between px-5 py-4">
            <p class="text-sm font-semibold text-muted-foreground">{{ CATEGORY_LABELS[lead.projects?.category ?? lead.category] ?? (lead.projects?.category ?? lead.category) }}</p>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-border text-muted-foreground">
              Déjà attribué
            </span>
          </div>
          <div class="px-5 py-4 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Budget</span>
              <span class="text-muted-foreground">{{ lead.projects?.budget_range ?? lead.budget_range }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Contact</span>
              <span class="text-muted-foreground font-mono select-none" aria-hidden="true">*** *** ***</span>
            </div>
          </div>
          <div class="px-5 py-4">
            <p class="text-xs text-muted-foreground text-center py-1">Ce lead a déjà été attribué</p>
          </div>
        </template>

      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-2">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="h-9 px-4 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Précédent
      </button>
      <span class="text-xs text-muted-foreground">{{ currentPage }} / {{ totalPages }}</span>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="h-9 px-4 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Suivant →
      </button>
    </div>

    </div><!-- /v-else leads -->

  </div>
</template>
