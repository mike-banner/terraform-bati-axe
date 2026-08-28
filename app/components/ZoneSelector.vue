<script setup lang="ts">
const billing = ref<'monthly' | 'annual'>('monthly')

const zones = [
  { id: '78-mantes', name: 'Mantes-la-Jolie', postalCodes: '78200, 78520, 78711…', icon: '🏙️', monthly: 190, annual: 150 },
  { id: '78-rambouillet', name: 'Rambouillet', postalCodes: '78120, 78610, 78730…', icon: '🌲', monthly: 240, annual: 200 },
  { id: '78-versailles', name: 'Versailles', postalCodes: '78000, 78150, 78220…', icon: '🏛️', monthly: 290, annual: 250 },
  { id: '78-stgermain', name: 'St-Germain-en-Laye', postalCodes: '78100, 78300, 78955…', icon: '🏰', monthly: 350, annual: 300 },
]

const selectedZone = ref<string | null>(null)

function getPrice(zone: typeof zones[number]) {
  return billing.value === 'monthly' ? zone.monthly : zone.annual
}

function getAnnualSavings(zone: typeof zones[number]) {
  return (zone.monthly - zone.annual) * 12
}

const loading = ref(false)
const error = ref('')

async function handleSubscribe() {
  if (!selectedZone.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ status: string; checkout_url: string }>('/api/v1/pro/zones/subscribe', {
      method: 'POST',
      body: { zone_id: selectedZone.value, billing: billing.value },
    })
    if (res.status === 'SUCCESS' && res.checkout_url) {
      window.location.href = res.checkout_url
    }
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Erreur lors de la souscription.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-3xl mx-auto space-y-6">

    <!-- Toggle Mensuel / Annuel -->
    <div class="flex items-center justify-center gap-3">
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

    <!-- Grille Zones -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="zone in zones"
        :key="zone.id"
        @click="selectedZone = zone.id"
        class="relative text-left p-4 rounded-lg border-2 transition-all duration-200"
        :class="selectedZone === zone.id
          ? 'border-safety bg-safety/5 shadow-md shadow-safety/10'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'"
      >
        <!-- Check indicator -->
        <div
          v-if="selectedZone === zone.id"
          class="absolute top-3 right-3 w-5 h-5 rounded-full bg-safety flex items-center justify-center"
        >
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div class="flex items-start gap-3">
          <span class="text-2xl mt-0.5">{{ zone.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-foreground">{{ zone.name }}</p>
            <p class="text-[11px] text-muted-foreground font-mono mt-0.5">{{ zone.postalCodes }}</p>
          </div>
        </div>

        <div class="mt-3 flex items-baseline gap-1.5">
          <span class="text-2xl font-black text-foreground">{{ getPrice(zone) }}€</span>
          <span class="text-xs text-muted-foreground">/mois</span>
        </div>

        <p v-if="billing === 'annual'" class="mt-1 text-[11px] font-semibold text-emerald-600">
          Économie {{ getAnnualSavings(zone) }}€/an
        </p>
        <p v-else class="mt-1 text-[11px] text-muted-foreground">
          Sans engagement
        </p>
      </button>
    </div>

    <!-- CTA -->
    <div class="text-center">
      <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
      <button
        @click="handleSubscribe"
        :disabled="!selectedZone || loading"
        class="h-12 px-8 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        :class="selectedZone
          ? 'bg-safety text-white hover:opacity-90 shadow-lg shadow-safety/20'
          : 'bg-slate-200 text-slate-400'"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        {{ loading ? 'Redirection…' : 'Choisir cette zone' }}
      </button>
      <p class="mt-2 text-[11px] text-muted-foreground">
        {{ billing === 'annual' ? 'Engagement 12 mois · Résiliation possible après' : 'Pas d\'engagement · Résiliez quand vous voulez' }}
      </p>
    </div>
  </div>
</template>
