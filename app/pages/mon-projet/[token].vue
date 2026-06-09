<template>
  <div class="min-h-screen bg-slate-50 py-12">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="pending" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        <p class="mt-4 text-slate-500">Chargement de votre espace...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white p-8 rounded-2xl shadow-sm text-center border border-red-100">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 mb-2">Lien invalide ou expiré</h1>
        <p class="text-slate-600 mb-6">Nous n'avons pas pu trouver de projet correspondant à ce lien sécurisé.</p>
        <NuxtLink to="/" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          Retour à l'accueil
        </NuxtLink>
      </div>

      <!-- Project View -->
      <div v-else-if="data">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div class="p-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div class="flex items-center gap-3 mb-4 text-indigo-100">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span class="font-medium tracking-wide uppercase text-sm">Votre Projet</span>
            </div>
            <h1 class="text-3xl font-bold mb-2">{{ data.project.category }}</h1>
            <p class="text-indigo-100 text-lg opacity-90">{{ data.project.description }}</p>
          </div>
          <div class="p-8 grid grid-cols-2 gap-6 bg-slate-50/50">
            <div>
              <p class="text-sm font-medium text-slate-500 mb-1">Budget estimé</p>
              <p class="text-slate-900 font-semibold">{{ data.project.budget_range }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500 mb-1">Délai souhaité</p>
              <p class="text-slate-900 font-semibold">{{ data.project.timeline_range || 'Non précisé' }}</p>
            </div>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-slate-900 mb-6">Discussions avec les Artisans</h2>
        
        <div v-if="!data.messages || groupedMessages.length === 0" class="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-slate-900 mb-2">Pas encore de contact</h3>
          <p class="text-slate-500">Votre projet est en cours de validation. Vous serez alerté dès qu'un artisan qualifié vous écrira.</p>
        </div>

        <div v-else class="space-y-6">
          <!-- One card per artisan thread -->
          <div v-for="thread in groupedMessages" :key="thread.leadId" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {{ thread.companyName.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-bold text-slate-900 text-lg">{{ thread.companyName }}</h3>
                  <p class="text-sm text-slate-500">Artisan Qualifié Bâti-Axe</p>
                </div>
              </div>
            </div>
            
            <div class="p-6 h-96 overflow-y-auto bg-slate-50/30 flex flex-col gap-4">
              <div v-for="msg in thread.messages" :key="msg.id" class="flex" :class="msg.is_pro_sender ? 'justify-start' : 'justify-end'">
                <div class="max-w-[80%] rounded-2xl px-5 py-3 shadow-sm"
                     :class="msg.is_pro_sender ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'">
                  <p class="whitespace-pre-wrap">{{ msg.content }}</p>
                  <p class="text-[10px] mt-2 text-right" :class="msg.is_pro_sender ? 'text-slate-400' : 'text-indigo-200'">
                    {{ new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-100">
              <form @submit.prevent="sendMessage(thread.leadId)" class="flex gap-3">
                <input 
                  v-model="replyContent[thread.leadId]" 
                  type="text" 
                  placeholder="Écrivez votre réponse..." 
                  class="flex-1 rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 px-4 py-3"
                  required
                  :disabled="isSending === thread.leadId"
                />
                <button 
                  type="submit" 
                  class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!replyContent[thread.leadId] || isSending === thread.leadId"
                >
                  <span v-if="isSending === thread.leadId">Envoi...</span>
                  <span v-else>Envoyer</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const token = route.params.token

definePageMeta({
  layout: false
})

useHead({
  title: 'Suivi de mon projet - Bâti-Axe'
})

// Fetch project and messages
const { data, pending, error, refresh } = await useFetch(`/api/v1/magic-link/${token}`)

// Group messages by lead_id (i.e. by Pro)
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

// Chat state
const replyContent = ref({})
const isSending = ref(null)

const sendMessage = async (leadId) => {
  const content = replyContent.value[leadId]
  if (!content) return
  
  isSending.value = leadId
  
  try {
    await $fetch('/api/v1/messages', {
      method: 'POST',
      body: {
        lead_id: leadId,
        content: content,
        access_token: token
      }
    })
    
    // Clear input and refresh data
    replyContent.value[leadId] = ''
    await refresh()
  } catch (e) {
    alert("Une erreur est survenue lors de l'envoi du message.")
  } finally {
    isSending.value = null
  }
}
</script>
