<script setup lang="ts">
definePageMeta({ layout: 'dynamic', pageTitle: 'Abonnement Premium' })
const supabase = useSupabaseClient()
const { user } = useRequireAuth()
const route = useRoute()

useHead({ title: 'Passer Premium — BÂTI-AXE' })

const { data: zones } = await useAsyncData('zones-list', async () => {
  const { data } = await supabase
    .from('zones')
    .select('id, name, postal_codes')
    .eq('type', 'area')
    .eq('is_active', true)
  return (data || []).map(z => ({ id: z.id, name: z.name, postalCodes: (z.postal_codes || []).join(', ') }))
}, { server: false })

const { data: activeProZones, refresh: refreshActiveZones } = await useAsyncData('pro-zones-active', async () => {
  // getSession() force la restauration/attache du JWT avant la requête RLS,
  // sinon elle part en `anon` et la policy `auth.uid() = pro_id` masque tout (cf. dashboard.vue).
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return []
  const { data } = await supabase
    .from('pro_zones')
    .select('zone_id, billing')
    .eq('pro_id', uid)
    .eq('status', 'active')
  return (data || []) as { zone_id: string; billing: 'monthly' | 'annual' }[]
}, { server: false, watch: [user] })

const activeZoneIds = computed(() => new Set((activeProZones.value || []).map(z => z.zone_id)))
const isAlreadyPremium = computed(() => activeZoneIds.value.size > 0)
const lockedBilling = computed(() => activeProZones.value?.[0]?.billing || null)

const showSuccessBanner = ref(route.query.upgrade === 'success')
if (showSuccessBanner.value) {
  setTimeout(() => { showSuccessBanner.value = false }, 6000)
  refreshActiveZones()
}

// ─── Changement mensuel ↔ annuel (Subscription Schedule, effet différé) ────
const showBillingChangeModal = ref(false)
const pendingBillingTarget = ref<'monthly' | 'annual' | null>(null)
const billingChangeLoading = ref(false)
const billingChangeError = ref('')

