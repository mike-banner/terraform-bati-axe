<script setup lang="ts">
import type { Overview, Project } from '~/types/admin'

const props = defineProps<{
  overview: Overview | null
  projects: Project[]
  isLoading: boolean
}>()

const paywallConversion = computed(() => {
  const f = props.overview?.paywall_30d
  if (!f || !f.paywall_view) return 0
  return Math.round((f.checkout_completed / f.paywall_view) * 100)
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <!-- KPI Cards -->
    <div v-if="overview" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-card border border-border rounded-sm p-5">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Pros vérifiés</p>
        <p class="text-3xl font-bold text-foreground">{{ overview.professionals.verified }}<span class="text-base font-medium text-muted-foreground"> / {{ overview.professionals.total }}</span></p>
        <p v-if="overview.professionals.pending" class="text-xs text-amber-400 mt-2">{{ overview.professionals.pending }} en attente</p>
        <p v-else class="text-xs text-muted-foreground mt-2">Aucun en attente</p>
      </div>

      <div class="bg-card border border-border rounded-sm p-5">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Projets qualifiés</p>
        <p class="text-3xl font-bold text-foreground">{{ overview.projects.qualified }}<span class="text-base font-medium text-muted-foreground"> / {{ overview.projects.total }}</span></p>
        <p class="text-xs text-muted-foreground mt-2">{{ overview.projects.pending }} en attente</p>
      </div>

      <div class="bg-card border border-border rounded-sm p-5">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Leads débloqués</p>
        <p class="text-3xl font-bold text-foreground">{{ overview.leads.unlocked }}<span class="text-base font-medium text-muted-foreground"> / {{ overview.leads.total }}</span></p>
        <p class="text-xs text-muted-foreground mt-2">Coordonnées accessibles</p>
      </div>

      <div class="bg-card border border-border rounded-sm p-5">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Abonnés actifs</p>
        <p class="text-3xl font-bold text-foreground">{{ overview.professionals.active_subscriptions }}</p>
        <p class="text-xs text-muted-foreground mt-2">MRR en cours</p>
      </div>

      <div class="bg-card border border-border rounded-sm p-5">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Conversion paywall (30j)</p>
        <p class="text-3xl font-bold text-safety">{{ paywallConversion }}%</p>
        <p class="text-xs text-muted-foreground mt-2">{{ overview.paywall_30d.checkout_completed }} checkout / {{ overview.paywall_30d.paywall_view }} vues</p>
      </div>
    </div>

    <div v-if="!overview" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucune donnée agrégée pour l'instant.</p>
    </div>

    <!-- Quick stats -->
    <div v-if="overview" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-card border border-border rounded-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-3">Activité récente</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Dernier projet reçu</span>
            <span class="text-foreground font-medium">
              {{ projects.length > 0 ? new Date(projects[0]!.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Total projets</span>
            <span class="text-foreground font-medium">{{ overview.projects.total }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Total leads</span>
            <span class="text-foreground font-medium">{{ overview.leads.total }}</span>
          </div>
        </div>
      </div>

      <div class="bg-card border border-border rounded-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-3">Alertes</h3>
        <div class="space-y-2">
          <div v-if="overview.professionals.pending > 0" class="flex items-center gap-2 text-xs text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {{ overview.professionals.pending }} professionnel{{ overview.professionals.pending > 1 ? 's' : '' }} en attente de validation
          </div>
          <div v-if="overview.projects.pending > 0" class="flex items-center gap-2 text-xs text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {{ overview.projects.pending }} projet{{ overview.projects.pending > 1 ? 's' : '' }} non qualifié{{ overview.projects.pending > 1 ? 's' : '' }}
          </div>
          <div v-if="overview.professionals.pending === 0 && overview.projects.pending === 0" class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Tout est à jour
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
