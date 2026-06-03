<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  FileText, 
  Calendar, 
  UserCheck, 
  Building2, 
  Loader2, 
  AlertCircle 
} from 'lucide-vue-next'

useHead({
  title: 'Modération — BÂTI-AXE Admin'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// State
const isLoading = ref(true)
const actionLoading = ref<string | null>(null) // Contains proId-docType when loading
const errorMessage = ref<string | null>(null)

interface Verification {
  id: string
  pro_id: string
  document_type: 'kbis' | 'decennale'
  file_key: string
  status: 'pending' | 'approved' | 'rejected'
  expiry_date: string | null
  created_at: string
}

interface Professional {
  id: string
  company_name: string
  siret: string
  full_name: string
  email: string
  phone: string
  is_verified: boolean
  decennal_status: 'pending' | 'valid' | 'expired' | 'none'
  verifications?: Verification[]
}

const professionals = ref<Professional[]>([])
const activeTab = ref<'pending' | 'all'>('pending')
const expiryDates = ref<Record<string, string>>({}) // Map of proId-docType to expiry string

// Access check
const adminEmails = ['mike@bati-axe.fr'] // local fallback
const isAdmin = computed(() => {
  if (!user.value || !user.value.email) return false
  return user.value.email.endsWith('@bati-axe.fr') || adminEmails.includes(user.value.email)
})

// Fetch pros and their verification documents
const fetchVerificationQueue = async () => {
  isLoading.value = true
  errorMessage.value = null
  
  try {
    // 1. Fetch professionals
    const { data: prosData, error: prosError } = await supabase
      .from('professionals')
      .select('*')
      .order('created_at', { ascending: false })

    if (prosError) throw prosError

    // 2. Fetch all verifications
    const { data: verifData, error: verifError } = await supabase
      .from('verifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (verifError) throw verifError

    // 3. Map verifications to professionals
    professionals.value = (prosData || []).map((pro: any) => {
      const verifs = (verifData || []).filter((v: any) => v.pro_id === pro.id)
      return {
        ...pro,
        verifications: verifs
      }
    })
  } catch (err: any) {
    errorMessage.value = err.message || 'Impossible de charger la file de modération.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (isAdmin.value) {
    fetchVerificationQueue()
  }
})

// Generate secure link to preview uploaded doc
const viewDocument = async (fileKey: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileKey, 300) // 5 minutes validity

    if (error) throw error
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  } catch (err: any) {
    alert(`Impossible d'ouvrir le document: ${err.message}`)
  }
}

// Moderation Action (Approve / Reject)
const moderateDocument = async (proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected') => {
  const loadingKey = `${proId}-${docType}`
  actionLoading.value = loadingKey
  errorMessage.value = null

  const expiryKey = `${proId}-${docType}`
  const expiryDate = expiryDates.value[expiryKey] || undefined

  try {
    const { data, error } = await useFetch('/api/v1/admin/verify', {
      method: 'POST',
      body: {
        pro_id: proId,
        document_type: docType,
        status,
        expiry_date: expiryDate
      }
    })

    if (error.value) {
      throw new Error(error.value.data?.statusMessage || 'Erreur lors du traitement.')
    }

    if (data.value && data.value.status === 'SUCCESS') {
      // Refresh list
      await fetchVerificationQueue()
    }
  } catch (err: any) {
    errorMessage.value = err.message
  } finally {
    actionLoading.value = null
  }
}

