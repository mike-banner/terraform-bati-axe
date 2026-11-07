<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Espace partenaire — BÂTI-AXE',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }],
})

interface Amendment {
  id: string; lot_label: string | null; pro_company: string | null; status: string
  declared_amount_cents: number | null
}
interface EngagementView {
  request_ref: string
  contact_name: string
  framework: { signed: boolean; signed_at: string | null; version: string; html: string | null }
  amendments: Amendment[]
}

const token = useRoute().params.token as string
// Client uniquement : le jeton n'apparaît ni dans le rendu SSR ni dans les caches.
const { data, error, refresh } = useFetch<EngagementView>(`/api/v1/b2b/engagement/${token}`, { server: false })

const STATUS_LABELS: Record<string, string> = {
  signed: 'Avenant signé — devis à déclarer',
  not_awarded: 'Chantier non obtenu (déclaré)',
  quote_declared: 'Devis déclaré — à confirmer',
  quote_confirmed: 'Devis confirmé',
  deposit_paid: 'Acompte versé',
  invoiced: 'Clôturé',
}
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

// --- Confirmation des devis ---
const amounts = reactive<Record<string, string>>({})
const messages = reactive<Record<string, string>>({})
const busyId = ref<string | null>(null)

function amountFor(a: Amendment): string {
  return amounts[a.id] ?? (a.declared_amount_cents != null ? (a.declared_amount_cents / 100).toFixed(2).replace('.', ',') : '')
}

async function confirm(a: Amendment) {
  busyId.value = a.id
  delete messages[a.id]
  try {
    const res = await $fetch<{ matches_declared: boolean }>(`/api/v1/b2b/engagement/${token}/confirm-quote`, {
      method: 'POST', body: { engagement_id: a.id, amount: amountFor(a) },
    })
    messages[a.id] = res.matches_declared === false
      ? "Montant enregistré. L'écart avec la déclaration de l'artisan est signalé à l'équipe BÂTI-AXE."
      : 'Montant confirmé.'
    await refresh()
  } catch (err: any) {
    messages[a.id] = err.data?.statusMessage || 'Confirmation impossible.'
  } finally {
    busyId.value = null
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

        <!-- Devis -->
        <section data-testid="partner-amendments" class="border border-border rounded-sm p-5 space-y-4">
          <h2 class="text-lg font-bold">Artisans positionnés sur votre dossier</h2>
          <p v-if="!data.amendments.length" class="text-sm text-muted-foreground">Aucun artisan ne s'est encore positionné sur ce dossier.</p>

          <div v-for="a in data.amendments" :key="a.id" class="border border-border rounded-sm p-4 space-y-2">
            <p class="text-sm font-semibold">{{ a.lot_label }} — {{ a.pro_company }}</p>
            <p class="text-xs text-muted-foreground">{{ STATUS_LABELS[a.status] ?? a.status }}</p>
            <p v-if="a.declared_amount_cents != null" class="text-sm">Montant HT déclaré : {{ formatEur(a.declared_amount_cents) }}</p>

            <form v-if="a.status === 'quote_declared'" class="space-y-2" @submit.prevent="confirm(a)">
              <input :value="amountFor(a)" type="text" inputmode="decimal" :maxlength="AMOUNT_INPUT_MAXLENGTH"
                :pattern="AMOUNT_INPUT_PATTERN" required aria-label="Montant HT du devis signé"
                class="h-10 px-3 text-sm rounded-sm border border-border bg-background"
                @input="amounts[a.id] = ($event.target as HTMLInputElement).value">
              <p class="text-xs text-muted-foreground">Si le montant réel diffère, corrigez-le : l'équipe BÂTI-AXE sera alertée.</p>
              <button type="submit" :disabled="busyId === a.id"
                class="h-10 px-5 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40">
                Confirmer le montant
              </button>
            </form>
            <p v-if="messages[a.id]" class="text-sm">{{ messages[a.id] }}</p>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
