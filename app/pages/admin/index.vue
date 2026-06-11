<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'dynamic' })

useHead({ title: 'Modération — BÂTI-AXE Admin' })

const supabase = useSupabaseClient()
const user     = useSupabaseUser()

// ─── Types ────────────────────────────────────────────────────────────────────
interface Verification {
  id: string
  pro_id: string
  document_type: 'kbis' | 'decennale'
  file_key: string
  status: 'pending' | 'approved' | 'rejected'
  expiry_date: string | null
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:  'Maçonnerie & Gros Œuvre',
  toiture:     'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie:   'Plomberie & Chauffage',
  peinture:    'Peinture & Finitions',
  isolation:   'Isolation & Cloisons',
}

interface Professional {
  id: string
  company_name: string
  siret: string
  full_name: string
  email: string
  phone: string
  category: string | null
  canonical_slug?: string
  is_verified: boolean
  decennal_status: 'pending' | 'valid' | 'expired' | 'none'
  verifications?: Verification[]
}

// ─── State ────────────────────────────────────────────────────────────────────
const isLoading     = ref(true)
const actionLoading = ref<string | null>(null)
const errorMessage  = ref<string | null>(null)
const professionals = ref<Professional[]>([])
const activeTab       = ref<'pending' | 'all' | 'projects'>('pending')
const categoryFilter  = ref<string>('')
const expiryDates     = ref<Record<string, string>>({})

// ─── Projects state ───────────────────────────────────────────────────────────
interface Project {
  id: string
  category: string | null
  status: string
  description: string | null
  budget_range: string | null
  timeline_range: string | null
  created_at: string
  lead_count: number
}

const projects        = ref<Project[]>([])
const projectSortAsc  = ref(true)

const sortedProjects = computed(() => {
  return [...projects.value].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return projectSortAsc.value ? diff : -diff
  })
})

function leadAge(createdAt: string): { days: number; label: string; cls: string } {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor(ms / 3600000)
  if (hours < 24) return { days: 0, label: `${hours}h`, cls: 'border-border text-muted-foreground' }
  if (days < 3)   return { days, label: `${days}j`, cls: 'border-amber-300 text-amber-700 bg-amber-50' }
  return { days, label: `${days}j`, cls: 'border-red-300 text-red-700 bg-red-50' }
}

// ─── Access ───────────────────────────────────────────────────────────────────
const isAdmin = computed(() => (user.value as any)?.app_metadata?.role === 'admin')

// ─── Data fetching ────────────────────────────────────────────────────────────
const fetchQueue = async () => {
  isLoading.value   = true
  errorMessage.value = null
  try {
    const data = await $fetch('/api/v1/admin/queue')
    professionals.value = (data as any)?.professionals || []
  } catch (err: any) {
    errorMessage.value = err.message || 'Impossible de charger la file de modération.'
  } finally {
    isLoading.value = false
  }
}

const fetchProjects = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await $fetch('/api/v1/admin/projects')
    projects.value = (data as any)?.projects || []
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    isLoading.value = false
  }
}


onMounted(() => { if (isAdmin.value) { fetchQueue(); fetchProjects() } })

// ─── Actions ──────────────────────────────────────────────────────────────────
const viewDocument = async (fileKey: string) => {
  try {
    const { data, error } = await useFetch('/api/v1/pro/documents/view', {
      method: 'POST',
      body: { file_key: fileKey }
    })
    if (error.value || !data.value?.signedUrl) throw new Error('Impossible de générer le lien.')
    window.open(data.value.signedUrl, '_blank')
  } catch (err: any) {
    errorMessage.value = err.message
  }
}

const canApprove = (pro: Professional) => {
  const kbis = pro.verifications?.find(v => v.document_type === 'kbis' && v.status === 'approved')
  const decennale = pro.verifications?.find(v => v.document_type === 'decennale' && v.status === 'approved')
  return !!kbis && !!decennale
}

const approvePro = async (proId: string, approved: boolean) => {
  actionLoading.value = `${proId}-approve`
  errorMessage.value  = null
  try {
    await $fetch('/api/v1/admin/approve-pro', { method: 'POST', body: { pro_id: proId, approved } })
    await fetchQueue()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    actionLoading.value = null
  }
}

const moderateDocument = async (proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected') => {
  const key = `${proId}-${docType}`
  actionLoading.value = key
  errorMessage.value  = null
  try {
    await $fetch('/api/v1/admin/verify', {
      method: 'POST',
      body: { pro_id: proId, document_type: docType, status, expiry_date: expiryDates.value[key] || undefined }
    })
    await fetchQueue()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    actionLoading.value = null
  }
}

