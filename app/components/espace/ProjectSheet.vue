<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'
import { QUALIFICATION_LABELS } from '~/utils/qualifications'
import { ENGAGEMENT_STATUS_LABELS_PRO, NOT_AWARDED_REASON_LABELS } from '~/utils/b2bCommissionRules'

// Fiche d'un projet (appel d'offres où le pro est positionné), ouverte dans l'espace pro.
// Présentationnel : la signature de l'avenant et les décisions sur le devis remontent à la page.
const props = defineProps<{ project: any }>()

const emit = defineEmits<{
  back: []
  signAvenant: [lotId: string]
  confirmQuote: [payload: { engagementId: string; submissionId: string }]
  contestQuote: [payload: { engagementId: string; submissionId: string; reason: string }]
}>()

const CALENDRIER_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  sous_3_mois: 'Sous 3 mois',
  '3_6_mois': 'Dans 3 à 6 mois',
  plus_6_mois: 'Dans plus de 6 mois',
}

const formatEur = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const formatMonth = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const formatDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })

const signed = computed(() => Boolean(props.project.avenant_signed))

const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`
const attachmentUrl = (index: number) => `/api/v1/tenders/${props.project.lot_id}/files/${index}`
const eng = computed(() => props.project.engagement)

const statusLabel = computed(() => {
  if (!eng.value) return 'Avenant non signé'
  const base = (ENGAGEMENT_STATUS_LABELS_PRO as Record<string, string>)[eng.value.status] ?? eng.value.status
  const why = eng.value.status === 'not_awarded' && eng.value.not_awarded_reason ? NOT_AWARDED_REASON_LABELS[eng.value.not_awarded_reason] : null
  return why ? `${base} — ${why}` : base
})

const planning = computed(() => {
  const { planning_start: start, planning_end: end } = props.project
  if (start && end) return `de ${formatMonth(start)} à ${formatMonth(end)}`
  if (start) return `début ${formatMonth(start)}`
  if (end) return `fin ${formatMonth(end)}`
  return null
})

// Lignes « libellé / valeur » du chantier : on n'affiche que ce qui est renseigné.
const facts = computed(() => {
  const p = props.project
  const rows: { label: string; value: string }[] = []
  if (p.department) rows.push({ label: 'Département', value: p.department })
  if (p.zone_name) rows.push({ label: 'Zone', value: p.zone_name })
  if (p.postal_code) rows.push({ label: 'Code postal', value: p.postal_code })
  if (p.project_location) rows.push({ label: 'Adresse du chantier', value: p.project_location })
  if (p.budget_range) rows.push({ label: 'Budget', value: p.budget_range })
  if (p.nb_logements) rows.push({ label: 'Logements', value: String(p.nb_logements) })
  if (p.surface_m2) rows.push({ label: 'Surface', value: `${p.surface_m2} m²` })
  if (p.calendrier_souhaite) rows.push({ label: 'Calendrier souhaité', value: CALENDRIER_LABELS[p.calendrier_souhaite] ?? p.calendrier_souhaite })
  if (planning.value) rows.push({ label: 'Planning indicatif', value: planning.value })
  return rows
})
</script>

<template>
  <article data-testid="project-sheet" class="max-w-3xl">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 h-10 -ml-2 px-2 mb-4 text-sm text-muted-foreground hover:text-foreground rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors"
      @click="emit('back')"
    >
      <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 4.5 7 10l5.5 5.5" />
      </svg>
      Mes projets
    </button>

    <header class="mb-6">
      <h2 class="text-2xl font-semibold text-foreground text-balance">
        {{ (CATEGORY_LABELS as Record<string, string>)[project.category] ?? project.category }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground tabular-nums">Réf. {{ project.request_ref }}</p>
      <p class="mt-3 text-sm font-semibold text-foreground" data-testid="project-status">{{ statusLabel }}</p>
    </header>

    <!-- Avenant -->
    <section class="py-5 border-t border-border" data-testid="project-avenant">
      <h3 class="text-base font-semibold text-foreground mb-2">Avenant de mise en relation</h3>
      <template v-if="signed && eng">
        <p class="text-sm text-muted-foreground mb-2">Signé le {{ formatDate(eng.signed_at) }}.</p>
        <a
          :href="`/api/v1/engagements/${eng.id}/document`"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center h-10 text-sm font-semibold text-foreground underline underline-offset-4 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-sm"
        >
          Voir l'avenant signé (imprimable)
        </a>
      </template>
      <template v-else>
        <p class="text-sm text-muted-foreground mb-3 max-w-prose">
          Vous êtes positionné sur ce projet, mais l'avenant n'est pas signé : les coordonnées du partenaire restent masquées.
        </p>
        <button
          type="button"
          class="h-11 px-5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-opacity"
          @click="emit('signAvenant', project.lot_id)"
        >
          Lire et signer l'avenant
        </button>
      </template>
    </section>

    <!-- Chantier -->
    <section class="py-5 border-t border-border">
      <h3 class="text-base font-semibold text-foreground mb-3">Le chantier</h3>
      <dl v-if="facts.length" class="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2 text-sm">
        <template v-for="f in facts" :key="f.label">
          <dt class="text-muted-foreground">{{ f.label }}</dt>
          <dd class="text-foreground">{{ f.value }}</dd>
        </template>
      </dl>
      <p v-else class="text-sm text-muted-foreground">Aucune précision de chantier renseignée.</p>
    </section>

    <section class="py-5 border-t border-border">
      <h3 class="text-base font-semibold text-foreground mb-2">Travaux attendus pour ce lot</h3>
      <p class="text-sm text-foreground whitespace-pre-line max-w-prose">{{ project.lot_description || project.description || 'Le partenaire n\'a pas détaillé ce lot.' }}</p>
      <div v-if="project.qualifications_requises?.length" class="mt-3" data-testid="project-qualifications">
        <p class="text-sm text-muted-foreground mb-1">Qualifications requises</p>
        <ul class="flex flex-wrap gap-2 text-xs">
          <li v-for="q in project.qualifications_requises" :key="q" class="px-2 py-1 rounded-sm border border-border text-foreground">{{ QUALIFICATION_LABELS[q] ?? q }}</li>
        </ul>
      </div>
    </section>

    <!-- Pièces du partenaire (plans, CCTP…) : uniquement avenant signé, retirées si l'offre est perdue (le serveur filtre) -->
    <section v-if="project.attachments?.length" class="py-5 border-t border-border" data-testid="project-attachments">
      <h3 class="text-base font-semibold text-foreground mb-3">Pièces jointes du partenaire</h3>
      <ul class="border-t border-b border-border divide-y divide-border">
        <li v-for="a in project.attachments" :key="a.index" class="flex items-center gap-3 py-3 px-1">
          <span class="size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
          <span class="flex-1 min-w-0 text-sm text-foreground truncate">{{ a.name }}</span>
          <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{{ formatSize(a.size) }}</span>
          <a
            :href="attachmentUrl(a.index)" target="_blank" rel="noopener"
            class="shrink-0 text-sm font-semibold underline underline-offset-4 hover:opacity-70 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            :aria-label="`${a.viewable ? 'Ouvrir' : 'Télécharger'} ${a.name}`"
          >{{ a.viewable ? 'Ouvrir' : 'Télécharger' }}</a>
        </li>
      </ul>
    </section>
    <p v-else-if="!signed" class="py-5 border-t border-border text-sm text-muted-foreground max-w-prose" data-testid="project-attachments-locked">
      Les pièces jointes du partenaire (plans, CCTP) sont consultables après la signature de l'avenant.
    </p>

    <!-- Contact partenaire : uniquement avenant signé (le serveur masque sinon) -->
    <section v-if="signed" class="py-5 border-t border-border" data-testid="project-contact">
      <h3 class="text-base font-semibold text-foreground mb-3">Contact du partenaire</h3>
      <dl class="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2 text-sm">
        <dt class="text-muted-foreground">Contact</dt>
        <dd class="text-foreground">{{ project.contact_name }}</dd>
        <dt class="text-muted-foreground">Entreprise</dt>
        <dd class="text-foreground">{{ project.contact_company }}</dd>
        <dt class="text-muted-foreground">Téléphone</dt>
        <dd><a :href="`tel:${project.contact_phone}`" class="text-foreground underline underline-offset-4 hover:opacity-70">{{ project.contact_phone }}</a></dd>
        <dt class="text-muted-foreground">E-mail</dt>
        <dd class="break-all"><a :href="`mailto:${project.contact_email}`" class="text-foreground underline underline-offset-4 hover:opacity-70">{{ project.contact_email }}</a></dd>
      </dl>
    </section>

    <!-- Suivi du devis et de la commission -->
    <section v-if="eng" class="py-5 border-t border-border" data-testid="project-follow-up">
      <h3 class="text-base font-semibold text-foreground mb-3">Suivi</h3>
      <p v-if="eng.status === 'selected'" class="text-sm text-muted-foreground mb-3 max-w-prose">
        Le partenaire vous a retenu. Établissez votre devis directement avec lui ; il le déposera ici une fois signé par son client.
      </p>
      <EspaceQuoteDecision
        :engagement="eng"
        @confirm-quote="emit('confirmQuote', $event)"
        @contest-quote="emit('contestQuote', $event)"
      />
      <dl v-if="eng.confirmed_amount_cents != null || eng.commission_cents != null" class="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2 text-sm mt-3">
        <template v-if="eng.confirmed_amount_cents != null">
          <dt class="text-muted-foreground">Montant confirmé</dt>
          <dd class="text-foreground tabular-nums">{{ formatEur(eng.confirmed_amount_cents) }} HT</dd>
        </template>
        <template v-if="eng.commission_cents != null">
          <dt class="text-muted-foreground">Commission HT</dt>
          <dd class="text-foreground tabular-nums">{{ formatEur(eng.commission_cents) }}</dd>
        </template>
      </dl>
      <div v-if="eng.schedule" class="mt-4" data-testid="project-schedule">
        <p class="text-sm text-muted-foreground mb-1">Échéancier de la commission</p>
        <ul class="divide-y divide-border border-y border-border text-sm">
          <li v-for="i in eng.schedule" :key="i.seq" class="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
            <span class="text-foreground">{{ i.label }}</span>
            <span class="text-muted-foreground tabular-nums">
              {{ formatEur(i.amount_cents) }}
              <template v-if="i.due_on"> · prévu le {{ formatDay(i.due_on) }}</template>
              <template v-if="i.validated_at"> · exigible</template>
            </span>
          </li>
        </ul>
      </div>
    </section>
  </article>
</template>
