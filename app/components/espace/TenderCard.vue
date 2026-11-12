<script setup lang="ts">
import { QUALIFICATION_LABELS } from '~/utils/qualifications'
import { ENGAGEMENT_STATUS_LABELS_PRO, NOT_AWARDED_REASON_LABELS, REASON_MIN, REASON_MAX } from '~/utils/b2bCommissionRules'

const CALENDRIER_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  sous_3_mois: 'Sous 3 mois',
  '3_6_mois': 'Dans 3 à 6 mois',
  plus_6_mois: 'Dans plus de 6 mois',
}

// Carte AO (appel d'offres partenaire) — variante masquée/révélée du même pattern
// visuel que les cartes leads (index.vue). Purement présentationnel : elle émet,
// la page orchestre les appels réseau (claim/report).
const props = defineProps<{
  tender: any
  canClaim: boolean
  claiming: boolean
  frameworkSigned: boolean
}>()

const emit = defineEmits<{
  claim: [lotId: string]
  report: [lotId: string]
  confirmQuote: [payload: { engagementId: string; submissionId: string }]
  contestQuote: [payload: { engagementId: string; submissionId: string; reason: string }]
}>()

const formatEur = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
// D-03 : le pro ne saisit aucun montant ; il confirme ou conteste celui que le partenaire a déposé.
const contesting = ref(false)
const contestReason = ref('')
const statusLabel = computed(() => {
  const e = props.tender.engagement
  if (!e) return ''
  const base = (ENGAGEMENT_STATUS_LABELS_PRO as Record<string, string>)[e.status] ?? e.status
  const why = e.status === 'not_awarded' && e.not_awarded_reason ? NOT_AWARDED_REASON_LABELS[e.not_awarded_reason] : null
  return why ? `${base} — ${why}` : base
})

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie & Gros Œuvre',
  toiture:      'Charpente & Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie & Chauffage',
  peinture:     'Peinture & Finitions',
  isolation:    'Isolation & Cloisons',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Dates approximatives saisies par le chargé d'affaires : on n'affiche que mois + année pour ne pas
// suggérer une précision qui n'existe pas. 'YYYY-MM-DD' lu à midi UTC pour éviter tout décalage de fuseau.
function formatMonth(ymd: string) {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
const planningLabel = computed(() => {
  const { planning_start: start, planning_end: end } = props.tender
  if (start && end) return `de ${formatMonth(start)} à ${formatMonth(end)}`
  if (start) return `début ${formatMonth(start)}`
  if (end) return `fin ${formatMonth(end)}`
  return null
})

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* silent */ }
}
</script>