// ─── Upload admin ─────────────────────────────────────────────────────────────
const uploadState = reactive<Record<string, { file: File | null, status: 'idle'|'uploading'|'error', error: string }>>({})

const onFileSelect = (e: Event, proId: string, docType: 'kbis' | 'decennale') => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) {
    uploadState[`${proId}-${docType}`] = { file: f, status: 'idle', error: '' }
  }
}

const uploadAdminDoc = async (proId: string, docType: 'kbis' | 'decennale') => {
  const key = `${proId}-${docType}`
  const state = uploadState[key]
  if (!state?.file) return
  state.status = 'uploading'
  state.error = ''
  try {
    const presign = await $fetch<{ status: string; signedUrl: string; fileKey: string }>(
      '/api/v1/pro/documents/presign',
      { method: 'POST', body: { document_type: docType, filename: state.file.name, pro_id: proId } }
    )
    if (presign.status !== 'SUCCESS') throw new Error('Erreur de signature.')
    const res = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': state.file.type }, body: state.file })
    if (!res.ok) throw new Error('Échec du transfert vers Cloudflare R2.')
    
    // Ajout en base
    await (supabase as any).from('verifications').insert({
      pro_id: proId, document_type: docType, file_key: presign.fileKey, status: 'approved' // Directement approved pour un admin ? (On met approved pour gagner du temps)
    })
    
    state.status = 'idle'
    state.file = null
    await fetchQueue()
  } catch (err: any) {
    state.status = 'error'
    state.error = err.data?.message || err.message || 'Erreur inconnue.'
  }
}

// ─── Filtered list ────────────────────────────────────────────────────────────
const filtered = computed(() => {
  let list = activeTab.value === 'all'
    ? professionals.value
    : professionals.value.filter(p => !p.is_verified)
  if (categoryFilter.value) list = list.filter(p => p.category === categoryFilter.value)
  return list
})

const availableCategories = computed(() => {
  const cats = new Set(professionals.value.map(p => p.category).filter(Boolean))
  return [...cats] as string[]
})

const pendingCount = computed(() =>
  professionals.value.filter(p => !p.is_verified).length
)

