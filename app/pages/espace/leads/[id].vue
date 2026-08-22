<script setup lang="ts">
import { computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'

useRequireAuth()
const route = useRoute()

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie & Gros Œuvre',
  toiture:      'Charpente & Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie & Chauffage',
  peinture:     'Peinture & Finitions',
  isolation:    'Isolation & Cloisons',
}

const TIMELINE_LABELS: Record<string, string> = {
  '1_semaine': "Moins d'1 semaine",
  '1_mois':   '1 mois',
  '3_mois':   '3 mois',
  '6_mois':   '6 mois',
  flexible:   'Flexible',
}

// useRequestFetch transmet le cookie d'auth au SSR (sinon 401 au rechargement).
const requestFetch = useRequestFetch()

const { data: lead, pending, error } = await useAsyncData(
  `lead-detail-${route.params.id}`,
  () => requestFetch<{ lead: any }>(`/api/v1/leads/${route.params.id}`).then(r => r.lead)
)

const isUnlocked = computed(() => lead.value?.status === 'unlocked')

// La messagerie est clé sur leads.id (= claim_id), PAS sur l'id projet de la route.
// `/api/v1/leads/[id]` renvoie ce claim_id ; on l'utilise pour GET/POST messages.
const claimId = computed<string | null>(() => lead.value?.claim_id ?? null)
const canChat = computed(() => isUnlocked.value && !!claimId.value)

// Only fetch messages if the lead is unlocked and a claim row exists
const { data: messagesData, refresh: refreshMessages } = await useAsyncData(
  `lead-messages-${route.params.id}`,
  () => claimId.value
    ? requestFetch<{ messages: any[] }>(`/api/v1/messages?lead_id=${claimId.value}`)
    : Promise.resolve({ messages: [] }),
  { watch: [claimId], immediate: false }
)

// Fetch manually if it's already unlocked on initial load
watchEffect(() => {
  if (canChat.value && !messagesData.value) {
    refreshMessages()
  }
})

// Réception live : rafraîchit le fil tant que la page est ouverte (client only).
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollTimer = setInterval(() => {
    if (canChat.value) refreshMessages()
  }, 7000)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const messages = computed(() => messagesData.value?.messages || [])
const chatInput = ref('')
const isSending = ref(false)

async function sendChatMessage() {
  if (!chatInput.value.trim() || isSending.value || !claimId.value) return
  isSending.value = true
  try {
    await $fetch('/api/v1/messages', {
      method: 'POST',
      body: {
        lead_id: claimId.value,
        content: chatInput.value.trim()
      }
    })
    chatInput.value = ''
    await refreshMessages()
  } catch (err) {
    alert("Impossible d'envoyer le message.")
  } finally {
    isSending.value = false
  }
}

useHead({
  title: computed(() => `Lead ${CATEGORY_LABELS[lead.value?.category] ?? lead.value?.category ?? ''} — BÂTI-AXE`)
})


const isLocked   = computed(() => lead.value?.status === 'locked')

// Arrivée depuis l'email d'alerte (P4) : bandeau contextuel « vous avez été alerté »
const fromEmailAlert = computed(() => route.query.src === 'email')