<template>
  <div class="bento-card bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
    <!-- En-tête commun -->
    <div class="flex items-center justify-between px-5 py-3">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-bold text-slate-900">{{ CATEGORY_LABELS[tender.category] ?? tender.category }}</p>
          <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-copper/40 bg-copper/10 text-copper uppercase tracking-wide">
            AO Partenaire
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <LeadAge v-if="tender.created_at" :created-at="tender.created_at" />
          <span v-if="tender.zone_name">{{ tender.zone_name }}</span>
          <span v-if="tender.budget_range">{{ tender.budget_range }}</span>
          <span v-if="tender.request_ref">réf. {{ tender.request_ref }}</span>
        </div>
      </div>
    </div>

    <!-- Badge de décision -->
    <div class="px-5 pb-2">
      <span
        v-if="tender.decision_status === 'confirme'"
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-emerald-300 text-emerald-700 bg-emerald-50"
      >
        Chantier confirmé · exclusif
      </span>
      <span
        v-else
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-slate-300 text-slate-600 bg-slate-50"
      >
        En attente de décision · jusqu'à 3 artisans
      </span>
    </div>

    <!-- 05.21 — Ce que le pro doit savoir AVANT de s'engager : travaux du lot + infos chantier -->
    <div class="px-5 pb-3 space-y-2" data-testid="tender-lot-details">
      <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Travaux attendus pour ce lot</p>
      <p class="text-sm text-slate-800 whitespace-pre-line">{{ tender.lot_description || tender.description || 'Le partenaire n\'a pas détaillé ce lot.' }}</p>
      <div v-if="tender.nb_logements || tender.surface_m2 || tender.calendrier_souhaite" class="flex flex-wrap gap-2 text-xs">
        <span v-if="tender.nb_logements" class="px-2 py-1 rounded-sm bg-slate-100 text-slate-700">{{ tender.nb_logements }} logement{{ tender.nb_logements > 1 ? 's' : '' }}</span>
        <span v-if="tender.surface_m2" class="px-2 py-1 rounded-sm bg-slate-100 text-slate-700">{{ tender.surface_m2 }} m²</span>
        <span v-if="tender.calendrier_souhaite" class="px-2 py-1 rounded-sm bg-slate-100 text-slate-700">{{ CALENDRIER_LABELS[tender.calendrier_souhaite] ?? tender.calendrier_souhaite }}</span>
      </div>
      <!-- Qualification du dossier (validée par le chargé d'affaires avec le partenaire) -->
      <div v-if="tender.qualifications_requises?.length" data-testid="tender-qualifications" class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Qualifications requises</p>
        <div class="flex flex-wrap gap-2 text-xs">
          <span v-for="q in tender.qualifications_requises" :key="q" class="px-2 py-1 rounded-sm border border-copper/30 bg-copper/10 text-copper font-medium">{{ QUALIFICATION_LABELS[q] ?? q }}</span>
        </div>
      </div>
      <p v-if="planningLabel" data-testid="tender-planning" class="text-xs text-slate-700">
        <span class="font-semibold">Planning indicatif :</span> {{ planningLabel }}
      </p>
    </div>

    <!-- ── Variant A: Locked ── -->
    <template v-if="tender.status === 'locked'">
      <div class="px-5 py-3 space-y-2">
        <p v-if="tender.description" class="text-xs text-muted-foreground"><span class="font-semibold">Contexte du dossier :</span> {{ tender.description }}</p>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Contact</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_name }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Entreprise</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_company }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Tél.</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_phone }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Email</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_email }}</span>
        </div>
      </div>
      <div class="px-5 py-3 space-y-1.5">
        <p v-if="tender.lot_status !== 'open'" class="text-xs text-muted-foreground text-center py-2">
          Cet appel d'offres est clos.
        </p>
        <template v-else>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 w-full h-11 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canClaim || claiming"
            @click="$emit('claim', tender.lot_id)"
          >
            {{ claiming ? 'Envoi…' : 'Je suis intéressé' }}
          </button>
          <p v-if="!frameworkSigned" class="text-xs text-muted-foreground text-center">
            Signez la convention cadre (bandeau ci-dessus) pour vous positionner.
          </p>
          <p v-else-if="!canClaim" class="text-xs text-muted-foreground text-center">
            Profil vérifié + attestation décennale valide requis pour vous positionner.
          </p>
        </template>
      </div>
    </template>

    <!-- ── Variant B: Claimed ── -->
    <template v-else>
      <div class="px-5 pb-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-foreground/30 text-foreground">
          ✓ Vous êtes positionné
        </span>
        <span v-if="tender.claimed_at" class="ml-2 text-xs text-muted-foreground">{{ formatDate(tender.claimed_at) }}</span>
      </div>
      <div class="px-5 py-3 space-y-2">
        <p v-if="tender.description" class="text-xs text-muted-foreground"><span class="font-semibold">Contexte du dossier :</span> {{ tender.description }}</p>
        <p v-if="tender.postal_code" class="text-xs text-muted-foreground">Code postal : {{ tender.postal_code }}</p>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Contact</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            {{ tender.contact_name }}
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_name)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Entreprise</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            {{ tender.contact_company }}
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_company)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Tél.</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            <a :href="`tel:${tender.contact_phone}`" class="hover:underline">{{ tender.contact_phone }}</a>
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_phone)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Email</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            <a :href="`mailto:${tender.contact_email}`" class="hover:underline">{{ tender.contact_email }}</a>
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_email)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
      </div>
    </template>

    <!-- Suivi de l'avenant et déclaration du devis -->
    <div v-if="tender.status !== 'locked' && tender.engagement" data-testid="engagement-block" class="px-5 pb-3 space-y-2">
      <p class="text-sm font-semibold text-foreground">{{ statusLabel }}</p>
      <p v-if="tender.engagement.status === 'selected'" class="text-xs text-muted-foreground">
        Le partenaire vous a retenu. Établissez votre devis directement avec lui ; il le déposera ici une fois signé par son client.
      </p>

      <!-- Devis déposé par le partenaire : confirmer en un clic ou contester -->
      <div v-if="tender.engagement.open_submission?.status === 'pending'" data-testid="quote-to-confirm" class="space-y-2 border border-border rounded-sm p-3">
        <p class="text-sm">
          Devis déposé par le partenaire : <strong>{{ formatEur(tender.engagement.open_submission.amount_ht_cents) }} HT</strong>
          <template v-if="tender.engagement.open_submission.planned_due_dates?.length">
            — versements prévus le {{ tender.engagement.open_submission.planned_due_dates.map((d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' })).join(' / ') }}
          </template>
        </p>
        <a :href="tender.engagement.open_submission.file_url" target="_blank" rel="noopener" class="text-xs underline underline-offset-2">Voir le devis (PDF)</a>
        <p class="text-xs text-muted-foreground">
          En confirmant, vous déclarez le montant HT du devis signé (article 5 de votre avenant). La commission est calculée par BÂTI-AXE.
        </p>
        <div v-if="!contesting" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-80"
            @click="emit('confirmQuote', { engagementId: tender.engagement.id, submissionId: tender.engagement.open_submission.id })"
          >
            Confirmer le montant
          </button>
          <button type="button" class="h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted" @click="contesting = true">
            Contester
          </button>
        </div>
        <form
          v-else
          class="space-y-2"
          @submit.prevent="emit('contestQuote', { engagementId: tender.engagement.id, submissionId: tender.engagement.open_submission.id, reason: contestReason.trim() }); contesting = false; contestReason = ''"
        >
          <textarea
            :id="`contest-reason-${tender.engagement.id}`"
            v-model="contestReason"
            aria-label="Motif de la contestation"
            :minlength="REASON_MIN"
            :maxlength="REASON_MAX"
            required
            rows="3"
            class="w-full px-3 py-2 border border-border rounded-sm text-sm"
          />
          <div class="flex gap-2">
            <button
              type="submit"
              :disabled="contestReason.trim().length < REASON_MIN"
              class="h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-80 disabled:opacity-40"
            >
              Envoyer la contestation
            </button>
            <button type="button" class="h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted" @click="contesting = false">
              Annuler
            </button>
          </div>
        </form>
      </div>
      <p v-else-if="tender.engagement.open_submission?.status === 'contested'" class="text-xs text-muted-foreground">
        Montant contesté — BÂTI-AXE arbitre.
      </p>

      <p v-if="tender.engagement.confirmed_amount_cents != null" class="text-xs text-muted-foreground">
        Montant confirmé : {{ formatEur(tender.engagement.confirmed_amount_cents) }} HT
      </p>
      <p v-if="tender.engagement.commission_cents != null" class="text-xs text-muted-foreground">
        Commission HT (calculée par BÂTI-AXE) : {{ formatEur(tender.engagement.commission_cents) }}
      </p>
      <div v-if="tender.engagement.schedule" data-testid="pro-schedule" class="space-y-0.5">
        <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Échéancier de la commission</p>
        <p v-for="i in tender.engagement.schedule" :key="i.seq" class="text-xs text-muted-foreground">
          {{ i.label }} : {{ formatEur(i.amount_cents) }}
          <template v-if="i.due_on"> — prévu le {{ new Date(i.due_on + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' }) }}</template>
          <template v-if="i.validated_at"> — exigible</template>
        </p>
      </div>
      <a :href="`/api/v1/engagements/${tender.engagement.id}/document`" target="_blank" rel="noopener" class="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground">
        Voir l'avenant signé
      </a>
    </div>

    <!-- Pied de carte -->
    <div class="px-5 pb-4">
      <button
        type="button"
        class="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
        @click="$emit('report', tender.lot_id)"
      >
        Signaler cet appel d'offres
      </button>
    </div>
  </div>
</template>
