<script setup lang="ts">
import { QUOTE_MAX_FILE_BYTES } from '~/utils/b2bCommissionRules'

definePageMeta({ layout: false })

useHead({
  title: 'Espace partenaire — BÂTI-AXE',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }],
})

interface Candidate {
  engagement_id: string; status: string; signed_at: string | null; not_awarded_reason: string | null
  pro: {
    company_name: string | null; categories: string[]; professional_type: string | null
    is_verified: boolean; decennale_valid: boolean; rge_valid: boolean
    zone: string | null; profile_url: string | null; phone: string | null
  }
}
interface Submission {
  id: string; engagement_id: string; amount_ht_cents: number; deposit_due_on: string | null
  planned_due_dates: string[]; status: 'pending' | 'confirmed' | 'contested' | 'rejected'; created_at: string; file_url: string
}
interface Installment { seq: number; label: string; due_on: string | null; validated_at: string | null; can_validate: boolean }
interface Lot {
  lot_id: string; lot_label: string; lot_status: string; selected_engagement_id: string | null
  outcome: 'pending' | 'selected' | 'outside_platform' | 'expired'
  candidates: Candidate[]; submissions: Submission[]; installments: Installment[] | null
  confirmed_submissions_count: number; confirmed_base_cents: number; can_submit_quote: boolean
}
interface EngagementView {
  request_ref: string
  contact_name: string
  on_behalf_of: string | null
  framework: { signed: boolean; signed_at: string | null; version: string; html: string | null }
  lots: Lot[]
}

const token = useRoute().params.token as string
// Client uniquement : le jeton n'apparaît ni dans le rendu SSR ni dans les caches.
const { data, error, refresh } = useFetch<EngagementView>(`/api/v1/b2b/engagement/${token}`, { server: false })

const formatEur = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

// --- Signature de la convention ---
const emailHint = ref<string | null>(null)
const accepted = ref(false)
const code = ref('')
const sigBusy = ref(false)
const sigError = ref<string | null>(null)
const codeValid = computed(() => /^\d{6}$/.test(code.value))

async function requestCode() {
  sigBusy.value = true
  sigError.value = null
  try {
    const res = await $fetch<{ status: string; email_hint?: string }>(`/api/v1/b2b/engagement/${token}/framework`, { method: 'POST', body: {} })
    if (res.status === 'ALREADY_SIGNED') await refresh()
    else emailHint.value = res.email_hint ?? ''
  } catch (err: any) {
    sigError.value = err.data?.statusMessage || 'Envoi du code impossible.'
  } finally {
    sigBusy.value = false
  }
}

async function sign() {
  sigBusy.value = true
  sigError.value = null
  try {
    await $fetch(`/api/v1/b2b/engagement/${token}/framework`, { method: 'POST', body: { code: code.value } })
    emailHint.value = null
    code.value = ''
    await refresh()
  } catch (err: any) {
    sigError.value = err.data?.statusMessage || 'Signature impossible.'
  } finally {
    sigBusy.value = false
  }
}

// --- Choix de l'artisan ---
const OUTCOME_LABELS: Record<Lot['outcome'], string> = {
  pending: 'À départager', selected: 'Artisan retenu', outside_platform: 'Retenu hors plateforme', expired: 'Délai de choix expiré',
}
const choice = ref<{ lot_id: string; engagement_id: string | null; label: string } | null>(null)
const lotMessages = reactive<Record<string, string>>({})
const lotBusy = ref<string | null>(null)

async function submitChoice() {
  const c = choice.value
  if (!c) return
  lotBusy.value = c.lot_id
  delete lotMessages[c.lot_id]
  try {
    await $fetch(`/api/v1/b2b/engagement/${token}/select`, {
      method: 'POST',
      body: c.engagement_id
        ? { outcome: 'select', lot_id: c.lot_id, engagement_id: c.engagement_id }
        : { outcome: 'outside_platform', lot_id: c.lot_id },
    })
    choice.value = null
    await refresh()
  } catch (err: any) {
    lotMessages[c.lot_id] = err.data?.statusMessage || 'Choix impossible pour le moment.'
  } finally {
    lotBusy.value = null
  }
}

