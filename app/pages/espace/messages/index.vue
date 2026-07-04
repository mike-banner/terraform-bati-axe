<template>
  <div class="max-w-2xl mx-auto px-6 py-16">
    <div class="mb-8">
      <h1 class="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">Messagerie</h1>
      <p class="text-slate-500 mt-2">Discutez avec les particuliers de vos chantiers débloqués.</p>
    </div>

    <!-- Loading -->
    <template v-if="pending">
      <div class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-24 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div v-if="conversations.length === 0" class="text-center py-16 border border-slate-200 rounded-3xl bg-white">
        <svg class="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-lg font-semibold text-slate-900 mb-1">Aucune conversation</h3>
        <p class="text-sm text-slate-500 max-w-sm mx-auto">Vous n'avez pas encore envoyé ou reçu de messages. Débloquez un lead pour initier le contact.</p>
        <NuxtLink to="/espace/leads" class="mt-6 inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-full bg-safety text-white hover:scale-105 shadow-safety/20 transition-transform">
          Voir les leads
        </NuxtLink>
      </div>

      <div v-else class="space-y-3 reveal">
        <NuxtLink
          v-for="conv in conversations"
          :key="conv.lead_id"
          :to="`/espace/leads/${conv.lead_id}`"
          class="reveal-item bento-card block p-6 bg-white border border-slate-200 rounded-3xl shadow-sm"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-bold text-slate-900">{{ conv.customer_name }}</h3>
                <span class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {{ conv.category }}
                </span>
              </div>
              <p class="text-sm text-slate-500 line-clamp-1">
                {{ conv.last_message || 'Cliquez pour envoyer le premier message' }}
              </p>
            </div>
            <div v-if="conv.last_message_date" class="text-[10px] text-slate-400 whitespace-nowrap">
              {{ new Date(conv.last_message_date).toLocaleDateString() }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
useRequireAuth()

useHead({
  title: 'Messagerie — BÂTI-AXE'
})

// useRequestFetch transmet le cookie d'auth au SSR (sinon 401 au rechargement).
const requestFetch = useRequestFetch()

// Leads débloqués + dernier message réel par lead (clé claim_id).
const { data, pending } = await useAsyncData(
  'pro-conversations',
  async () => {
    const [{ leads }, { lastByLead }] = await Promise.all([
      requestFetch<{ leads: any[] }>('/api/v1/leads'),
      requestFetch<{ lastByLead: Record<string, { content: string; created_at: string; is_pro_sender: boolean }> }>(
        '/api/v1/messages/recent'
      ),
    ])

    const unlockedLeads = leads.filter(l => l.status === 'unlocked')

    return unlockedLeads
      .map((l) => {
        const last = l.claim_id ? lastByLead[l.claim_id] : null
        return {
          lead_id: l.id, // id projet — sert au routage /espace/leads/[id]
          customer_name: l.customer_name,
          category: l.category,
          last_message: last
            ? (last.is_pro_sender ? 'Vous : ' : '') + last.content
            : '',
          last_message_date: last?.created_at ?? null,
        }
      })
      // Conversations actives (avec message) d'abord, du plus récent au plus ancien.
      .sort((a, b) => {
        if (!a.last_message_date && !b.last_message_date) return 0
        if (!a.last_message_date) return 1
        if (!b.last_message_date) return -1
        return new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime()
      })
  }
)

const conversations = computed(() => data.value || [])
</script>
