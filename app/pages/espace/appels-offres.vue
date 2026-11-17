<script setup lang="ts">
definePageMeta({ layout: 'dynamic', pageTitle: 'Appels d\'offres' })
useHead({ title: 'Appels d\'offres — BÂTI-AXE' })
useRequireAuth()

const t = useProTenders()
await t.ready

const route = useRoute()
// Sous-onglets : ?vue=en-cours (défaut) ou ?vue=perdues
const view = computed<'en-cours' | 'perdues'>(() => (route.query.vue === 'perdues' ? 'perdues' : 'en-cours'))
const goTo = (vue: 'en-cours' | 'perdues') => navigateTo({ query: vue === 'perdues' ? { vue } : {} })
const tabClass = (on: boolean) => on ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div class="flex flex-col w-full max-w-[1440px] px-6 py-3 md:px-10 md:py-8">

    <!-- Convention cadre : une ligne. Alerte tant qu'elle n'est pas signée, verte ensuite avec le lien du document. -->
    <div
      v-if="!t.frameworkSigned"
      data-testid="framework-banner"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 mb-4 border border-red-500/50 bg-red-500/10 rounded-lg text-sm text-foreground"
    >
      <span><strong>Convention cadre BÂTI-AXE à signer</strong> pour vous positionner sur les appels d'offres.</span>
      <button type="button" class="font-semibold underline underline-offset-4 hover:opacity-70" @click="t.startFramework()">Lire et signer</button>
    </div>
    <div
      v-else
      data-testid="framework-signed-banner"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 mb-4 border border-emerald-500/50 bg-emerald-500/10 rounded-lg text-sm text-foreground"
    >
      <span><strong>Convention cadre BÂTI-AXE signée</strong><template v-if="t.frameworkContract"> le {{ formatDate(t.frameworkContract.signed_at) }}</template>.</span>
      <a
        v-if="t.frameworkContract"
        :href="`/api/v1/engagements/${t.frameworkContract.id}/document`"
        target="_blank"
        rel="noopener"
        class="font-semibold underline underline-offset-4 hover:opacity-70"
      >Voir la convention</a>
    </div>

    <p class="text-sm text-muted-foreground mb-4 max-w-prose">
      Appels d'offres de nos partenaires professionnels (syndics, architectes, bureaux d'études) dans vos zones abonnées.
      Ceux que vous avez remportés sont dans <NuxtLink to="/espace/projets?vue=ao" class="underline underline-offset-4 hover:opacity-70">Projets en cours</NuxtLink>.
    </p>

    <div class="flex flex-wrap items-center gap-2 mb-5" role="tablist" aria-label="Appels d'offres">
      <button
        type="button" role="tab" :aria-selected="view === 'en-cours'" data-testid="tab-ao-en-cours"
        class="h-11 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors"
        :class="tabClass(view === 'en-cours')"
        @click="goTo('en-cours')"
      >
        En cours ({{ t.openTenders.length }})
      </button>
      <button
        type="button" role="tab" :aria-selected="view === 'perdues'" data-testid="tab-ao-perdues"
        class="h-11 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors"
        :class="tabClass(view === 'perdues')"
        @click="goTo('perdues')"
      >
        Perdues ({{ t.projects.lost.length }})
      </button>
    </div>

    <div v-if="t.message" role="status" class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-4">
      <p class="text-sm text-foreground flex-1">{{ t.message }}</p>
      <button type="button" aria-label="Fermer le message" class="text-xs text-muted-foreground hover:text-foreground transition-colors" @click="t.message = null">✕</button>
    </div>

    <!-- Skeleton loading -->
    <div v-if="t.pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="border border-border rounded-lg h-[160px] bg-muted animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="t.error" class="p-4 border border-border rounded-lg">
      <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger les appels d'offres</p>
      <p class="text-xs text-muted-foreground mb-3">Réessayez dans quelques instants.</p>
      <button type="button" class="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity" @click="() => t.refreshTenders()">
        Réessayer
      </button>
    </div>

    <!-- Perdues : journal en liste -->
    <EspaceTenderLostList v-else-if="view === 'perdues'" :lost="t.projects.lost" @open="navigateTo({ path: '/espace/projets', query: { vue: 'ao', projet: $event } })" />

    <!-- Empty state -->
    <div v-else-if="!t.openTenders.length" class="py-16 text-center">
      <p class="text-sm font-semibold text-foreground mb-1">Aucun appel d'offres partenaire pour l'instant</p>
      <p class="text-xs text-muted-foreground">Les AO de vos corps de métier, dans vos zones abonnées, apparaîtront ici.</p>
    </div>

    <!-- Tender grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <EspaceTenderCard
        v-for="tender in t.openTenders"
        :key="tender.lot_id"
        :tender="tender"
        :can-claim="t.canClaim && t.frameworkSigned"
        :framework-signed="t.frameworkSigned"
        :claiming="t.claimSubmitting"
        @claim="t.claimTarget = t.tenders.find((x: any) => x.lot_id === $event)"
        @report="t.reportTarget = t.tenders.find((x: any) => x.lot_id === $event)"
        @confirm-quote="t.confirmQuote"
        @contest-quote="t.contestQuote"
      />
    </div>

    <EspaceTenderDialogs :t="t" />
  </div>
</template>