function formatDate(unixTs: number) {
  return new Date(unixTs * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

type BillingStatus = {
  pending: boolean
  target_billing?: 'monthly' | 'annual'
  effective_date?: number
  trialing: boolean
  trial_end?: number | null
  cancel_at_period_end: boolean
  current_period_end?: number
  pending_zone_removal: { zone_id: string; zone_name: string; effective_date: number } | null
}

const { data: billingStatus, refresh: refreshPendingChange } = await useAsyncData('billing-change-status', async () => {
  return await $fetch<BillingStatus>('/api/v1/pro/zones/billing-change-status')
}, { server: false, watch: [user] })

const pendingChange = computed(() => billingStatus.value?.pending
  ? { targetBilling: billingStatus.value.target_billing!, effectiveDate: billingStatus.value.effective_date! }
  : null)
const pendingZoneRemoval = computed(() => billingStatus.value?.pending_zone_removal || null)
// Un seul changement Stripe "en vol" à la fois (schedule ou résiliation) : bloque les 3 actions
// (ajout de zone, retrait de zone, changement mensuel/annuel) tant qu'il n'est pas résolu.
const hasPendingScheduleAction = computed(() =>
  !!pendingChange.value || !!pendingZoneRemoval.value || !!billingStatus.value?.cancel_at_period_end)

// ─── Retrait d'une zone (programmé, effet à la fin de la période payée) ────
const showRemoveZoneModal = ref(false)
const zoneToRemove = ref<{ id: string; name: string } | null>(null)
const removeZoneLoading = ref(false)
const removeZoneError = ref('')

function openRemoveZoneModal(zone: { id: string; name: string }) {
  if (hasPendingScheduleAction.value) return
  zoneToRemove.value = zone
  removeZoneError.value = ''
  showRemoveZoneModal.value = true
}

async function confirmRemoveZone() {
  if (!zoneToRemove.value || removeZoneLoading.value) return
  removeZoneLoading.value = true
  removeZoneError.value = ''
  try {
    await $fetch('/api/v1/pro/zones/unsubscribe', {
      method: 'POST',
      body: { zone_id: zoneToRemove.value.id },
    })
    showRemoveZoneModal.value = false
    await Promise.all([refreshActiveZones(), refreshPendingChange()])
  } catch (err: any) {
    removeZoneError.value = err.data?.statusMessage || err.message || 'Erreur lors du retrait de la zone.'
  } finally {
    removeZoneLoading.value = false
  }
}

function onToggleBillingClick() {
  // Un changement/retrait/résiliation est déjà en cours : retenter ferait échouer
  // la création d'un 2e schedule côté Stripe (un seul à la fois).
  if (hasPendingScheduleAction.value) return
  const target = billing.value === 'monthly' ? 'annual' : 'monthly'
  if (lockedBilling.value) {
    pendingBillingTarget.value = target
    showBillingChangeModal.value = true
  } else {
    billing.value = target
  }
}

async function confirmBillingChange() {
  if (!pendingBillingTarget.value || billingChangeLoading.value) return
  billingChangeLoading.value = true
  billingChangeError.value = ''
  try {
    await $fetch('/api/v1/pro/zones/change-billing', {
      method: 'POST',
      body: { billing: pendingBillingTarget.value },
    })
    showBillingChangeModal.value = false
    await refreshPendingChange()
  } catch (err: any) {
    billingChangeError.value = err.data?.statusMessage || err.message || 'Erreur lors du changement de facturation.'
  } finally {
    billingChangeLoading.value = false
  }
}

const cancelChangeLoading = ref(false)
const cancelChangeError = ref('')

async function cancelPendingChange() {
  if (cancelChangeLoading.value) return
  cancelChangeLoading.value = true
  cancelChangeError.value = ''
  try {
    await $fetch('/api/v1/pro/zones/cancel-billing-change', { method: 'POST' })
    await refreshPendingChange()
  } catch (err: any) {
    cancelChangeError.value = err.data?.statusMessage || err.message || 'Erreur lors de l\'annulation.'
  } finally {
    cancelChangeLoading.value = false
  }
}

// ─── Zones & Pricing ───────────────────────────────────────────
const billing = ref<'monthly' | 'annual'>('monthly')
watch(lockedBilling, (b) => { if (b) billing.value = b }, { immediate: true })

const selectedZones = ref<Set<string>>(new Set())

function toggleZone(id: string) {
  if (activeZoneIds.value.has(id) || hasPendingScheduleAction.value) return
  if (selectedZones.value.has(id)) {
    selectedZones.value.delete(id)
  } else {
    selectedZones.value.add(id)
  }
  selectedZones.value = new Set(selectedZones.value)
}

// Nombre de zones sélectionnées cette session, en plus de celles déjà actives
const newZoneCount = computed(() => selectedZones.value.size)
// Total réel une fois la sélection confirmée — c'est ce total qui fixe le palier facturé
const totalZoneCount = computed(() => activeZoneIds.value.size + newZoneCount.value)

const PRICING: Record<number, { monthly: number; annual: number }> = {
  1: { monthly: 190, annual: 150 },
  2: { monthly: 240, annual: 200 },
  3: { monthly: 290, annual: 250 },
  4: { monthly: 350, annual: 300 },
}

const selectedPrice = computed(() => {
  if (totalZoneCount.value === 0) return 0
  const tier = Math.min(totalZoneCount.value, 4)
  return PRICING[tier][billing.value]
})

const annualSavings = computed(() => {
  if (totalZoneCount.value === 0) return 0
  const tier = Math.min(totalZoneCount.value, 4)
  return (PRICING[tier].monthly - PRICING[tier].annual) * 12
})

// ─── Récap facturation — montant réellement facturé sur les zones actives ───
const activePrice = computed(() => {
  const count = activeZoneIds.value.size
  if (count === 0 || !lockedBilling.value) return 0
  const tier = Math.min(count, 4)
  return PRICING[tier][lockedBilling.value]
})

// ─── Checkout ──────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')
const portalLoading = ref(false)
const portalError = ref('')

async function openBillingPortal() {
  if (portalLoading.value) return
  portalLoading.value = true
  portalError.value = ''
  try {
    const res = await $fetch<{ url: string }>('/api/v1/pro/billing-portal', { method: 'POST' })
    window.location.href = res.url
  } catch (err: any) {
    portalError.value = err.data?.statusMessage || err.message || 'Impossible d\'ouvrir la facturation.'
    portalLoading.value = false
  }
}

const showConfirmModal = ref(false)

function onSubmitClick() {
  if (selectedZones.value.size === 0 || loading.value) return
  // Pas d'abonnement existant : la 1ère zone passe par Stripe Checkout, qui est déjà
  // une étape de confirmation explicite. Le modal ne sert que pour l'ajout à un abonnement actif.
  if (isAlreadyPremium.value) {
    showConfirmModal.value = true
  } else {
    startCheckout()
  }
}

async function startCheckout() {
  if (selectedZones.value.size === 0 || loading.value) return
  showConfirmModal.value = false
  loading.value = true
  error.value = ''
  try {
    for (const zoneId of selectedZones.value) {
      const res = await $fetch<{ status: string; checkout_url: string | null }>('/api/v1/pro/zones/subscribe', {
        method: 'POST',
        body: { zone_id: zoneId, billing: billing.value },
      })
      // Première zone : pas encore de moyen de paiement enregistré → Stripe Checkout le collecte.
      if (res.status === 'SUCCESS' && res.checkout_url) {
        window.location.href = res.checkout_url
        return
      }
      // Zones suivantes : ajoutées directement à l'abonnement existant, pas de redirection.
    }
    selectedZones.value = new Set()
    await refreshActiveZones()
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Erreur lors de la souscription.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-page">
    <div class="w-full max-w-4xl px-6 py-8 md:px-10 md:py-16">

      <!-- Success banner -->
      <div v-if="showSuccessBanner" class="flex items-start gap-3 p-5 bg-white border border-slate-200 rounded-sm shadow-sm mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-slate-900">Bienvenue dans BÂTI-AXE Premium !</p>
          <p class="text-xs text-slate-500 mt-0.5">Vos leads sont maintenant accessibles sans délai.</p>
        </div>
      </div>

      <!-- ═══ Section 1 : Hero ═══ -->
      <div class="mb-12">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style="text-wrap: balance">
          Choisissez vos zones d'intervention.
        </h1>
        <p class="text-base text-slate-600 mt-3 leading-relaxed max-w-2xl">
          Sélectionnez les zones dans les Yvelines où vous intervenez. Vous ne recevez que les leads de vos zones actives.
        </p>
      </div>

      <!-- Already Premium -->
      <div v-if="isAlreadyPremium" class="bg-white border border-slate-200 rounded-sm shadow-sm mb-8 overflow-hidden">
        <!-- Badges d'état : orange = résiliation/désistement, bleu = changement de mode -->
        <div v-if="billingStatus?.cancel_at_period_end || billingStatus?.trialing || pendingChange || pendingZoneRemoval" class="flex flex-wrap items-center gap-2 px-5 pt-5">
          <span
            v-if="pendingZoneRemoval"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
          >
            Zone « {{ pendingZoneRemoval.zone_name }} » retirée le {{ formatDate(pendingZoneRemoval.effective_date) }}
            <button
              @click="cancelPendingChange"
              :disabled="cancelChangeLoading"
              class="underline decoration-orange-400 hover:text-orange-900 disabled:opacity-50"
            >{{ cancelChangeLoading ? 'annulation…' : 'annuler' }}</button>
          </span>
          <span
            v-if="billingStatus?.cancel_at_period_end"
            class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
          >
            Se termine le {{ formatDate(billingStatus.current_period_end!) }}
          </span>
          <span
            v-else-if="billingStatus?.trialing && billingStatus.trial_end"
            class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
          >
            Essai — désistement gratuit jusqu'au {{ formatDate(billingStatus.trial_end) }}
          </span>
          <span
            v-if="pendingChange"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200"
          >
            Passage en {{ pendingChange.targetBilling === 'annual' ? 'annuel' : 'mensuel' }} le {{ formatDate(pendingChange.effectiveDate) }}
            <button
              @click="cancelPendingChange"
              :disabled="cancelChangeLoading"
              class="underline decoration-blue-400 hover:text-blue-900 disabled:opacity-50"
            >{{ cancelChangeLoading ? 'annulation…' : 'annuler' }}</button>
          </span>
        </div>
        <p v-if="cancelChangeError" class="text-xs text-red-600 px-5 pt-2">{{ cancelChangeError }}</p>

        <div class="flex items-start gap-3 p-5">
          <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-900">Votre abonnement est actif.</p>
            <p class="text-xs text-slate-500 mt-0.5">Vous avez accès immédiat à toutes les coordonnées.</p>
          </div>
          <button
            @click="openBillingPortal"
            :disabled="portalLoading"
            class="shrink-0 h-9 px-4 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {{ portalLoading ? 'Redirection…' : 'Gérer la facturation' }}
          </button>
        </div>

        <!-- Récap facturation : sert à retrouver la date de prélèvement après un changement de zones -->
        <div class="grid grid-cols-3 gap-4 px-5 pb-5 border-t border-slate-100 pt-4">
          <div>
            <p class="text-[11px] text-slate-500 uppercase tracking-wide">Formule</p>
            <p class="text-sm font-semibold text-slate-900 mt-0.5">{{ lockedBilling === 'annual' ? 'Annuel' : 'Mensuel' }}</p>
          </div>
          <div>
            <p class="text-[11px] text-slate-500 uppercase tracking-wide">Montant facturé</p>
            <p class="text-sm font-semibold text-slate-900 mt-0.5">{{ activePrice }}€/mois</p>
          </div>
          <div>
            <p class="text-[11px] text-slate-500 uppercase tracking-wide">
              {{ billingStatus?.cancel_at_period_end ? 'Fin d\'accès' : 'Prochaine échéance' }}
            </p>
            <p class="text-sm font-semibold text-slate-900 mt-0.5">
              {{ billingStatus?.current_period_end ? formatDate(billingStatus.current_period_end) : '—' }}
            </p>
          </div>
        </div>
      </div>
      <p v-if="portalError" class="text-sm text-red-600 mb-8 -mt-6">{{ portalError }}</p>

      <!-- ═══ Section 2 : Toggle + Sélection ═══ -->
      <div class="bg-white border border-slate-200 rounded-sm p-6 md:p-8 mb-6">
        <!-- Toggle -->
        <div class="flex items-center justify-center gap-3 mb-2">
          <span class="text-sm font-semibold" :class="billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'">Mensuel</span>
          <button
            @click="onToggleBillingClick"
            :disabled="hasPendingScheduleAction"
            class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-safety/50 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="billing === 'annual' ? 'bg-safety' : 'bg-slate-300'"
            role="switch"
            :aria-checked="billing === 'annual'"
          >
            <span
              class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm"
              :class="billing === 'annual' ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
          <span class="text-sm font-semibold" :class="billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'">
            Annuel
            <span class="ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">-21%</span>
          </span>
        </div>
        <p v-if="billingStatus?.cancel_at_period_end" class="text-center text-xs text-slate-400 mb-4">
          Abonnement en cours de résiliation — réactivez-le via "Gérer la facturation" avant tout changement.
        </p>
        <p v-else-if="pendingChange || pendingZoneRemoval" class="text-center text-xs text-slate-400 mb-4">
          Changement déjà programmé — annulez-le via le badge ci-dessus pour en choisir un autre.
        </p>
        <p v-else-if="lockedBilling" class="text-center text-xs text-slate-400 mb-4">
          Cliquez pour programmer un changement — il prendra effet à votre prochain renouvellement.
        </p>
        <div v-else class="mb-4" />

        <!-- Zones grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="zone in zones"
            :key="zone.id"
            @click="!activeZoneIds.has(zone.id) && toggleZone(zone.id)"
            class="relative text-left p-4 rounded-lg border-2 transition-all duration-200"
            :class="activeZoneIds.has(zone.id)
              ? 'border-emerald-300 bg-emerald-50'
              : selectedZones.has(zone.id)
                ? 'border-safety bg-safety/5 shadow-md shadow-safety/10 cursor-pointer'
                : hasPendingScheduleAction
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'"
          >
            <div
              v-if="selectedZones.has(zone.id) && !activeZoneIds.has(zone.id)"
              class="absolute top-3 right-3 w-5 h-5 rounded-full bg-safety flex items-center justify-center"
            >
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <template v-if="activeZoneIds.has(zone.id)">
              <span class="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Abonné</span>
              <button
                @click.stop="openRemoveZoneModal(zone)"
                :disabled="hasPendingScheduleAction"
                class="absolute bottom-3 right-3 text-[11px] font-semibold text-slate-500 underline decoration-slate-300 hover:text-red-600 hover:decoration-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >Retirer</button>
            </template>
            <p class="text-sm font-bold text-foreground">{{ zone.name }}</p>
            <p class="text-[11px] text-muted-foreground font-mono mt-1">{{ zone.postalCodes }}</p>
          </div>
        </div>
      </div>

      <!-- ═══ Section 3 : Récap + CTA ═══ -->
      <div v-if="newZoneCount > 0" class="bg-white border border-slate-200 rounded-sm p-6 md:p-8 mb-8">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <p class="text-sm text-slate-500">{{ totalZoneCount }} zone{{ totalZoneCount > 1 ? 's' : '' }} au total</p>
            <p class="text-4xl font-black text-slate-900 mt-1">
              {{ selectedPrice }}€<span class="text-base font-semibold text-slate-500">/mois</span>
            </p>
          </div>
          <div v-if="billing === 'annual' && annualSavings > 0" class="text-right">
            <p class="text-sm font-semibold text-emerald-600">Économie {{ annualSavings }}€/an</p>
          </div>
        </div>

        <!-- Détail par zone -->
        <div class="border-t border-slate-100 pt-4 mb-5">
          <p class="text-xs font-medium text-slate-500 mb-2">Nouvelles zones :</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="zoneId in selectedZones"
              :key="zoneId"
              class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"
            >
              {{ zones.find(z => z.id === zoneId)?.name }}
            </span>
          </div>
        </div>

        <p class="text-xs text-slate-500 mb-5">
          {{ billing === 'annual' ? 'Engagement 12 mois · Résiliation possible après la première année' : 'Pas d\'engagement · Résiliez quand vous voulez' }}
        </p>

        <!-- CTA -->
        <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
        <button
          @click="onSubmitClick"
          :disabled="loading"
          class="w-full h-12 px-8 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 bg-safety text-white hover:opacity-90 shadow-lg shadow-safety/20"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {{ loading ? (isAlreadyPremium ? 'Ajout en cours…' : 'Redirection vers Stripe…') : 'Démarrer mon abonnement' }}
        </button>
        <p class="text-xs text-slate-400 text-center mt-3">Paiement sécurisé par Stripe · CB requise</p>
      </div>

      <!-- ═══ Modal confirmation débit immédiat ═══ -->
      <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="showConfirmModal = false">
        <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <p class="text-sm font-bold text-slate-900 mb-2">Confirmer l'ajout de zone</p>
          <p class="text-sm text-slate-600 leading-relaxed mb-5">
            Vous allez être débité <strong>immédiatement</strong> d'un petit montant au prorata (les jours restants de ce mois-ci), puis <strong>{{ selectedPrice }}€/mois</strong> normalement à chaque renouvellement.
          </p>
          <div class="flex gap-3">
            <button
              @click="showConfirmModal = false"
              class="flex-1 h-10 rounded-md text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
            >Annuler</button>
            <button
              @click="startCheckout"
              class="flex-1 h-10 rounded-md text-sm font-bold bg-safety text-white hover:opacity-90"
            >Confirmer</button>
          </div>
        </div>
      </div>

      <!-- ═══ Modal confirmation changement mensuel ↔ annuel ═══ -->
      <div v-if="showBillingChangeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="showBillingChangeModal = false">
        <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <p class="text-sm font-bold text-slate-900 mb-2">
            Passer en {{ pendingBillingTarget === 'annual' ? 'annuel' : 'mensuel' }} ?
          </p>
          <p class="text-sm text-slate-600 leading-relaxed mb-5">
            Vous ne payez rien de plus aujourd'hui. Vous restez en {{ billing === 'annual' ? 'annuel' : 'mensuel' }} jusqu'à la fin de la période déjà payée, puis le nouveau mode de facturation prend le relais automatiquement.
          </p>
          <p v-if="billingChangeError" class="text-sm text-red-600 mb-3">{{ billingChangeError }}</p>
          <div class="flex gap-3">
            <button
              @click="showBillingChangeModal = false"
              class="flex-1 h-10 rounded-md text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
            >Annuler</button>
            <button
              @click="confirmBillingChange"
              :disabled="billingChangeLoading"
              class="flex-1 h-10 rounded-md text-sm font-bold bg-safety text-white hover:opacity-90 disabled:opacity-50"
            >{{ billingChangeLoading ? 'Envoi…' : 'Confirmer' }}</button>
          </div>
        </div>
      </div>

      <!-- ═══ Modal confirmation retrait de zone ═══ -->
      <div v-if="showRemoveZoneModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="showRemoveZoneModal = false">
        <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <p class="text-sm font-bold text-slate-900 mb-2">
            Retirer la zone « {{ zoneToRemove?.name }} » ?
          </p>
          <p class="text-sm text-slate-600 leading-relaxed mb-5">
            <template v-if="billingStatus?.current_period_end">
              Vous continuez à recevoir les leads de cette zone jusqu'au <strong>{{ formatDate(billingStatus.current_period_end) }}</strong> (période déjà payée). Elle sera ensuite retirée automatiquement et votre facturation ajustée au palier restant.
            </template>
            <template v-else>
              La zone sera retirée à la fin de votre période de facturation en cours.
            </template>
          </p>
          <p v-if="removeZoneError" class="text-sm text-red-600 mb-3">{{ removeZoneError }}</p>
          <div class="flex gap-3">
            <button
              @click="showRemoveZoneModal = false"
              class="flex-1 h-10 rounded-md text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
            >Annuler</button>
            <button
              @click="confirmRemoveZone"
              :disabled="removeZoneLoading"
              class="flex-1 h-10 rounded-md text-sm font-bold bg-red-600 text-white hover:opacity-90 disabled:opacity-50"
            >{{ removeZoneLoading ? 'Envoi…' : 'Confirmer le retrait' }}</button>
          </div>
        </div>
      </div>

      <!-- ═══ Section 4 : Comment ça marche ═══ -->
      <div class="border-t border-slate-200 pt-10 mb-10">
        <h2 class="text-lg font-bold text-slate-900 mb-6">Comment ça marche</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border border-slate-200 rounded-sm p-5">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span class="text-sm font-bold text-slate-600">1</span>
            </div>
            <p class="text-sm font-semibold text-slate-900 mb-1">Sélectionnez vos zones</p>
            <p class="text-xs text-slate-500 leading-relaxed">Choisissez les communes où vous intervenez dans les Yvelines.</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-sm p-5">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span class="text-sm font-bold text-slate-600">2</span>
            </div>
            <p class="text-sm font-semibold text-slate-900 mb-1">Paiement sécurisé</p>
            <p class="text-xs text-slate-500 leading-relaxed">Stripe gère votre abonnement. Annulez quand vous voulez.</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-sm p-5">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span class="text-sm font-bold text-slate-600">3</span>
            </div>
            <p class="text-sm font-semibold text-slate-900 mb-1">Recevez vos leads</p>
            <p class="text-xs text-slate-500 leading-relaxed">Les projets de vos zones vous sont envoyés en temps réel.</p>
          </div>
        </div>
      </div>

      <!-- ═══ Section 5 : Tableaux tarifaires ═══ -->
      <div class="border-t border-slate-200 pt-10 mb-10">
        <h2 class="text-lg font-bold text-slate-900 mb-2">Grille tarifaire</h2>
        <p class="text-sm text-slate-500 mb-6">Le tarif est dégressif : plus vous couvrez de zones, moins vous payez par zone.</p>

        <!-- Tableau Mensuel -->
        <div class="mb-6">
          <h3 class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-3">Mensuel — sans engagement</h3>
          <div class="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-xs text-slate-500">
                  <th class="text-left px-5 py-3 font-medium">Zones</th>
                  <th class="text-right px-5 py-3 font-medium">Prix</th>
                  <th class="text-right px-5 py-3 font-medium">Par zone</th>
                  <th class="text-right px-5 py-3 font-medium">Engagement</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr>
                  <td class="px-5 py-3 text-slate-900">1 zone</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">190€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">190€</td>
                  <td class="px-5 py-3 text-right text-slate-500">Aucun</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">2 zones</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">240€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">120€</td>
                  <td class="px-5 py-3 text-right text-slate-500">Aucun</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">3 zones</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">290€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">~97€</td>
                  <td class="px-5 py-3 text-right text-slate-500">Aucun</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">4 zones (full 78)</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">350€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">~88€</td>
                  <td class="px-5 py-3 text-right text-slate-500">Aucun</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tableau Annuel -->
        <div>
          <h3 class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-3">Annuel — engagement 12 mois</h3>
          <div class="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-xs text-slate-500">
                  <th class="text-left px-5 py-3 font-medium">Zones</th>
                  <th class="text-right px-5 py-3 font-medium">Prix</th>
                  <th class="text-right px-5 py-3 font-medium">Par zone</th>
                  <th class="text-right px-5 py-3 font-medium">Économie/an</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr>
                  <td class="px-5 py-3 text-slate-900">1 zone</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">150€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">150€</td>
                  <td class="px-5 py-3 text-right text-emerald-600 font-semibold">480€</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">2 zones</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">200€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">100€</td>
                  <td class="px-5 py-3 text-right text-emerald-600 font-semibold">480€</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">3 zones</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">250€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">~83€</td>
                  <td class="px-5 py-3 text-right text-emerald-600 font-semibold">480€</td>
                </tr>
                <tr>
                  <td class="px-5 py-3 text-slate-900">4 zones (full 78)</td>
                  <td class="px-5 py-3 text-right font-semibold text-slate-900">300€/mois</td>
                  <td class="px-5 py-3 text-right text-slate-500">75€</td>
                  <td class="px-5 py-3 text-right text-emerald-600 font-semibold">600€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══ Section 6 : FAQ ═══ -->
      <div class="border-t border-slate-200 pt-10">
        <h2 class="text-lg font-bold text-slate-900 mb-6">Questions fréquentes</h2>
        <div class="space-y-2">
          <details class="bg-white rounded-sm border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Puis-je annuler à tout moment ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500 leading-relaxed">Oui, sans frais et immédiatement depuis votre espace. Le mensuel est sans engagement, l'annuel peut être résilié après la première année.</p>
          </details>
          <details class="bg-white rounded-sm border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Comment fonctionne le pricing dégressif ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500 leading-relaxed">Le tarif diminue par zone quand vous en souscrivez plusieurs. Par exemple, 4 zones à 350€/mois reviennent à ~88€ par zone au lieu de 190€ pour une seule.</p>
          </details>
          <details class="bg-white rounded-sm border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Le paiement est-il sécurisé ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500 leading-relaxed">Oui, les paiements sont traités par Stripe, certifié PCI DSS. Vos données bancaires ne transitent jamais par nos serveurs.</p>
          </details>
          <details class="bg-white rounded-sm border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Puis-je ajouter une zone plus tard ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500 leading-relaxed">Oui, vous pouvez ajouter des zones à tout moment depuis votre dashboard. Le tarif s'ajuste automatiquement au nombre de zones actives.</p>
          </details>
          <details class="bg-white rounded-sm border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Que se passe-t-il si j'annule mon abonnement ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500 leading-relaxed">Votre accès Premium reste actif jusqu'à la fin de la période en cours (mois ou année). Après, vous revenez en mode Basic avec 3 leads gratuits.</p>
          </details>
        </div>
      </div>

    </div>
  </div>
</template>
