<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Mes dossiers — BÂTI-AXE',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) && email.value.length <= 254)

async function submit() {
  if (!emailOk.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    await $fetch('/api/v1/b2b/my-requests/link', { method: 'POST', body: { email: email.value.trim() } })
    sent.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Envoi impossible. Réessayez plus tard.'
  } finally {
    busy.value = false
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

    <main class="flex-grow max-w-xl w-full mx-auto px-6 py-12 space-y-6">
      <h1 class="text-2xl font-black tracking-tight">Retrouver mes dossiers</h1>

      <div v-if="sent" role="status" class="border border-border rounded-sm p-5 space-y-2" data-testid="mes-dossiers-sent">
        <p class="text-sm font-semibold">Vérifiez votre boîte mail.</p>
        <p class="text-sm text-muted-foreground">
          Si des dossiers sont associés à cette adresse, vous recevrez dans quelques instants un lien valable 24 heures.
          Pensez à regarder vos courriers indésirables.
        </p>
      </div>

      <form v-else class="space-y-4" novalidate @submit.prevent="submit">
        <p class="text-sm text-muted-foreground max-w-prose">
          Saisissez l’adresse e-mail utilisée pour vos demandes. Nous vous envoyons un lien personnel : pas de mot de passe à retenir.
        </p>
        <div>
          <label for="mes-dossiers-email" class="block text-sm font-medium mb-1">Adresse e-mail</label>
          <input
            id="mes-dossiers-email" v-model="email" type="email" inputmode="email" required maxlength="254" autocomplete="email"
            placeholder="marie@cabinet-syndic.fr" data-testid="mes-dossiers-email"
            class="h-11 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
          <p v-if="email && !emailOk" class="mt-1 text-xs text-destructive">Adresse e-mail invalide.</p>
        </div>
        <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
        <button
          type="submit" :disabled="!emailOk || busy" data-testid="mes-dossiers-submit"
          class="h-11 px-5 text-sm font-semibold rounded-sm bg-safety text-white disabled:opacity-40"
        >
          {{ busy ? 'Envoi…' : 'Recevoir mon lien' }}
        </button>
      </form>

      <p class="text-sm text-muted-foreground">
        Pas encore de dossier ?
        <NuxtLink to="/b2b/partenaires" class="underline underline-offset-4 hover:text-foreground">Déposer un projet</NuxtLink>
      </p>
    </main>
  </div>
</template>
