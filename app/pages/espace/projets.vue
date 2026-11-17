<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'

definePageMeta({ layout: 'dynamic', pageTitle: 'Projets en cours' })
useHead({ title: 'Projets en cours — BÂTI-AXE' })
useRequireAuth()

const route = useRoute()
const requestFetch = useRequestFetch()

const t = useProTenders()
await t.ready
const { data: leadsData } = await useAsyncData('pro-projects-leads', () =>
  requestFetch<{ leads: any[] }>('/api/v1/leads').catch(() => ({ leads: [] })))
const { updateLeadStatus } = useLeadStatus()

// Trois sous-onglets : ?vue=particuliers (défaut), ?vue=attente (partenaire pas encore décidé) ou ?vue=ao (gagnés) ;
// ?projet=<lot_id> ouvre la fiche d'un appel d'offres où le pro est positionné.
type View = 'particuliers' | 'attente' | 'ao'
const view = computed<View>(() => (route.query.vue === 'ao' ? 'ao' : route.query.vue === 'attente' ? 'attente' : 'particuliers'))
const isTenderView = computed(() => view.value !== 'particuliers')
const openProjectId = computed(() => (isTenderView.value && typeof route.query.projet === 'string' ? route.query.projet : null))
const openProject = computed(() => t.tenders.find((x: any) => x.positioned && x.lot_id === openProjectId.value) ?? null)

const goTo = (query: Record<string, string>) => navigateTo({ query })

// Chantiers particuliers travaillés : « Déjà contacté » ou « Chantier gagné ». « Perdu » est rangé dans « Non retenus ».
const leadsList = computed(() => leadsData.value?.leads || [])
const activeLeads = computed(() => leadsList.value.filter((l: any) => leadPhase(l) === 'active')
  .sort((a: any, b: any) => new Date(b.unlocked_at ?? b.created_at ?? 0).getTime() - new Date(a.unlocked_at ?? a.created_at ?? 0).getTime()))
const closedLeads = computed(() => leadsList.value.filter((l: any) => leadPhase(l) === 'closed'))
const leadsCount = computed(() => activeLeads.value.length)
const wonCount = computed(() => t.projects.won.length)
const pendingCount = computed(() => t.projects.pending.length)

const statusMessage = ref<string | null>(null)
async function changeStatus(lead: any, value: string) {
  const ok = await updateLeadStatus(lead, value)
  statusMessage.value = ok ? null : 'Impossible de mettre à jour le statut du chantier.'
  if (ok && value === 'new') statusMessage.value = 'Ce chantier est retourné dans Leads.'
}

const tabClass = (on: boolean) => on ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'
</script>

