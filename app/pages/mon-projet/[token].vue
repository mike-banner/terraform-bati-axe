<template>
  <div class="min-h-screen bg-page text-foreground flex flex-col font-sans antialiased">

    <!-- Header minimal — accès par lien magique, pas de nav authentifiée -->
    <header class="sticky top-0 z-40 border-b border-border bg-page/95 backdrop-blur-sm">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-base font-bold tracking-tight text-foreground hover:opacity-70 transition-opacity">
          BÂTI-AXE
        </NuxtLink>
        <span class="text-xs text-muted-foreground font-medium tracking-wide">Suivi de projet</span>
      </div>
    </header>

    <main class="flex-grow">

      <!-- Loading -->
      <div v-if="pending" class="flex flex-col items-center justify-center py-32 gap-4">
        <div class="w-7 h-7 border-2 border-border border-t-foreground rounded-full animate-spin"></div>
        <p class="text-sm text-muted-foreground">Chargement de votre espace...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="error" class="max-w-md mx-auto px-6 py-32 text-center">
        <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-8">Erreur</p>
        <h1 class="text-3xl font-black tracking-tight text-foreground mb-4" style="text-wrap: balance">
          Lien invalide ou expiré
        </h1>
        <p class="text-sm text-muted-foreground leading-relaxed mb-8">
          Nous n'avons pas pu trouver de projet correspondant à ce lien sécurisé. Vérifiez votre SMS ou email d'origine.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 h-10 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity"
        >
          Retour à l'accueil
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </NuxtLink>
      </div>

      <!-- Vue principale -->
      <div v-else-if="data">

        <!-- Bandeau projet — fond noir, typographie forte -->
        <section class="bg-foreground text-background">
          <div class="max-w-6xl mx-auto px-6 py-14 md:py-20">
            <p class="text-xs font-medium tracking-widest uppercase text-background/40 mb-6">
              Votre projet · Bâti-Axe
            </p>
            <h1
              class="text-4xl sm:text-5xl md:text-[3.5rem] font-black tracking-tight leading-[1.05] mb-5"
              style="text-wrap: balance"
            >
              {{ data.project.category }}
            </h1>
            <p
              class="text-background/65 text-base leading-relaxed max-w-xl"
              style="text-wrap: pretty"
            >
              {{ data.project.description }}
            </p>
          </div>
        </section>

        <!-- Détails projet — grille avec séparateurs -->
        <section class="border-b border-border">
          <div class="max-w-6xl mx-auto px-6">
            <div class="grid grid-cols-2 md:grid-cols-4">
              <div class="py-7 pr-6 md:pr-10 border-r border-border">
                <p class="text-xs font-medium text-muted-foreground mb-1.5">Budget estimé</p>
                <p class="text-sm font-semibold text-foreground">{{ data.project.budget_range }}</p>
              </div>
              <div class="py-7 px-6 md:px-10 border-r border-border">
                <p class="text-xs font-medium text-muted-foreground mb-1.5">Délai souhaité</p>
                <p class="text-sm font-semibold text-foreground">{{ data.project.timeline_range || 'Non précisé' }}</p>
              </div>
              <div class="py-7 px-6 md:px-10 border-r border-border">
                <p class="text-xs font-medium text-muted-foreground mb-1.5">Statut du dossier</p>
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-foreground inline-block"></span>
                  <p class="text-sm font-semibold text-foreground">Actif</p>
                </div>
              </div>
              <div class="py-7 pl-6 md:pl-10">
                <p class="text-xs font-medium text-muted-foreground mb-1.5">Protection</p>
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                  </svg>
                  <p class="text-sm font-semibold text-foreground">RGPD conforme</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section artisans engagés — profil public + décision (REQ-06 / REQ-09) -->
        <section v-if="data.pros && data.pros.length" class="border-b border-border">
          <div class="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">Vos artisans</p>
            <h2 class="text-2xl font-black tracking-tight text-foreground mb-3">
              {{ data.pros.length }} artisan{{ data.pros.length > 1 ? 's' : '' }} certifié{{ data.pros.length > 1 ? 's' : '' }} sur votre projet
            </h2>
            <p class="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Consultez chaque profil, puis indiquez votre choix. Si aucun ne vous convient, votre projet sera automatiquement reproposé à de nouveaux artisans.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="pro in data.pros"
                :key="pro.lead_id"
                class="border border-border rounded-lg p-5 flex flex-col gap-4"
                :class="{ 'opacity-55': pro.customer_decision === 'refused' }"
              >
                <div class="flex items-center gap-4">
                  <div class="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0 select-none overflow-hidden">
                    <img v-if="pro.logo_url" :src="pro.logo_url" :alt="pro.company_name" class="w-full h-full object-cover" />
                    <span v-else>{{ pro.company_name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-semibold text-foreground text-sm truncate">{{ pro.company_name }}</h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <svg v-if="pro.is_verified" class="w-3 h-3 text-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                      </svg>
                      <p class="text-xs text-muted-foreground">{{ pro.is_verified ? 'Décennale vérifiée' : 'Artisan Bâti-Axe' }}</p>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 mt-auto">
                  <NuxtLink
                    v-if="pro.canonical_slug && pro.dept"
                    :to="`/pro/${pro.dept}/${pro.canonical_slug}`"
                    target="_blank"
                    class="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                  >
                    Voir le profil
                  </NuxtLink>

                  <template v-if="pro.customer_decision === 'pending'">
                    <button
                      type="button"
                      @click="decide(pro.lead_id, 'selected')"
                      :disabled="isDeciding === pro.lead_id"
                      class="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold bg-foreground text-background rounded-md hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      J'ai retenu celui-ci
                    </button>
                    <button
                      type="button"
                      @click="decide(pro.lead_id, 'refused')"
                      :disabled="isDeciding === pro.lead_id"
                      class="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold text-muted-foreground rounded-md hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      Pas intéressé
                    </button>
                  </template>
                  <span v-else-if="pro.customer_decision === 'selected'" class="text-xs font-semibold text-foreground">Retenu ✓</span>
                  <span v-else class="text-xs font-medium text-muted-foreground">Écarté</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section messages -->
        <section class="max-w-6xl mx-auto px-6 py-16 md:py-20">

          <!-- État vide : en attente d'artisans -->
          <div v-if="!data.messages || groupedMessages.length === 0">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div>
                <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-8">Artisans</p>
                <h2 class="text-3xl font-black tracking-tight text-foreground mb-4" style="text-wrap: balance">
                  Votre projet est en cours de validation.
                </h2>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Dès validation, les artisans partenaires de votre zone reçoivent une alerte SMS. Vous serez prévenu dès qu'un professionnel vous écrit ici.
                </p>
              </div>

              <div class="space-y-3">
                <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
                  <div class="w-7 h-7 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-foreground">Décennale vérifiée</p>
                    <p class="text-xs text-muted-foreground mt-0.5">Attestation contrôlée à la main avant tout accès au lead.</p>
                  </div>
                </div>
                <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
                  <div class="w-7 h-7 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-foreground">Vos coordonnées masquées</p>
                    <p class="text-xs text-muted-foreground mt-0.5">L'artisan vous contacte via notre messagerie. Vos données restent privées.</p>
                  </div>
                </div>
                <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
                  <div class="w-7 h-7 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-foreground">Zone d'intervention confirmée</p>
                    <p class="text-xs text-muted-foreground mt-0.5">Seuls les artisans actifs dans votre secteur voient votre projet.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fils de discussion -->
          <div v-else>
            <div class="mb-10">
              <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">Messages</p>
              <h2 class="text-2xl font-black tracking-tight text-foreground">
                {{ groupedMessages.length }}
                artisan{{ groupedMessages.length > 1 ? 's' : '' }}
                {{ groupedMessages.length > 1 ? 'ont' : 'a' }} pris contact
              </h2>
            </div>

            <div class="space-y-6">
              <div
                v-for="thread in groupedMessages"
                :key="thread.leadId"
                class="border border-border rounded-lg overflow-hidden"
              >
                <!-- En-tête du fil -->
                <div class="px-6 py-4 border-b border-border flex items-center gap-4 bg-background">
                  <div class="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0 select-none">
                    {{ thread.companyName.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-semibold text-foreground text-sm truncate">{{ thread.companyName }}</h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <svg class="w-3 h-3 text-muted-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                      </svg>
                      <p class="text-xs text-muted-foreground">Artisan qualifié Bâti-Axe</p>
                    </div>
                  </div>
                </div>

                <!-- Bulles de messages -->
                <div class="px-6 py-6 flex flex-col gap-3 max-h-96 overflow-y-auto bg-muted/30">
                  <div
                    v-for="msg in thread.messages"
                    :key="msg.id"
                    class="flex"
                    :class="msg.is_pro_sender ? 'justify-start' : 'justify-end'"
                  >
                    <div
                      class="max-w-[78%] px-4 py-3"
                      :class="msg.is_pro_sender
                        ? 'rounded-lg rounded-tl-none border border-border bg-background text-foreground'
                        : 'rounded-lg rounded-tr-none bg-foreground text-background'"
                    >
                      <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
                      <p
                        class="text-[10px] mt-1.5 text-right"
                        :class="msg.is_pro_sender ? 'text-muted-foreground' : 'text-background/50'"
                      >
                        {{ new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Zone de réponse -->
                <div class="px-6 py-4 border-t border-border bg-background">
                  <form @submit.prevent="sendMessage(thread.leadId)" class="flex gap-2">
                    <input
                      v-model="replyContent[thread.leadId]"
                      type="text"
                      placeholder="Votre réponse..."
                      class="flex-1 h-10 px-4 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground transition-all"
                      required
                      :disabled="isSending === thread.leadId"
                    />
                    <button
                      type="submit"
                      class="inline-flex items-center gap-1.5 h-10 px-5 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      :disabled="!replyContent[thread.leadId]?.trim() || isSending === thread.leadId"
                    >
                      <svg v-if="isSending === thread.leadId" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <span>{{ isSending === thread.leadId ? 'Envoi...' : 'Répondre' }}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border mt-auto">
      <div class="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>&copy; 2026 BÂTI-AXE. Tous droits réservés. Conforme RGPD.</p>
        <div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
          <span>Lien sécurisé · Données chiffrées</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
const route = useRoute()
const token = route.params.token

definePageMeta({
  layout: false
})

useHead({
  title: 'Suivi de mon projet — Bâti-Axe'
})

const { data, pending, error, refresh } = await useFetch(`/api/v1/magic-link/${token}`, { server: false })

// Réception live : rafraîchit les fils tant que la page est ouverte.
let pollTimer = null
onMounted(() => {
  pollTimer = setInterval(() => {
    if (!pending.value) refresh()
  }, 7000)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const groupedMessages = computed(() => {
  if (!data.value?.messages) return []

  const groups = {}
  data.value.messages.forEach(msg => {
    if (!groups[msg.lead_id]) {
      groups[msg.lead_id] = {
        leadId: msg.lead_id,
        companyName: msg.leads?.professionals?.company_name || 'Artisan inconnu',
        messages: []
      }
    }
    groups[msg.lead_id].messages.push(msg)
  })

  return Object.values(groups)
})

const replyContent = ref({})
const isSending = ref(null)
const isDeciding = ref(null)

// REQ-06 — Décision du particulier sur un artisan (retenir / écarter).
// La remise au marché automatique (si tout est refusé) est gérée côté serveur.
const decide = async (leadId, decision) => {
  isDeciding.value = leadId
  try {
    const res = await $fetch(`/api/v1/magic-link/${token}/decision`, {
      method: 'POST',
      body: { lead_id: leadId, decision }
    })
    await refresh()
    if (res?.relaunched) {
      alert('Aucun artisan retenu : votre projet est de nouveau proposé à de nouveaux professionnels.')
    }
  } catch {
    alert("Une erreur est survenue. Merci de réessayer.")
  } finally {
    isDeciding.value = null
  }
}

const sendMessage = async (leadId) => {
  const content = replyContent.value[leadId]
  if (!content?.trim()) return

  isSending.value = leadId

  try {
    await $fetch('/api/v1/messages', {
      method: 'POST',
      body: {
        lead_id: leadId,
        content: content.trim(),
        access_token: token
      }
    })

    replyContent.value[leadId] = ''
    await refresh()
  } catch {
    alert("Une erreur est survenue lors de l'envoi du message.")
  } finally {
    isSending.value = null
  }
}
</script>
