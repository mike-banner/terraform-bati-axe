<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'

useHead({ title: 'Mes leads — BÂTI-AXE' })

const user = useSupabaseUser()

watchEffect(() => {
  if (user.value === null) navigateTo('/pro/claim')
})

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

const leads = computed(() => leadsData.value?.leads || [])
const isPremium = computed(() => leadsData.value?.isPremium ?? false)

const hasLockedLeads = computed(() => leads.value.some((l: any) => l.status === 'locked'))

const route = useRoute()
const showSuccessBanner = ref(route.query.upgrade === 'success')
onMounted(() => {
  if (showSuccessBanner.value) setTimeout(() => { showSuccessBanner.value = false }, 6000)
})
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
    <div class="mb-10">
      <h1 class="text-3xl font-black tracking-tight text-foreground">Mes leads</h1>
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

    <!-- Premium banner (BASIC with locked leads) -->
    <div v-if="hasLockedLeads" class="flex items-center gap-3 p-4 border border-amber-300 bg-amber-50 rounded-lg mb-8">
      <svg class="w-4 h-4 shrink-0 text-amber-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
      </svg>
      <p class="text-sm text-amber-700 flex-1">
        <span class="font-semibold">Passez Premium</span> pour voir les coordonnées immédiatement — 39€/mois, sans engagement.
      </p>
      <NuxtLink
        to="/espace/premium"
        class="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:opacity-70 transition-opacity"
      >
        Voir l'offre
      </NuxtLink>
    </div>

    <!-- Skeleton loading -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <p class="text-xs text-muted-foreground">Les leads qualifiés apparaîtront ici dès que l'équipe BÂTI-AXE les valide.</p>
    </div>

    <!-- Lead grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div
        v-for="lead in leads"
        :key="lead.id"
        class="border border-border rounded-lg divide-y divide-border"
      >

        <!-- ── Variant A: Locked ── -->
        <template v-if="lead.status === 'locked'">
          <div class="flex items-center justify-between px-5 py-4">
            <p class="text-sm font-semibold text-foreground">{{ CATEGORY_LABELS[lead.category] ?? lead.category }}</p>
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
              <span class="text-foreground font-medium">{{ lead.budget_range }}</span>
            </div>
            <div v-if="lead.timeline_range" class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Délai</span>
              <span class="text-foreground font-medium">{{ lead.timeline_range }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Contact</span>
              <span class="text-muted-foreground font-mono select-none" aria-hidden="true">*** *** ***</span>
            </div>
            <LeadCountdown v-if="lead.unlocked_at" :unlocked-at="lead.unlocked_at" />
          </div>
          <div class="px-5 py-4">
            <NuxtLink
              to="/espace/premium"
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
            <p class="text-sm font-semibold text-foreground">{{ CATEGORY_LABELS[lead.category] ?? lead.category }}</p>
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
              <span class="text-foreground font-medium">{{ lead.budget_range }}</span>
            </div>
            <div v-if="lead.timeline_range" class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Délai</span>
              <span class="text-foreground font-medium">{{ lead.timeline_range }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Nom</span>
              <span class="text-foreground font-medium">{{ lead.customer_name }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Tél.</span>
              <span class="text-foreground font-medium">{{ lead.customer_phone }}</span>
            </div>
          </div>
          <div class="px-5 py-4">
            <NuxtLink
              :to="`/espace/leads/${lead.id}`"
              class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 border border-border text-foreground text-xs font-medium rounded-md hover:bg-muted transition-colors"
            >
              Voir le contact
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
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

  </div>
</template>
