<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

useHead({ title: 'Passer Premium — BÂTI-AXE' })

watchEffect(() => {
  if (user.value === null) navigateTo('/pro/claim')
})

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

const loading = ref(false)
const startCheckout = async () => {
  loading.value = true
  try {
    const data = await $fetch<{ url: string }>('/api/v1/stripe/checkout', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-background">
    <div class="max-w-2xl mx-auto px-6 py-16">

      <!-- Success banner (post-checkout redirect) -->
      <div v-if="showSuccessBanner" class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-foreground">Bienvenue dans BÂTI-AXE Premium !</p>
          <p class="text-xs text-muted-foreground mt-0.5">Vos leads sont maintenant accessibles sans délai.</p>
        </div>
      </div>

      <!-- Already Premium banner -->
      <div v-if="isAlreadyPremium" class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-foreground">Votre abonnement Premium est actif.</p>
          <p class="text-xs text-muted-foreground mt-0.5">Vous avez accès immédiat à toutes les coordonnées.</p>
        </div>
      </div>

      <!-- Header -->
      <div class="mb-10">
        <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">Abonnement</p>
        <h1 class="text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">
          Débloquez vos leads instantanément.
        </h1>
        <p class="text-sm text-muted-foreground mt-2 leading-relaxed">
          Les pros Premium voient les coordonnées du prospect dès la qualification du projet — 72h avant les autres.
        </p>
      </div>

      <!-- Price card -->
      <div class="border border-amber-300 bg-amber-50 rounded-lg p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-amber-300 text-amber-700">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
            </svg>
            Premium
          </span>
        </div>
        <p class="text-4xl font-black tracking-tight text-foreground mb-1">
          39 €<span class="text-lg font-medium text-muted-foreground">/mois</span>
        </p>
        <p class="text-xs text-muted-foreground mb-6">Sans engagement · Annulable à tout moment</p>

        <div class="space-y-3 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-foreground">Accès immédiat aux coordonnées du prospect</span>
          </div>
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-foreground">Exclusivité 72h avant les pros BASIC</span>
          </div>
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-foreground">Leads illimités dans votre catégorie</span>
          </div>
        </div>

        <button
          v-if="!isAlreadyPremium"
          @click="startCheckout"
          :disabled="loading"
          :aria-busy="loading"
          class="inline-flex items-center justify-center gap-2 w-full h-11 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <span v-if="!loading">Démarrer Premium — 39€/mois</span>
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Redirection...
          </span>
        </button>
        <div v-else class="w-full h-11 flex items-center justify-center text-sm font-medium text-foreground/60">
          Abonnement actif
        </div>
        <p class="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
          Paiement sécurisé par Stripe
        </p>
      </div>

      <!-- Comparison table -->
      <div class="border-t border-border pt-8 mb-8">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">BASIC vs Premium</h2>
        <div class="border border-border rounded-lg divide-y divide-border">
          <div class="grid grid-cols-3 px-5 py-3 text-xs font-medium text-muted-foreground">
            <span></span>
            <span class="text-center">BASIC</span>
            <span class="text-center">Premium</span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-foreground">Voir les leads</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-foreground">Coordonnées immédiates</span>
            <span class="text-center text-muted-foreground">—</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-foreground">Accès après 72h</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="border-t border-border pt-8">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Questions fréquentes</h2>
        <div class="space-y-2">
          <details class="border border-border rounded-lg group">
            <summary class="px-5 py-4 text-sm font-medium text-foreground cursor-pointer select-none list-none flex items-center justify-between">
              Puis-je annuler à tout moment ?
              <svg class="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-muted-foreground">Oui, sans frais et immédiatement depuis votre espace.</p>
          </details>
          <details class="border border-border rounded-lg group">
            <summary class="px-5 py-4 text-sm font-medium text-foreground cursor-pointer select-none list-none flex items-center justify-between">
              Que se passe-t-il si j'annule ?
              <svg class="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-muted-foreground">Votre accès Premium reste actif jusqu'à la fin de la période en cours.</p>
          </details>
          <details class="border border-border rounded-lg group">
            <summary class="px-5 py-4 text-sm font-medium text-foreground cursor-pointer select-none list-none flex items-center justify-between">
              Le paiement est-il sécurisé ?
              <svg class="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-muted-foreground">Oui, les paiements sont traités par Stripe, certifié PCI DSS.</p>
          </details>
        </div>
      </div>

    </div>
  </div>
</template>