// --- Dépôt du devis signé ---
interface QuoteForm { file: File | null; amount: string; dates: string[]; attested: boolean; busy: boolean; error: string | null; done: string | null }
const forms = reactive<Record<string, QuoteForm>>({})
const newForm = (done: string | null = null): QuoteForm => ({ file: null, amount: '', dates: ['', '', ''], attested: false, busy: false, error: null, done })
function formFor(lot: Lot): QuoteForm {
  if (!forms[lot.lot_id]) forms[lot.lot_id] = newForm()
  return forms[lot.lot_id] as QuoteForm
}
function amountCents(raw: string): number {
  const s = raw.replace(/[\s  ]/g, '')
  if (!AMOUNT_SERVER_REGEX.test(s)) return 0
  return Math.round(parseFloat(s.replace(',', '.')) * 100)
}
// D-06 bis : le nombre de versements dépend de l'assiette cumulée (devis déjà confirmés + montant saisi).
const baseFor = (lot: Lot) => lot.confirmed_base_cents + amountCents(formFor(lot).amount)
const datesCount = (lot: Lot) => installmentCount(baseFor(lot))
const dateLabels = (lot: Lot) => installmentLabels(baseFor(lot))
const amountLabel = (lot: Lot) => lot.confirmed_submissions_count > 0
  ? 'Montant HT de l\'avenant de travaux (en plus des devis déjà confirmés)'
  : 'Montant HT total du devis signé'
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
const minDate = isoDay(-365)
const maxDate = isoDay(1095)

function onFile(lot: Lot, ev: Event) {
  const input = ev.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  const form = formFor(lot)
  form.error = null
  if (f && (f.type !== 'application/pdf' || f.size > QUOTE_MAX_FILE_BYTES)) {
    form.file = null
    form.error = 'PDF uniquement, 20 Mo maximum.'
    input.value = ''
    return
  }
  form.file = f
}

function quoteReady(lot: Lot): boolean {
  const f = formFor(lot)
  const n = datesCount(lot)
  const dates = f.dates.slice(0, n)
  const ascending = dates.every((d, i) => Boolean(d) && (i === 0 || d > (dates[i - 1] as string)))
  return Boolean(f.file) && amountCents(f.amount) > 0 && dates.length === n && ascending && f.attested && !f.busy
}

async function submitQuote(lot: Lot) {
  const f = formFor(lot)
  if (!f.file || !lot.selected_engagement_id || !quoteReady(lot)) return
  f.busy = true
  f.error = null
  f.done = null
  try {
    const { signedUrl, fileKey } = await $fetch<{ signedUrl: string; fileKey: string }>(`/api/v1/b2b/engagement/${token}/quote-presign`, {
      method: 'POST',
      body: { engagement_id: lot.selected_engagement_id, filename: f.file.name, content_type: 'application/pdf', size: f.file.size },
    })
    const put = await fetch(signedUrl, { method: 'PUT', body: f.file, headers: { 'Content-Type': 'application/pdf' } })
    if (!put.ok) throw new Error('upload')
    await $fetch(`/api/v1/b2b/engagement/${token}/quote`, {
      method: 'POST',
      body: {
        engagement_id: lot.selected_engagement_id, file_key: fileKey, file_size: f.file.size,
        amount: f.amount, planned_due_dates: f.dates.slice(0, datesCount(lot)), attestation: true,
      },
    })
    forms[lot.lot_id] = newForm('Devis déposé. L\'artisan va confirmer le montant.')
    await refresh()
  } catch (err: any) {
    f.error = err.message === 'upload' ? 'Envoi du fichier impossible, réessayez.' : (err.data?.statusMessage || 'Dépôt impossible pour le moment.')
  } finally {
    f.busy = false
  }
}

// --- Validation de l'avancement ---
const stepChoice = ref<{ engagement_id: string; seq: number; label: string } | null>(null)
const stepMessage = ref<string | null>(null)
const stepBusy = ref(false)

