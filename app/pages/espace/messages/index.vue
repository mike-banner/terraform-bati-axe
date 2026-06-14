<template>
  <div class="max-w-2xl mx-auto px-6 py-16">
    <div class="mb-8">
      <h1 class="text-3xl font-black tracking-tight text-foreground">Messagerie</h1>
      <p class="text-muted-foreground mt-2">Discutez avec les particuliers de vos chantiers débloqués.</p>
    </div>

    <!-- Loading -->
    <template v-if="pending">
      <div class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-24 bg-muted rounded-xl animate-pulse" />
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div v-if="conversations.length === 0" class="text-center py-16 border border-border rounded-xl bg-muted/20">
        <svg class="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-lg font-semibold text-foreground mb-1">Aucune conversation</h3>
        <p class="text-sm text-muted-foreground max-w-sm mx-auto">Vous n'avez pas encore envoyé ou reçu de messages. Débloquez un lead pour initier le contact.</p>
        <NuxtLink to="/espace/leads" class="mt-6 inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-md bg-foreground text-background hover:opacity-80 transition-opacity">
          Voir les leads
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <NuxtLink 
          v-for="conv in conversations" 
          :key="conv.lead_id" 
          :to="`/espace/leads/${conv.lead_id}`"
          class="block p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-bold text-foreground">{{ conv.customer_name }}</h3>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {{ conv.category }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground line-clamp-1">
                {{ conv.last_message || 'Cliquez pour envoyer le premier message' }}
              </p>
            </div>
            <div v-if="conv.last_message_date" class="text-[10px] text-muted-foreground whitespace-nowrap">
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

// We use the existing leads API and filter for unlocked leads
const { data, pending } = await useAsyncData(
  'pro-conversations',
  async () => {
    // 1. Get all leads for this pro
    const { leads } = await requestFetch<{ leads: any[] }>('/api/v1/leads')
    
    // 2. Filter only unlocked leads
    const unlockedLeads = leads.filter(l => l.status === 'unlocked')
    
    // 3. For a real app we would fetch the last message for each, 
    // but to avoid N+1 queries, we will just show the leads.
    // The API for leads could be extended to return last_message, but for MVP:
    return unlockedLeads.map(l => ({
      lead_id: l.id,
      customer_name: l.customer_name,
      category: l.category,
      last_message: l.description ? l.description.substring(0, 50) + '...' : '',
      last_message_date: l.created_at
    }))
  }
)

const conversations = computed(() => data.value || [])
</script>
