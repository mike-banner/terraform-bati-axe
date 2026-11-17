<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Mes dossiers — BÂTI-AXE',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }],
})

type LotState = 'waiting' | 'to_choose' | 'retained' | 'closed'
interface Dossier {
  id: string; ref: string; created_at: string; need_type: string; project_location: string | null
  lots: { label: string, state: LotState, pro: string | null }[]
  next_action: 'sign_framework' | 'choose_pro' | 'submit_quote' | null
}
interface View { contact: { name: string, company: string | null, phone: string, email: string } | null, dossiers: Dossier[] }

const route = useRoute()
const token = String(route.params.token ?? '')

const { data, error } = await useFetch<View>(`/api/v1/b2b/my-requests/${token}`, { key: `mes-dossiers-${token}` })

const LOT_STATE: Record<LotState, string> = {
  waiting: 'En attente d’artisans',
  to_choose: 'Artisans positionnés : à vous de choisir',
  retained: 'Artisan retenu',
  closed: 'Clos',
}
const ACTION: Record<string, string> = {
  sign_framework: 'Convention à signer',
  choose_pro: 'Choisissez votre artisan',
  submit_quote: 'Devis signé à déposer',
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const opening = ref<string | null>(null)
const openError = ref<string | null>(null)
async function openDossier(d: Dossier) {
  opening.value = d.id
  openError.value = null
  try {
    const res = await $fetch<{ url: string }>(`/api/v1/b2b/my-requests/${token}/open`, { method: 'POST', body: { request_id: d.id } })
    await navigateTo(res.url)
  } catch (e: any) {
    openError.value = e?.data?.statusMessage || 'Ouverture impossible. Réessayez.'
  } finally {
    opening.value = null
  }
}

// Nouveau dossier : le formulaire reprend les coordonnées déjà connues (lues dans sessionStorage, jamais dans l'URL).
function newDossier() {
  try {
    if (data.value?.contact) sessionStorage.setItem('b2b-prefill', JSON.stringify(data.value.contact))
  } catch { /* stockage indisponible : le formulaire reste vide */ }
  return navigateTo('/b2b/partenaires')
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
      <div v-if="error" class="border border-border rounded-sm p-6 text-center space-y-3" data-testid="mes-dossiers-expired">
        <h1 class="text-xl font-bold">Lien invalide ou expiré</h1>
        <p class="text-sm text-muted-foreground">Ce lien est valable 24 heures. Demandez-en un nouveau.</p>
        <NuxtLink to="/b2b/mes-dossiers" class="inline-block text-sm font-semibold underline underline-offset-4">Recevoir un nouveau lien</NuxtLink>
      </div>

      <template v-else-if="data">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 class="text-2xl font-black tracking-tight">Mes dossiers</h1>
            <p v-if="data.contact" class="text-sm text-muted-foreground">{{ data.contact.name }}<template v-if="data.contact.company"> · {{ data.contact.company }}</template></p>
          </div>
          <button
            type="button" data-testid="mes-dossiers-nouveau"
            class="h-11 px-5 text-sm font-semibold rounded-sm bg-safety text-white"
            @click="newDossier"
          >
            Nouveau dossier
          </button>
        </div>

        <p v-if="openError" role="alert" class="text-sm text-destructive">{{ openError }}</p>

        <p v-if="!data.dossiers.length" class="text-sm text-muted-foreground" data-testid="mes-dossiers-vide">Aucun dossier associé à cette adresse.</p>

        <ul v-else class="border-t border-b border-border divide-y divide-border" data-testid="mes-dossiers-liste">
          <li v-for="d in data.dossiers" :key="d.id" class="py-4 flex items-start gap-3">
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
            <div class="flex-1 min-w-0 space-y-1">
              <p class="text-sm font-semibold">
                Dossier {{ d.ref }}
                <span class="font-normal text-muted-foreground">· déposé le {{ fmtDate(d.created_at) }}<template v-if="d.project_location"> · {{ d.project_location }}</template></span>
              </p>
              <p v-if="d.need_type === 'partenariat_regulier'" class="text-sm text-muted-foreground">Demande de partenariat régulier : notre équipe vous recontacte.</p>
              <ul v-else-if="d.lots.length" class="text-sm text-muted-foreground space-y-0.5">
                <li v-for="l in d.lots" :key="l.label">
                  {{ l.label }} : {{ LOT_STATE[l.state] }}<template v-if="l.pro"> ({{ l.pro }})</template>
                </li>
              </ul>
              <p v-else class="text-sm text-muted-foreground">En cours de traitement par notre équipe.</p>
              <p v-if="d.next_action" class="text-sm font-semibold" data-testid="mes-dossiers-action">À faire : {{ ACTION[d.next_action] }}</p>
            </div>
            <button
              type="button" :disabled="opening === d.id" :aria-label="`Ouvrir le dossier ${d.ref}`"
              class="shrink-0 h-11 px-4 text-sm font-semibold underline underline-offset-4 hover:opacity-70 disabled:opacity-40"
              @click="openDossier(d)"
            >
              {{ opening === d.id ? 'Ouverture…' : 'Ouvrir' }}
            </button>
          </li>
        </ul>
      </template>
    </main>
  </div>
</template>