const statusLabel: Record<string, string> = {
  pending:  'En attente',
  approved: 'Validé',
  rejected: 'Rejeté',
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <div class="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-foreground">Console de modération</h1>
          <p class="text-sm text-muted-foreground mt-1">Validation des Kbis et attestations décennales.</p>
        </div>
        <div v-if="isAdmin" class="flex items-center gap-2">
          <button
            @click="activeTab = 'pending'; categoryFilter = ''"
            class="h-9 px-4 text-sm font-medium rounded-md border transition-colors"
            :class="activeTab === 'pending' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            En attente
            <span v-if="pendingCount" class="ml-1.5 text-xs font-bold">({{ pendingCount }})</span>
          </button>
          <button
            @click="activeTab = 'all'"
            class="h-9 px-4 text-sm font-medium rounded-md border transition-colors"
            :class="activeTab === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            Tous les pros
          </button>
          <button
            @click="activeTab = 'projects'; categoryFilter = ''"
            class="h-9 px-4 text-sm font-medium rounded-md border transition-colors"
            :class="activeTab === 'projects' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            Projets
          </button>
        </div>
      </div>

      <!-- Filters bar (all tab only) -->
      <div v-if="isAdmin && activeTab === 'all'" class="flex items-center justify-end">
        <select
          v-model="categoryFilter"
          class="h-9 px-3 pr-8 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
        >
          <option value="">Toutes catégories</option>
          <option v-for="cat in availableCategories" :key="cat" :value="cat">
            {{ CATEGORY_LABELS[cat] ?? cat }}
          </option>
        </select>
      </div>

      <!-- Access denied -->
      <div v-if="!isAdmin" class="max-w-sm mx-auto py-16 text-center space-y-4">
        <div class="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto">
          <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
        </div>
        <p class="text-sm font-semibold text-foreground">Accès réservé</p>
        <p class="text-xs text-muted-foreground">
          {{ user?.email || 'Non connecté' }} — ce compte n'a pas les droits d'administration.
        </p>
        <NuxtLink to="/pro/claim" class="inline-flex items-center h-9 px-4 border border-border text-sm font-medium rounded-md hover:bg-muted transition-colors">
          Se connecter
        </NuxtLink>
      </div>

      <!-- Admin panel -->
      <div v-else class="space-y-6">

        <!-- Error -->
        <div v-if="errorMessage" role="alert" class="flex items-start gap-2.5 p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-16">
          <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>

        <!-- Pro cards (hidden when Projets tab is active) -->
        <template v-if="activeTab !== 'projects'">
        <div v-if="filtered.length === 0 && !isLoading" class="py-16 text-center border border-dashed border-border rounded-lg">
          <p class="text-sm text-muted-foreground">Aucun dossier {{ activeTab === 'pending' ? 'en attente' : '' }}.</p>
        </div>
        <div v-else-if="filtered.length > 0" class="space-y-4">
          <div
            v-for="pro in filtered"
            :key="pro.id"
            class="border border-border rounded-lg overflow-hidden"
          >
            <!-- Pro header row -->
            <div class="flex items-start justify-between gap-4 px-5 py-4 bg-muted/50">
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-foreground">{{ pro.company_name }}</span>
                  <span
                    class="text-xs font-medium px-2 py-0.5 rounded-full border"
                    :class="pro.is_verified ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-amber-300 text-amber-700 bg-amber-50'"
                  >
                    {{ pro.is_verified ? 'Approuvé' : 'En attente' }}
                  </span>
                  <span v-if="pro.category" class="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {{ CATEGORY_LABELS[pro.category] ?? pro.category }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{{ pro.full_name }}</span>
                  <span>{{ pro.siret }}</span>
                  <span>{{ pro.email }}</span>
                  <span>{{ pro.phone }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <NuxtLink
                  v-if="pro.is_verified"
                  :to="`/pro/78/${pro.canonical_slug ?? pro.id}`"
                  target="_blank"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Voir profil
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                </NuxtLink>
                <!-- Manual approval button -->
                <div v-if="!pro.is_verified" class="flex flex-col items-end gap-1">
                  <button
                    @click="approvePro(pro.id, true)"
                    :disabled="actionLoading === `${pro.id}-approve` || !canApprove(pro)"
                    :title="!canApprove(pro) ? 'KBIS et décennale doivent être validés avant approbation' : ''"
                    class="h-8 px-3 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg v-if="actionLoading === `${pro.id}-approve`" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    Approuver le dossier
                  </button>
                  <span v-if="!canApprove(pro)" class="text-xs text-muted-foreground">KBIS + décennale requis</span>
                </div>
                <button
                  v-if="pro.is_verified"
                  @click="approvePro(pro.id, false)"
                  :disabled="actionLoading === `${pro.id}-approve`"
                  class="h-8 px-3 border border-red-200 text-red-700 text-xs font-semibold rounded-md hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  Suspendre
                </button>
              </div>
            </div>

            <!-- Documents -->
            <div class="divide-y divide-border">
              <div
                v-for="docType in (['kbis', 'decennale'] as const)"
                :key="docType"
                class="px-5 py-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-foreground capitalize">{{ docType === 'decennale' ? 'Décennale' : 'KBIS' }}</span>
                      <span
                        class="text-xs px-2 py-0.5 rounded-full border font-medium"
                        :class="{
                          'border-border text-muted-foreground': !pro.verifications?.find(v => v.document_type === docType),
                          'border-amber-300 text-amber-700 bg-amber-50': pro.verifications?.find(v => v.document_type === docType)?.status === 'pending',
                          'border-foreground/30 text-foreground': pro.verifications?.find(v => v.document_type === docType)?.status === 'approved',
                          'border-red-200 text-red-700': pro.verifications?.find(v => v.document_type === docType)?.status === 'rejected',
                        }"
                      >
                        {{ statusLabel[pro.verifications?.find(v => v.document_type === docType)?.status || ''] || 'Non envoyé' }}
                      </span>
                    </div>
                    <p v-if="pro.verifications?.find(v => v.document_type === docType)?.expiry_date" class="text-xs text-muted-foreground">
                      Expire le {{ new Date(pro.verifications!.find(v => v.document_type === docType)!.expiry_date!).toLocaleDateString('fr-FR') }}
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <!-- View doc -->
                    <button
                      v-if="pro.verifications?.find(v => v.document_type === docType)?.file_key"
                      @click="viewDocument(pro.verifications!.find(v => v.document_type === docType)!.file_key)"
                      class="h-8 px-3 border border-border text-xs font-medium rounded-md hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      Ouvrir
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                    </button>

                    <!-- Approve / reject (pending only) -->
                    <template v-if="pro.verifications?.find(v => v.document_type === docType)?.status === 'pending'">
                      <button
                        @click="moderateDocument(pro.id, docType, 'approved')"
                        :disabled="actionLoading === `${pro.id}-${docType}`"
                        class="h-8 px-3 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <svg v-if="actionLoading === `${pro.id}-${docType}`" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        Valider
                      </button>
                      <button
                        @click="moderateDocument(pro.id, docType, 'rejected')"
                        :disabled="actionLoading === `${pro.id}-${docType}`"
                        class="h-8 px-3 border border-red-200 text-red-700 text-xs font-semibold rounded-md hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        Rejeter
                      </button>
                    </template>

                    <!-- Upload document by Admin (if missing) -->
                    <template v-if="!pro.verifications?.find(v => v.document_type === docType)">
                      <div v-if="uploadState[`${pro.id}-${docType}`]?.file" class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground truncate w-24" :title="uploadState[`${pro.id}-${docType}`]?.file?.name">{{ uploadState[`${pro.id}-${docType}`]?.file?.name }}</span>
                        <button
                          @click="uploadAdminDoc(pro.id, docType)"
                          :disabled="uploadState[`${pro.id}-${docType}`]?.status === 'uploading'"
                          class="h-8 px-3 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-40"
                        >
                           <svg v-if="uploadState[`${pro.id}-${docType}`]?.status === 'uploading'" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                           Envoyer
                        </button>
                      </div>
                      <label v-else class="cursor-pointer h-8 px-3 border border-border text-xs font-medium rounded-md hover:bg-muted transition-colors flex items-center gap-1.5">
                        <input type="file" @change="onFileSelect($event, pro.id, docType)" accept=".pdf,image/*" class="sr-only" />
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                        Uploader
                      </label>
                      <p v-if="uploadState[`${pro.id}-${docType}`]?.error" class="text-xs text-red-600 ml-2 mt-1">{{ uploadState[`${pro.id}-${docType}`]?.error }}</p>
                    </template>
                  </div>
                </div>

                <!-- Expiry date input for decennale (pending) -->
                <div
                  v-if="docType === 'decennale' && pro.verifications?.find(v => v.document_type === 'decennale')?.status === 'pending'"
                  class="mt-3"
                >
                  <label class="block text-xs text-muted-foreground mb-1">Date d'expiration de la décennale</label>
                  <input
                    type="date"
                    v-model="expiryDates[`${pro.id}-decennale`]"
                    class="h-9 px-3 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </template>

        <!-- Projects tab -->
        <template v-if="activeTab === 'projects'">
          <!-- Sort control -->
          <div v-if="projects.length > 0" class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ projects.length }} projet(s) — <span class="text-red-600 font-medium">{{ projects.filter(p => leadAge(p.created_at).days >= 3).length }} critique(s)</span></span>
            <button
              @click="projectSortAsc = !projectSortAsc"
              class="flex items-center gap-1.5 h-8 px-3 border border-border rounded-md hover:bg-muted transition-colors font-medium text-foreground"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M7 12h10M11 17h2" />
              </svg>
              {{ projectSortAsc ? 'Plus anciens d\'abord' : 'Plus récents d\'abord' }}
            </button>
          </div>

          <div v-if="projects.length === 0 && !isLoading" class="py-16 text-center border border-dashed border-border rounded-lg">
            <p class="text-sm text-muted-foreground">Aucun projet trouvé.</p>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="project in sortedProjects"
              :key="project.id"
              class="border rounded-lg overflow-hidden transition-colors"
              :class="leadAge(project.created_at).days >= 3 ? 'border-red-200' : 'border-border'"
            >
              <div class="flex items-start justify-between gap-4 px-5 py-4 bg-muted/50">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span v-if="project.category" class="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                      {{ CATEGORY_LABELS[project.category] ?? project.category }}
                    </span>
                    <span
                      class="text-xs font-medium px-2 py-0.5 rounded-full border"
                      :class="project.status === 'qualified' ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-amber-300 text-amber-700 bg-amber-50'"
                    >
                      {{ project.status === 'qualified' ? 'Qualifié' : 'En attente' }}
                    </span>
                    <!-- Ancienneté -->
                    <span
                      class="text-xs font-semibold px-2 py-0.5 rounded-full border"
                      :class="leadAge(project.created_at).cls"
                    >
                      {{ leadAge(project.created_at).days >= 3 ? '⚠ ' : '' }}{{ leadAge(project.created_at).label }}
                    </span>
                    <!-- Nombre de claims -->
                    <span v-if="project.lead_count > 0" class="text-xs px-2 py-0.5 rounded-full border border-sky-200 text-sky-700 bg-sky-50">
                      {{ project.lead_count }} intéressé{{ project.lead_count > 1 ? 's' : '' }}
                    </span>
                  </div>
                  <p v-if="project.description" class="text-sm text-foreground line-clamp-2">{{ project.description }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span v-if="project.budget_range">Budget : {{ project.budget_range }}</span>
                    <span v-if="project.timeline_range">Délai : {{ project.timeline_range }}</span>
                    <span>Reçu le {{ new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>