<template>
  <div class="flex flex-col w-full max-w-[1440px] px-6 py-3 md:px-10 md:py-8">

    <div class="flex flex-wrap items-center gap-2 mb-5" role="tablist" aria-label="Type de projet">
      <button
        type="button" role="tab" :aria-selected="view === 'particuliers'" data-testid="tab-particuliers"
        class="h-11 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors"
        :class="tabClass(view === 'particuliers')"
        @click="goTo({ vue: 'particuliers' })"
      >
        Chantiers particuliers ({{ leadsCount }})
      </button>
      <button
        type="button" role="tab" :aria-selected="view === 'attente'" data-testid="tab-ao-attente"
        class="h-11 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors"
        :class="tabClass(view === 'attente')"
        @click="goTo({ vue: 'attente' })"
      >
        Appels d'offres en attente ({{ pendingCount }})
      </button>
      <button
        type="button" role="tab" :aria-selected="view === 'ao'" data-testid="tab-ao-gagnes"
        class="h-11 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors"
        :class="tabClass(view === 'ao')"
        @click="goTo({ vue: 'ao' })"
      >
        Appels d'offres gagnés ({{ wonCount }})
      </button>
    </div>

    <div v-if="t.message" role="status" class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-4">
      <p class="text-sm text-foreground flex-1">{{ t.message }}</p>
      <button type="button" aria-label="Fermer le message" class="text-xs text-muted-foreground hover:text-foreground transition-colors" @click="t.message = null">✕</button>
    </div>

    <!-- ── Chantiers particuliers ── -->
    <template v-if="view === 'particuliers'">
      <p v-if="statusMessage" role="status" class="p-3 mb-4 border border-foreground/30 rounded-lg text-sm text-foreground">{{ statusMessage }}</p>

      <div v-if="!activeLeads.length" class="py-12 max-w-prose" data-testid="particuliers-empty">
        <p class="text-sm font-semibold text-foreground mb-1">Aucun chantier en cours</p>
        <p class="text-sm text-muted-foreground mb-3">Un chantier arrive ici dès que vous le passez en « Déjà contacté » ou « Chantier gagné » depuis Leads.</p>
        <NuxtLink to="/espace/leads" class="text-sm font-semibold underline underline-offset-4 hover:opacity-70">Voir les leads</NuxtLink>
      </div>

      <ul v-else data-testid="particuliers-list" class="border-t border-b border-border divide-y divide-border">
        <li v-for="lead in activeLeads" :key="lead.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 px-1">
          <span class="mt-0.5 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
          <NuxtLink :to="`/espace/leads/${lead.id}`" class="flex-1 min-w-[12rem] rounded-sm hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
            <span class="block text-sm font-semibold text-foreground truncate">
              {{ (CATEGORY_LABELS as Record<string, string>)[lead.category] ?? lead.category }}
              <span v-if="lead.customer_name" class="font-normal text-muted-foreground"> · {{ lead.customer_name }}</span>
            </span>
            <span class="block text-xs text-muted-foreground truncate">
              <template v-if="lead.postal_code">{{ lead.postal_code }}</template>
              <template v-if="lead.budget_range"> · {{ lead.budget_range }}</template>
            </span>
          </NuxtLink>
          <a v-if="lead.customer_phone" :href="`tel:${lead.customer_phone}`" class="text-sm text-foreground underline underline-offset-4 hover:opacity-70 tabular-nums">{{ lead.customer_phone }}</a>
          <select
            :value="lead.db_status"
            :aria-label="`Statut du chantier ${lead.customer_name || ''}`"
            class="h-9 px-3 border border-border rounded-sm text-xs font-semibold text-foreground bg-background focus-visible:outline-2 focus-visible:outline-foreground"
            @change="changeStatus(lead, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="o in LEAD_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </li>
      </ul>

      <details v-if="closedLeads.length" data-testid="leads-closed" class="mt-8">
        <summary class="cursor-pointer text-sm font-semibold text-foreground py-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
          Non retenus <span class="font-normal text-muted-foreground tabular-nums">({{ closedLeads.length }})</span>
        </summary>
        <ul class="border-t border-b border-border divide-y divide-border">
          <li v-for="lead in closedLeads" :key="lead.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 px-1">
            <span class="mt-0.5 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
            <span class="flex-1 text-sm text-foreground">
              {{ (CATEGORY_LABELS as Record<string, string>)[lead.category] ?? lead.category }}
              <span v-if="lead.customer_name" class="text-muted-foreground"> · {{ lead.customer_name }}</span>
            </span>
            <button type="button" class="text-xs font-semibold underline underline-offset-4 hover:opacity-70" @click="changeStatus(lead, 'contacted')">Remettre en cours</button>
          </li>
        </ul>
      </details>
    </template>

    <!-- ── Appels d'offres gagnés : liste puis fiche dans le même espace ── -->
    <template v-else>
      <div v-if="t.pending" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-14 border-b border-border bg-muted animate-pulse" />
      </div>
      <div v-else-if="t.error" class="p-4 border border-border rounded-lg">
        <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger vos projets</p>
        <button type="button" class="text-xs font-semibold underline underline-offset-2 hover:opacity-70" @click="() => t.refreshTenders()">Réessayer</button>
      </div>
      <EspaceProjectSheet
        v-else-if="openProject"
        :project="openProject"
        @back="goTo({ vue: view })"
        @sign-avenant="t.startAmendment"
        @confirm-quote="t.confirmQuote"
        @contest-quote="t.contestQuote"
      />
      <div v-else-if="openProjectId" class="py-12 max-w-prose">
        <p class="text-sm font-semibold text-foreground mb-1">Projet introuvable</p>
        <p class="text-sm text-muted-foreground mb-3">Il n'est plus dans votre liste, ou vous ne vous y êtes pas positionné.</p>
        <button type="button" class="text-sm font-semibold underline underline-offset-4 hover:opacity-70" @click="goTo({ vue: view })">Retour aux projets</button>
      </div>
      <EspaceProjectList
        v-else-if="view === 'attente'"
        :won="t.projects.pending"
        empty="Aucun appel d'offres en attente. Quand vous vous positionnez, le dossier apparaît ici jusqu'au choix du partenaire."
        @open="goTo({ vue: 'attente', projet: $event })"
      />
      <EspaceProjectList v-else :won="t.projects.won" @open="goTo({ vue: 'ao', projet: $event })" />
    </template>

    <EspaceTenderDialogs :t="t" />
  </div>
</template>