const formattedDate = computed(() =>
  lead.value?.created_at
    ? new Date(lead.value.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
)

// Score de qualification (D-12) — l'essentiel de l'offre, visible même verrouillé
const qualifyBadges = computed(() => [
  { key: 'budget',       ok: lead.value?.qualify_budget ?? false,       label: 'Budget renseigné' },
  { key: 'phone',        ok: lead.value?.qualify_phone ?? false,        label: 'Téléphone vérifié' },
  { key: 'description',  ok: lead.value?.qualify_description ?? false,  label: 'Description détaillée' },
  { key: 'returning',    ok: lead.value?.qualify_returning ?? false,    label: 'Client récurrent' },
])


async function updateLeadStatus(newStatus: string) {
  if (!lead.value) return
  const oldStatus = lead.value.db_status
  lead.value.db_status = newStatus
  try {
    await $fetch(`/api/v1/leads/${route.params.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
  } catch (err) {
    lead.value.db_status = oldStatus
    alert("Impossible de mettre à jour le statut du lead.")
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* silent */ }
}
</script>

<template>
  <div class="w-full max-w-4xl px-6 py-8 md:px-10 md:py-12">

    <!-- Back link -->
    <NuxtLink
      to="/espace/leads"
      class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:opacity-70 transition-opacity mb-8"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Retour à mes leads
    </NuxtLink>

    <!-- Bandeau : arrivée depuis l'email d'alerte (P4) -->
    <div v-if="fromEmailAlert" class="flex items-start gap-3 p-4 border border-safety/30 bg-safety/5 rounded-sm mb-6">
      <svg class="w-4 h-4 shrink-0 mt-0.5 text-safety" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
      </svg>
      <div>
        <p class="text-sm font-semibold text-slate-900">Vous avez été alerté de ce chantier</p>
        <p class="text-xs text-slate-600 mt-0.5">Il correspond à vos catégories. Voici l'essentiel de l'offre — les coordonnées du client suivent la règle d'accès habituelle.</p>
      </div>
    </div>

    <!-- Loading -->
    <template v-if="pending">
      <div class="h-8 bg-muted rounded animate-pulse mb-4 w-64" />
      <div class="h-4 bg-muted rounded animate-pulse mb-8 w-40" />
      <div class="border border-border rounded-lg h-48 bg-muted animate-pulse" />
    </template>

    <!-- Error -->
    <div v-else-if="error" class="p-4 border border-border rounded-lg">
      <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger ce lead</p>
      <p class="text-xs text-muted-foreground">Réessayez dans quelques instants ou retournez à la liste.</p>
    </div>

    <!-- Content -->
    <template v-else-if="lead">

      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <!-- Locked badge -->
          <span v-if="isLocked" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-amber-300 text-amber-700 bg-amber-50">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            Flouté
          </span>
          <!-- Unlocked badge -->
          <span v-else-if="isUnlocked" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-foreground/30 text-foreground">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            Débloqué
          </span>
          <!-- Claimed badge -->
          <span v-else class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-border text-muted-foreground">
            Déjà attribué
          </span>
        </div>
        <h1 class="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
          {{ CATEGORY_LABELS[lead.category] ?? lead.category }}
        </h1>
        <p class="text-xs text-slate-500 mt-2">Reçu le {{ formattedDate }}</p>
      </div>

      <!-- Focus sur l'offre : l'essentiel du chantier, verrouillé ou non (P4) -->
      <div class="bg-slate-900 rounded-sm p-6 md:p-8 mb-8 shadow-lg">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Budget</p>
            <p class="text-xl md:text-2xl font-black text-white">{{ lead.budget_range }}</p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Délai</p>
            <p class="text-xl md:text-2xl font-black text-white">{{ TIMELINE_LABELS[lead.timeline_range] ?? (lead.timeline_range || '—') }}</p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Qualification</p>
            <p class="text-xl md:text-2xl font-black text-white">{{ lead.qualify_score ?? 0 }}/4</p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Client</p>
            <p class="text-xl md:text-2xl font-black text-white">{{ lead.qualify_returning ? 'Récurrent' : 'Nouveau' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-5 pt-5 border-t border-slate-700">
          <div class="flex items-center gap-1.5">
            <span v-for="b in qualifyBadges" :key="b.key" :title="b.label"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border"
              :class="b.ok ? 'border-safety/50 bg-safety/15 text-safety' : 'border-slate-600 text-slate-500'">
              <svg v-if="b.ok" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              {{ b.label }}
            </span>
          </div>
          <span class="ml-auto hidden md:inline-flex items-center gap-1.5 text-xs font-semibold"
            :class="isLocked ? 'text-amber-400' : 'text-emerald-400'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path v-if="isLocked" stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            {{ isLocked ? 'Coordonnées bloquées' : 'Coordonnées débloquées' }}
          </span>
        </div>
      </div>

      <!-- Project details (always visible) -->
      <div class="bg-white rounded-sm p-8 border border-slate-200 shadow-sm mb-8">
        <h2 class="text-xs font-medium text-slate-500 tracking-widest uppercase mb-4">Détails du projet</h2>
        <div class="border border-slate-200 rounded-sm divide-y divide-slate-200">
          <div class="flex justify-between items-center px-5 py-3">
            <span class="text-sm text-slate-500">Budget</span>
            <span class="text-sm font-semibold text-slate-900">{{ lead.budget_range }}</span>
          </div>
          <div v-if="lead.timeline_range" class="flex justify-between items-center px-5 py-3">
            <span class="text-sm text-slate-500">Délai</span>
            <span class="text-sm font-semibold text-slate-900">{{ TIMELINE_LABELS[lead.timeline_range] ?? lead.timeline_range }}</span>
          </div>
          <div class="px-5 py-3">
            <span class="text-sm text-slate-500 block mb-1">Description</span>
            <span v-if="isUnlocked" class="text-sm text-slate-900">{{ lead.description }}</span>
            <span v-else class="text-sm text-slate-500 font-mono select-none" aria-hidden="true">*** *** ***</span>
          </div>
        </div>
      </div>

      <!-- Contact section (conditional on status) -->
      <div class="bg-white rounded-sm p-8 border border-slate-200 shadow-sm">
        <h2 class="text-xs font-medium text-slate-500 tracking-widest uppercase mb-4">Contact prospect</h2>

        <!-- Unlocked: show real contact data -->
        <template v-if="isUnlocked">
          <div class="border border-border rounded-lg divide-y divide-border mb-4">
            <div class="flex items-center gap-3 px-5 py-3">
              <svg class="w-3.5 h-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
              <span class="text-sm font-semibold text-foreground">{{ lead.customer_name }}</span>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <svg class="w-3.5 h-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              <span class="text-sm font-semibold text-foreground flex items-center gap-2">
                {{ lead.customer_phone }}
                <button @click="copyToClipboard(lead.customer_phone)" title="Copier le numéro" class="text-muted-foreground hover:text-foreground transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
                  </svg>
                </button>
              </span>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <svg class="w-3.5 h-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
              </svg>
              <span class="text-sm font-semibold text-foreground">{{ lead.customer_email }}</span>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <svg class="w-3.5 h-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
              </svg>
              <span class="text-sm text-foreground">{{ lead.postal_code }}</span>
            </div>
          </div>
          <div class="flex gap-3">
            <a
              :href="`tel:${lead.customer_phone}`"
              class="flex-1 inline-flex items-center justify-center gap-2 h-10 border border-slate-200 text-slate-900 text-sm font-medium rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              Appeler
            </a>
            <a
              :href="`mailto:${lead.customer_email}`"
              class="flex-1 inline-flex items-center justify-center gap-2 h-10 border border-slate-200 text-slate-900 text-sm font-medium rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
              </svg>
              Envoyer un email
            </a>
          </div>

          <!-- Integrated Chat Section -->
          <div class="mt-8 border-t border-slate-200 pt-8">
            <h2 class="text-xs font-medium text-slate-500 tracking-widest uppercase mb-4">Messages avec le client</h2>

            <div class="bg-slate-50 border border-slate-200 rounded-sm overflow-hidden flex flex-col h-96">
              <!-- Message list -->
              <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <div v-if="messages.length === 0" class="text-center text-sm text-slate-500 my-auto">
                  Aucun message. Envoyez le premier !
                </div>

                <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.is_pro_sender ? 'justify-end' : 'justify-start'">
                  <div class="max-w-[80%] rounded-2xl px-4 py-2 shadow-sm text-sm"
                       :class="msg.is_pro_sender ? 'bg-safety text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'">
                    <p class="whitespace-pre-wrap">{{ msg.content }}</p>
                    <p class="text-[10px] mt-1 text-right opacity-70">
                      {{ new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Input -->
              <div class="p-3 bg-white border-t border-slate-200">
                <p v-if="!claimId" class="text-xs text-slate-500 text-center py-1">
                  Conversation indisponible pour ce lead.
                </p>
                <form v-else @submit.prevent="sendChatMessage" class="flex flex-col gap-1">
                  <div class="flex gap-2">
                  <input
                    v-model="chatInput"
                    type="text"
                    placeholder="Votre message..."
                    maxlength="1000"
                    class="flex-1 h-9 rounded-full border-slate-200 text-sm px-4 focus:ring-1 focus:ring-safety/30 focus:border-safety"
                    required
                    :disabled="isSending"
                  />
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold rounded-full bg-safety text-white hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    :disabled="!chatInput || isSending"
                  >
                    Envoyer
                  </button>
                  </div>
                  <p v-if="chatInput.length > 800" class="text-xs text-muted-foreground text-right px-1">{{ chatInput.length }} / 1000</p>
                </form>
              </div>
            </div>
          </div>

          <!-- CRM Status Tracker -->
          <div class="mt-8 border-t border-slate-200 pt-8">
            <h2 class="text-xs font-medium text-slate-500 tracking-widest uppercase mb-4">Statut de la prospection</h2>
            <select
              :value="lead.db_status"
              @change="updateLeadStatus(($event.target as HTMLSelectElement).value)"
              class="w-full px-4 py-3 border border-slate-200 rounded-full text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-safety/30 appearance-none cursor-pointer"
            >
              <option value="new">Nouveau lead (À contacter)</option>
              <option value="contacted">Déjà contacté (En attente/Devis)</option>
              <option value="won">Chantier gagné (Signé)</option>
              <option value="lost">Chantier perdu</option>
            </select>
          </div>
        </template>

        <!-- Locked: page « lead non accessible » — Premium ou attente 48h -->
        <template v-else-if="isLocked">
          <div class="border border-amber-300 bg-amber-50/60 rounded-sm overflow-hidden">
            <div class="flex flex-col items-center text-center px-8 py-10">
              <div class="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-slate-900">Lead non accessible</h2>

              <template v-if="lead.requiresDocuments">
                <p class="text-sm text-slate-600 mt-2 max-w-sm">
                  Déposez vos documents (Kbis et décennale) pour débloquer vos <strong>3 leads gratuits</strong>.
                </p>
                <NuxtLink
                  to="/espace/dashboard"
                  class="inline-flex items-center gap-2 h-10 px-6 mt-5 rounded-full bg-safety text-white text-xs font-semibold hover:scale-105 shadow-safety/20 transition-transform"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Déposer mes documents
                </NuxtLink>
              </template>

              <template v-else>
                <p class="text-sm text-slate-600 mt-2 max-w-sm">
                  Passez <strong>Premium</strong> pour accéder aux coordonnées immédiatement,
                  ou attendez <strong>48 h</strong> : le lead se débloquera automatiquement.
                </p>
                <div class="mt-4">
                  <LeadCountdown v-if="lead.unlocked_at" :unlocked-at="lead.unlocked_at" />
                  <p v-else class="text-xs text-amber-700">Déblocage automatique sous 48 h.</p>
                </div>
                <div class="flex flex-col sm:flex-row items-center gap-3 mt-6">
                  <NuxtLink
                    to="/espace/premium"
                    class="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-safety text-white text-sm font-semibold hover:scale-105 shadow-safety/20 transition-transform"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                    </svg>
                    Passer Premium maintenant
                  </NuxtLink>
                  <NuxtLink
                    to="/espace/premium"
                    class="inline-flex items-center h-10 px-4 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    Voir l'offre Premium
                  </NuxtLink>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- Claimed -->
        <template v-else>
          <div class="border border-slate-200 rounded-sm p-5">
            <p class="text-sm text-slate-500 text-center">Ce lead a déjà été attribué à un autre professionnel.</p>
          </div>
        </template>
      </div>

    </template>

  </div>
</template>
