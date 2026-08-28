<script setup lang="ts">
definePageMeta({ layout: 'dynamic', pageTitle: 'Abonnement Premium' })
const supabase = useSupabaseClient()
const { user } = useRequireAuth()
const route = useRoute()

useHead({ title: 'Passer Premium — BÂTI-AXE' })

const { data: pro } = await useAsyncData('pro-premium', async () => {
  if (!user.value?.id) return null
  const { data } = await supabase
    .from('professionals')
    .select('id, subscription_status')
    .eq('id', user.value.id)
    .maybeSingle()
  return data as { id: string; subscription_status: string } | null
}, { server: false, watch: [user] })

const isAlreadyPremium = computed(() => pro.value?.subscription_status === 'active')

const showSuccessBanner = ref(route.query.upgrade === 'success')
if (showSuccessBanner.value) {
  setTimeout(() => { showSuccessBanner.value = false }, 6000)
}

// ─── Zones & Pricing ───────────────────────────────────────────
const billing = ref<'monthly' | 'annual'>('monthly')

const zones = [
  { id: '78-mantes', name: 'Mantes-la-Jolie', postalCodes: '78200, 78520, 78711, 78440, 78270, 78930, 78250, 78680, 78410, 78580' },
  { id: '78-rambouillet', name: 'Rambouillet', postalCodes: '78120, 78610, 78730, 78125, 78660, 78690, 78550, 78310, 78990' },
  { id: '78-versailles', name: 'Versailles', postalCodes: '78000, 78150, 78220, 78350, 78140, 78960, 78180, 78190' },
  { id: '78-stgermain', name: 'St-Germain-en-Laye', postalCodes: '78100, 78300, 78955, 78500, 78800, 78700, 78510, 78400, 78600, 78230' },
]

const selectedZones = ref<Set<string>>(new Set())

function toggleZone(id: string) {
  if (selectedZones.value.has(id)) {
    selectedZones.value.delete(id)
  } else {
    selectedZones.value.add(id)
  }
  selectedZones.value = new Set(selectedZones.value)
}

const zoneCount = computed(() => selectedZones.value.size)

const PRICING: Record<number, { monthly: number; annual: number }> = {
  1: { monthly: 190, annual: 150 },
  2: { monthly: 240, annual: 200 },
  3: { monthly: 290, annual: 250 },
  4: { monthly: 350, annual: 300 },
}

const selectedPrice = computed(() => {
  if (zoneCount.value === 0) return 0
  const tier = Math.min(zoneCount.value, 4)
  return PRICING[tier][billing.value]
})

const annualSavings = computed(() => {
  if (zoneCount.value === 0) return 0
  const tier = Math.min(zoneCount.value, 4)
  return (PRICING[tier].monthly - PRICING[tier].annual) * 12
})

// ─── Checkout ──────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')

async function startCheckout() {
  if (selectedZones.value.size === 0 || loading.value) return
  loading.value = true
  error.value = ''
  try {
    for (const zoneId of selectedZones.value) {
      const res = await $fetch<{ status: string; checkout_url: string }>('/api/v1/pro/zones/subscribe', {
        method: 'POST',
        body: { zone_id: zoneId, billing: billing.value },
      })
      if (res.status === 'SUCCESS' && res.checkout_url) {
        window.location.href = res.checkout_url
        return
      }
    }
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

      <!-- Already Premium -->
      <div v-if="isAlreadyPremium" class="flex items-start gap-3 p-5 bg-white border border-slate-200 rounded-sm shadow-sm mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-slate-900">Votre abonnement est actif.</p>
          <p class="text-xs text-slate-500 mt-0.5">Vous avez accès immédiat à toutes les coordonnées.</p>
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

      <!-- ═══ Section 2 : Toggle + Sélection ═══ -->
      <div class="bg-white border border-slate-200 rounded-sm p-6 md:p-8 mb-6">
        <!-- Toggle -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <span class="text-sm font-semibold" :class="billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'">Mensuel</span>
          <button
            @click="billing = billing === 'monthly' ? 'annual' : 'monthly'"
            class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-safety/50"
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

        <!-- Zones grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="zone in zones"
            :key="zone.id"
            @click="toggleZone(zone.id)"
            class="relative text-left p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer"
            :class="selectedZones.has(zone.id)
              ? 'border-safety bg-safety/5 shadow-md shadow-safety/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'"
          >
            <div
              v-if="selectedZones.has(zone.id)"
              class="absolute top-3 right-3 w-5 h-5 rounded-full bg-safety flex items-center justify-center"
            >
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p class="text-sm font-bold text-foreground">{{ zone.name }}</p>
            <p class="text-[11px] text-muted-foreground font-mono mt-1">{{ zone.postalCodes }}</p>
          </button>
        </div>
      </div>

      <!-- ═══ Section 3 : Récap + CTA ═══ -->
      <div v-if="zoneCount > 0" class="bg-white border border-slate-200 rounded-sm p-6 md:p-8 mb-8">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <p class="text-sm text-slate-500">{{ zoneCount }} zone{{ zoneCount > 1 ? 's' : '' }} sélectionnée{{ zoneCount > 1 ? 's' : '' }}</p>
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
          <p class="text-xs font-medium text-slate-500 mb-2">Zones actives :</p>
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
          @click="startCheckout"
          :disabled="loading"
          class="w-full h-12 px-8 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 bg-safety text-white hover:opacity-90 shadow-lg shadow-safety/20"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {{ loading ? 'Redirection vers Stripe…' : 'Démarrer mon abonnement' }}
        </button>
        <p class="text-xs text-slate-400 text-center mt-3">Paiement sécurisé par Stripe · CB requise</p>
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