async function validateStep() {
  const c = stepChoice.value
  if (!c) return
  stepBusy.value = true
  stepMessage.value = null
  try {
    await $fetch(`/api/v1/b2b/engagement/${token}/installments`, { method: 'POST', body: { engagement_id: c.engagement_id, seq: c.seq } })
    stepChoice.value = null
    await refresh()
  } catch (err: any) {
    stepMessage.value = err.data?.statusMessage || 'Validation impossible pour le moment.'
  } finally {
    stepBusy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-page text-foreground flex flex-col font-sans antialiased">
    <header class="sticky top-0 z-40 border-b border-border bg-page/95 backdrop-blur-sm">
      <div class="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-base font-bold tracking-tight text-foreground hover:opacity-70 transition-opacity">BÂTI-AXE</NuxtLink>
        <span class="text-xs text-muted-foreground font-medium tracking-wide">Espace partenaire</span>
      </div>
    </header>

    <main class="flex-grow max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
      <p v-if="!data && !error" class="text-sm text-muted-foreground">Chargement…</p>

      <div v-else-if="error" class="border border-border rounded-sm p-6 text-center">
        <h1 class="text-xl font-bold mb-2">Lien invalide ou expiré</h1>
        <p class="text-sm text-muted-foreground">Lien invalide ou expiré. Écrivez à contact@bati-axe.com pour en recevoir un nouveau.</p>
      </div>

      <template v-else-if="data">
        <h1 class="text-2xl font-black tracking-tight">Dossier {{ data.request_ref }}</h1>

        <!-- Convention -->
        <section data-testid="partner-framework" class="border border-border rounded-sm p-5 space-y-4">
          <h2 class="text-lg font-bold">Convention de partenariat</h2>

          <template v-if="!data.framework.signed">
            <!-- HTML généré côté serveur (contracts.ts), paramètres échappés -->
            <div class="max-h-80 overflow-y-auto border border-border rounded-sm p-4 text-sm" v-html="data.framework.html" />

            <button v-if="emailHint === null" type="button" :disabled="sigBusy"
              class="h-10 px-5 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40" @click="requestCode">
              Recevoir mon code de signature
            </button>

            <form v-else class="space-y-3" @submit.prevent="sign">
              <p class="text-sm text-muted-foreground">Code envoyé à {{ emailHint }}, valable 10 minutes.</p>
              <label class="flex items-start gap-2 text-sm">
                <input v-model="accepted" type="checkbox" class="mt-1">
                <span>J'ai lu la convention et j'accepte de la signer électroniquement</span>
              </label>
              <input id="partner-otp" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code"
                maxlength="6" pattern="\d{6}" required placeholder="123456" aria-label="Code de signature"
                class="h-10 px-3 text-sm rounded-sm border border-border bg-background">
              <div class="flex items-center gap-4">
                <button type="submit" :disabled="sigBusy || !accepted || !codeValid"
                  class="h-10 px-5 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40">
                  Signer la convention
                </button>
                <button type="button" :disabled="sigBusy" class="text-sm underline text-muted-foreground" @click="requestCode">Renvoyer un code</button>
              </div>
            </form>
            <p v-if="sigError" role="alert" class="text-sm text-destructive">{{ sigError }}</p>
          </template>

          <template v-else>
            <p class="text-sm">Convention signée le {{ formatDate(data.framework.signed_at) }} (version {{ data.framework.version }})</p>
            <details>
              <summary class="cursor-pointer text-sm underline">Relire la convention signée</summary>
              <div class="mt-3 text-sm" v-html="data.framework.html" />
            </details>
            <a :href="`/api/v1/b2b/engagement/${token}/document`" target="_blank" rel="noopener" class="inline-block text-sm underline">
              Imprimer / Enregistrer en PDF
            </a>
          </template>
        </section>

        <!-- Choix de l'artisan et devis -->
        <section data-testid="partner-lots" class="border border-border rounded-sm p-5 space-y-6">
          <h2 class="text-lg font-bold">Artisans intéressés par votre dossier</h2>
          <p v-if="!data.framework.signed" class="text-sm text-muted-foreground">Signez la convention ci-dessus pour choisir un artisan.</p>
          <p v-if="!data.lots.length" class="text-sm text-muted-foreground">Aucun lot sur ce dossier pour le moment.</p>

          <div v-for="lot in data.lots" :key="lot.lot_id" data-testid="partner-lot" class="border border-border rounded-sm p-4 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-bold">{{ lot.lot_label }}</h3>
              <span class="text-xs font-semibold text-muted-foreground">{{ OUTCOME_LABELS[lot.outcome] }}</span>
            </div>

            <p v-if="!lot.candidates.length" class="text-sm text-muted-foreground">Aucun artisan ne s'est encore positionné sur ce lot.</p>

            <div v-for="c in lot.candidates" :key="c.engagement_id" data-testid="candidate" class="border border-border rounded-sm p-3 space-y-1">
              <p class="text-sm font-bold">{{ c.pro.company_name }}</p>
              <p v-if="c.pro.categories.length" class="text-xs text-muted-foreground">{{ c.pro.categories.join(' · ') }}</p>
              <p class="text-xs flex flex-wrap gap-2">
                <span v-if="c.pro.is_verified" class="px-2 py-0.5 rounded-sm border border-border">Profil vérifié</span>
                <span v-if="c.pro.decennale_valid" class="px-2 py-0.5 rounded-sm border border-border">Décennale valide</span>
                <span v-if="c.pro.rge_valid" class="px-2 py-0.5 rounded-sm border border-border">RGE</span>
              </p>
              <p v-if="c.pro.zone" class="text-xs text-muted-foreground">Zone : {{ c.pro.zone }}</p>
              <p class="text-sm flex flex-wrap gap-x-4">
                <a v-if="c.pro.profile_url" :href="c.pro.profile_url" target="_blank" rel="noopener" class="underline">Voir la fiche publique</a>
                <a v-if="c.pro.phone" :href="`tel:${c.pro.phone}`" class="underline">{{ c.pro.phone }}</a>
              </p>
              <p class="text-xs text-muted-foreground">
                {{ ENGAGEMENT_STATUS_LABELS_PARTNER[c.status as keyof typeof ENGAGEMENT_STATUS_LABELS_PARTNER] ?? c.status }}
                <template v-if="c.status === 'not_awarded' && c.not_awarded_reason"> — {{ NOT_AWARDED_REASON_LABELS[c.not_awarded_reason] ?? '' }}</template>
              </p>
              <button v-if="data.framework.signed && lot.outcome === 'pending' && c.status === 'signed'" type="button"
                class="h-9 px-4 text-sm font-semibold rounded-sm border border-border"
                @click="choice = { lot_id: lot.lot_id, engagement_id: c.engagement_id, label: c.pro.company_name ?? '' }">
                Retenir cet artisan
              </button>
            </div>

            <button v-if="data.framework.signed && lot.outcome === 'pending' && lot.candidates.length" type="button"
              class="text-sm underline text-muted-foreground" @click="choice = { lot_id: lot.lot_id, engagement_id: null, label: '' }">
              J'ai retenu une entreprise hors plateforme
            </button>

            <div v-if="choice && choice.lot_id === lot.lot_id" class="border border-border rounded-sm p-3 space-y-3">
              <p v-if="choice.engagement_id" class="text-sm">
                Vous retenez {{ choice.label }} pour ce lot. Un seul artisan par lot : les autres seront informés que le chantier n'est pas obtenu.
              </p>
              <p v-else class="text-sm">
                Vous avez retenu une entreprise hors plateforme : tous les artisans positionnés sur ce lot seront informés que le chantier n'est pas obtenu.
              </p>
              <div class="flex gap-3">
                <button type="button" :disabled="lotBusy === lot.lot_id"
                  class="h-9 px-4 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40" @click="submitChoice">
                  Confirmer mon choix
                </button>
                <button type="button" class="h-9 px-4 text-sm rounded-sm border border-border" @click="choice = null">Annuler</button>
              </div>
            </div>
            <p v-if="lotMessages[lot.lot_id]" role="alert" class="text-sm text-destructive">{{ lotMessages[lot.lot_id] }}</p>

            <!-- Dépôt du devis signé -->
            <form v-if="lot.can_submit_quote" data-testid="quote-form" class="border border-border rounded-sm p-3 space-y-3" @submit.prevent="submitQuote(lot)">
              <h4 class="text-sm font-bold">{{ lot.confirmed_submissions_count > 0 ? 'Déposer un nouveau devis (avenant de travaux)' : 'Déposer le devis signé' }}</h4>
              <label class="block text-sm font-semibold" :for="`quote-file-${lot.lot_id}`">Devis signé (PDF)</label>
              <input :id="`quote-file-${lot.lot_id}`" type="file" accept="application/pdf" required aria-label="Devis signé (PDF)" @change="onFile(lot, $event)">

              <label class="block text-sm font-semibold" :for="`quote-amount-${lot.lot_id}`">{{ amountLabel(lot) }}</label>
              <input :id="`quote-amount-${lot.lot_id}`" v-model="formFor(lot).amount" type="text" inputmode="decimal"
                :maxlength="AMOUNT_INPUT_MAXLENGTH" :pattern="AMOUNT_INPUT_PATTERN" required :aria-label="amountLabel(lot)" placeholder="ex. 250 000"
                class="h-10 px-3 text-sm rounded-sm border border-border bg-background">

              <div class="space-y-2">
                <p class="text-xs text-muted-foreground">Le 1er versement correspond à l'acompte du devis ; indiquez la date prévue de chaque étape.</p>
                <div v-for="(label, i) in dateLabels(lot)" :key="i" class="flex items-center gap-3">
                  <label class="text-sm w-48" :for="`quote-date-${lot.lot_id}-${i}`">{{ label }}</label>
                  <input :id="`quote-date-${lot.lot_id}-${i}`" v-model="formFor(lot).dates[i]" type="date" required
                    :aria-label="`Date prévue — ${label}`" :min="minDate" :max="maxDate"
                    class="h-10 px-3 text-sm rounded-sm border border-border bg-background">
                </div>
              </div>

              <label class="flex items-start gap-2 text-sm" for="quote-attestation">
                <input id="quote-attestation" v-model="formFor(lot).attested" type="checkbox" required class="mt-1">
                <span>{{ QUOTE_ATTESTATION_TEXT }}</span>
              </label>

              <button type="submit" :disabled="!quoteReady(lot)"
                class="h-10 px-5 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40">
                Déposer le devis
              </button>
              <p v-if="formFor(lot).error" role="alert" class="text-sm text-destructive">{{ formFor(lot).error }}</p>
            </form>
            <p v-if="forms[lot.lot_id]?.done" class="text-sm">{{ forms[lot.lot_id]?.done }}</p>

            <!-- Suivi des dépôts -->
            <div v-if="lot.submissions.length" class="space-y-2">
              <div v-for="s in lot.submissions" :key="s.id" data-testid="submission" class="border border-border rounded-sm p-3 text-sm space-y-1">
                <p class="font-semibold">Devis {{ formatEur(s.amount_ht_cents) }} HT</p>
                <p class="text-xs text-muted-foreground">Versements prévus le {{ s.planned_due_dates.map(d => formatDate(d)).join(' / ') }}</p>
                <p class="text-xs">{{ SUBMISSION_STATUS_LABELS[s.status] }}</p>
                <p v-if="s.status === 'rejected'" class="text-xs">Déposez le devis corrigé.</p>
                <a :href="s.file_url" target="_blank" rel="noopener" class="underline text-xs">Voir le PDF</a>
              </div>
            </div>

            <!-- Étapes d'avancement : aucun montant -->
            <div v-if="lot.installments" data-testid="installments" class="space-y-2">
              <h4 class="text-sm font-bold">Avancement du chantier</h4>
              <div v-for="i in lot.installments" :key="i.seq" class="border border-border rounded-sm p-3 text-sm space-y-2">
                <p>{{ i.label }}<template v-if="i.due_on"> — prévue le {{ formatDate(i.due_on) }}</template></p>
                <p v-if="i.validated_at" class="text-xs text-muted-foreground">Validée le {{ formatDate(i.validated_at) }}</p>
                <button v-else-if="i.can_validate && lot.selected_engagement_id" type="button"
                  class="h-9 px-4 text-sm font-semibold rounded-sm border border-border"
                  @click="stepChoice = { engagement_id: lot.selected_engagement_id, seq: i.seq, label: i.label }">
                  Valider l'avancement
                </button>
                <div v-if="stepChoice && stepChoice.engagement_id === lot.selected_engagement_id && stepChoice.seq === i.seq" class="space-y-2">
                  <p>Vous confirmez que l'étape « {{ i.label }} » est atteinte.</p>
                  <div class="flex gap-3">
                    <button type="button" :disabled="stepBusy" class="h-9 px-4 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40" @click="validateStep">
                      Confirmer
                    </button>
                    <button type="button" class="h-9 px-4 text-sm rounded-sm border border-border" @click="stepChoice = null">Annuler</button>
                  </div>
                </div>
              </div>
              <p v-if="stepMessage" role="alert" class="text-sm text-destructive">{{ stepMessage }}</p>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