const filteredProfessionals = computed(() => {
  if (activeTab.value === 'all') {
    return professionals.value
  }
  // Show pros with pending documents or unverified pros who uploaded documents
  return professionals.value.filter(pro => {
    const hasPendingDocs = pro.verifications?.some(v => v.status === 'pending')
    return hasPendingDocs || (!pro.is_verified && (pro.verifications?.length || 0) > 0)
  })
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert class="w-8 h-8 text-indigo-400" /> Console de Modération
          </h1>
          <p class="text-xs text-zinc-400 mt-1">Validation des attestations d'assurances décennales et extraits KBIS.</p>
        </div>
        <div class="flex items-center gap-3" v-if="isAdmin">
          <button 
            @click="activeTab = 'pending'"
            class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
            :class="activeTab === 'pending' ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-800 text-zinc-400 hover:text-white'"
          >
            En attente
          </button>
          <button 
            @click="activeTab = 'all'"
            class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
            :class="activeTab === 'all' ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-800 text-zinc-400 hover:text-white'"
          >
            Tous les pros
          </button>
        </div>
      </div>

      <!-- Access Denied Screen -->
      <div v-if="!isAdmin" class="bg-red-950/20 border border-red-900/60 rounded-2xl p-6 text-center max-w-md mx-auto space-y-4">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto" />
        <h3 class="text-lg font-bold text-white">Accès Réservé</h3>
        <p class="text-xs text-zinc-400">
          Votre compte ({{ user?.email || 'non connecté' }}) ne dispose pas des droits d'administration. Connectez-vous avec un compte administrateur `@bati-axe.fr`.
        </p>
        <NuxtLink to="/pro/claim" class="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-colors">
          Se connecter / S'enregistrer
        </NuxtLink>
      </div>

      <!-- Main Moderation Panel -->
      <div v-else class="space-y-6">
        <!-- Error message banner -->
        <div v-if="errorMessage" class="p-4 bg-red-950/40 border border-red-900 rounded-xl text-red-300 text-xs flex gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex justify-center py-12">
          <Loader2 class="w-8 h-8 text-indigo-400 animate-spin" />
        </div>

        <!-- Empty Queue State -->
        <div v-else-if="filteredProfessionals.length === 0" class="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          <UserCheck class="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p class="text-sm font-semibold text-zinc-400">Aucun dossier en attente de validation.</p>
        </div>

        <!-- Queue Cards List -->
        <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div 
            v-for="pro in filteredProfessionals" 
            :key="pro.id" 
            class="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors"
          >
            <div class="space-y-4">
              <!-- Pro header -->
              <div class="flex items-start justify-between">
                <div class="space-y-1">
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" v-if="pro.is_verified">
                    Vérifié BÂTI-AXE
                  </span>
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" v-else>
                    Modération requise
                  </span>
                  <h3 class="font-bold text-white text-base mt-1 flex items-center gap-1.5">
                    <Building2 class="w-4 h-4 text-zinc-400" /> {{ pro.company_name }}
                  </h3>
                </div>
              </div>

              <!-- Contact & Identity Details -->
              <div class="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
                <p><span class="text-zinc-500">Gérant :</span> {{ pro.full_name }}</p>
                <p><span class="text-zinc-500">SIRET :</span> {{ pro.siret }}</p>
                <p><span class="text-zinc-500">Email :</span> {{ pro.email }}</p>
                <p><span class="text-zinc-500">Téléphone :</span> {{ pro.phone }}</p>
              </div>

              <!-- Uploaded Documents Moderation Area -->
              <div class="space-y-3 pt-2 border-t border-zinc-800/80">
                <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-500">Justificatifs</h4>

                <div 
                  v-for="docType in (['kbis', 'decennale'] as const)" 
                  :key="docType"
                  class="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2.5"
                >
                  <!-- Doc header -->
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold capitalize flex items-center gap-1.5">
                      <FileText class="w-3.5 h-3.5 text-indigo-400" /> {{ docType }}
                    </span>
                    
                    <!-- Status Badge -->
                    <span 
                      class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                      :class="{
                        'bg-zinc-800 text-zinc-400': !pro.verifications?.find(v => v.document_type === docType),
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': pro.verifications?.find(v => v.document_type === docType && v.status === 'pending'),
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': pro.verifications?.find(v => v.document_type === docType && v.status === 'approved'),
                        'bg-red-500/10 text-red-400 border border-red-500/20': pro.verifications?.find(v => v.document_type === docType && v.status === 'rejected')
                      }"
                    >
                      {{ pro.verifications?.find(v => v.document_type === docType)?.status || 'Absent' }}
                    </span>
                  </div>

                  <!-- Actions for doc -->
                  <div class="space-y-2" v-if="pro.verifications?.find(v => v.document_type === docType)">
                    <button 
                      @click="viewDocument(pro.verifications!.find(v => v.document_type === docType)!.file_key)"
                      class="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-zinc-800"
                    >
                      <span>Visualiser la pièce</span>
                      <ExternalLink class="w-3 h-3" />
                    </button>

                    <!-- Mod controls (If pending) -->
                    <div 
                      class="space-y-2 pt-1 border-t border-zinc-900/60"
                      v-if="pro.verifications!.find(v => v.document_type === docType)!.status === 'pending'"
                    >
                      <!-- Expiry date picker for insurance docs -->
                      <div v-if="docType === 'decennale'" class="space-y-1">
                        <label class="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar class="w-3 h-3" /> Date d'expiration décennale</label>
                        <input 
                          type="date" 
                          v-model="expiryDates[`${pro.id}-${docType}`]"
                          class="w-full bg-zinc-950 border border-zinc-800 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div class="flex gap-2">
                        <button 
                          @click="moderateDocument(pro.id, docType, 'approved')"
                          class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                          :disabled="actionLoading === `${pro.id}-${docType}`"
                        >
                          <Loader2 class="w-3 h-3 animate-spin" v-if="actionLoading === `${pro.id}-${docType}`" />
                          <CheckCircle2 class="w-3 h-3" v-else />
                          Valider
                        </button>
                        <button 
                          @click="moderateDocument(pro.id, docType, 'rejected')"
                          class="flex-1 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 border border-red-800/50"
                          :disabled="actionLoading === `${pro.id}-${docType}`"
                        >
                          <XCircle class="w-3 h-3" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
