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
  <div class="min-h-[calc(100vh-3.5rem)] bg-page">
    <div class="w-full max-w-4xl px-6 py-8 md:px-10 md:py-16">

      <!-- Success banner (post-checkout redirect) -->
      <div v-if="showSuccessBanner" class="flex items-start gap-3 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-slate-900">Bienvenue dans BÂTI-AXE Premium !</p>
          <p class="text-xs text-slate-500 mt-0.5">Vos leads sont maintenant accessibles sans délai.</p>
        </div>
      </div>

      <!-- Already Premium banner -->
      <div v-if="isAlreadyPremium" class="flex items-start gap-3 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-8">
        <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-slate-900">Votre abonnement Premium est actif.</p>
          <p class="text-xs text-slate-500 mt-0.5">Vous avez accès immédiat à toutes les coordonnées.</p>
        </div>
      </div>

      <!-- Hero -->
      <div class="mb-12">
        <p class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-6">Abonnement</p>
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style="text-wrap: balance">
          Premier contact exclusif.
        </h1>
        <p class="text-base text-slate-600 mt-4 leading-relaxed">
          Accédez aux coordonnées du prospect dès la qualification — 72h avant les autres pros de votre métier.
        </p>
      </div>

      <!-- Trial callout -->
      <div class="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-2xl mb-4">
        <svg class="w-4 h-4 text-slate-500 shrink-0 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1010.058 8.4M12 4.875A2.625 2.625 0 1113.942 8.4M12 4.875V21m-9.375-9.75h18.75M6.375 8.4H3.75a1.5 1.5 0 000 3h15a1.5 1.5 0 000-3h-2.625M12 4.875a2.625 2.625 0 00-2.625 2.625h5.25A2.625 2.625 0 0012 4.875z"/>
        </svg>
        <p class="text-sm text-slate-900">
          <span class="font-semibold">14 jours gratuits</span>
          <span class="text-slate-500"> — carte bancaire requise. Facturation automatique après 14 jours si non annulé.</span>
        </p>
      </div>

      <!-- Price card (bento, mise en avant) -->
      <div class="bento-card border-2 border-safety bg-white rounded-3xl p-8 md:p-10 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-4">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-safety text-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
            </svg>
            Recommandé
          </span>
        </div>
        <p class="text-4xl font-black tracking-tight text-slate-900 mb-1">
          39 €<span class="text-sm font-semibold text-slate-500">/mois</span>
        </p>
        <p class="text-xs text-slate-500 mb-6">Sans engagement · Annulable à tout moment</p>

        <div class="space-y-3 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-slate-900">Accès immédiat aux coordonnées du prospect</span>
          </div>
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-slate-900">3 leads gratuits inclus en BASIC — illimités en Premium</span>
          </div>
          <div class="flex items-start gap-3">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="text-sm text-slate-900">Exclusivité 72h avant les pros BASIC</span>
          </div>
        </div>

        <button
          v-if="!isAlreadyPremium"
          @click="startCheckout"
          :disabled="loading"
          :aria-busy="loading"
          class="inline-flex items-center justify-center gap-2 w-full h-12 px-8 bg-safety text-white text-sm font-semibold rounded-full shadow-safety/20 shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <span v-if="!loading">Démarrer votre essai gratuit — 14 jours offerts</span>
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Redirection...
          </span>
        </button>
        <div v-else class="w-full h-12 flex items-center justify-center text-sm font-medium text-slate-400">
          Abonnement actif
        </div>
        <p class="text-xs text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
          Paiement sécurisé par Stripe · CB requise · Facturation après 14 jours
        </p>
      </div>

      <!-- Comparison table -->
      <div class="border-t border-slate-200 pt-8 mb-8">
        <h2 class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">BASIC vs Premium</h2>
        <div class="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
          <div class="grid grid-cols-3 px-5 py-3 text-xs font-medium text-slate-500">
            <span></span>
            <span class="text-center">BASIC</span>
            <span class="text-center">Premium</span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-slate-900">Voir les leads</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-slate-900">Coordonnées immédiates</span>
            <span class="text-center text-slate-400">—</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-slate-900">Accès après 72h</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
          </div>
          <div class="grid grid-cols-3 items-center px-5 py-3">
            <span class="text-sm text-slate-900">3 leads gratuits</span>
            <span class="flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            <span class="text-center text-xs font-semibold text-safety">Illimité</span>
          </div>
        </div>
      </div>

      <!-- ROI section (carte contrastée) -->
      <div class="border-t border-slate-200 pt-8 mb-8">
        <h2 class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">Retour sur investissement</h2>
        <div class="bento-card bg-industrial text-white rounded-3xl p-6 md:p-8">
          <p class="text-lg font-bold mb-2" style="text-wrap: balance">
            1 chantier signé rembourse 6 mois d'abonnement.
          </p>
          <p class="text-sm text-white/70 leading-relaxed">
            Un chantier moyen en rénovation représente 8 000 € de chiffre d'affaires. Votre abonnement : 39€/mois.
          </p>
        </div>
      </div>

      <!-- FAQ -->
      <div class="border-t border-slate-200 pt-8">
        <h2 class="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">Questions fréquentes</h2>
        <div class="space-y-2">
          <details class="bg-white rounded-2xl border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Puis-je annuler à tout moment ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500">Oui, sans frais et immédiatement depuis votre espace.</p>
          </details>
          <details class="bg-white rounded-2xl border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Que se passe-t-il si j'annule ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500">Votre accès Premium reste actif jusqu'à la fin de la période en cours.</p>
          </details>
          <details class="bg-white rounded-2xl border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Le paiement est-il sécurisé ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500">Oui, les paiements sont traités par Stripe, certifié PCI DSS.</p>
          </details>
          <details class="bg-white rounded-2xl border border-slate-200 group">
            <summary class="px-5 py-4 text-sm font-semibold text-slate-900 cursor-pointer select-none list-none flex items-center justify-between">
              Que se passe-t-il après mes 14 jours d'essai ?
              <svg class="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </summary>
            <p class="px-5 pb-4 text-sm text-slate-500">Si vous n'annulez pas pendant la période d'essai, votre abonnement est automatiquement activé à 39€/mois. Vous pouvez annuler à tout moment depuis votre espace.</p>
          </details>
        </div>
      </div>

    </div>
  </div>
</template>
