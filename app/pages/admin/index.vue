<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

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
const activeTab     = ref<'pending' | 'all'>('pending')
const expiryDates   = ref<Record<string, string>>({})

// ─── Access ───────────────────────────────────────────────────────────────────
const isAdmin = computed(() => (user.value as any)?.app_metadata?.role === 'admin')

// ─── Data fetching ────────────────────────────────────────────────────────────
const fetchQueue = async () => {
  isLoading.value   = true
  errorMessage.value = null
  try {
    const { data: pros, error: e1 } = await supabase.from('professionals').select('id, company_name, siret, full_name, email, phone, canonical_slug, category, is_verified, is_claimed, decennal_status, created_at').order('created_at', { ascending: false })
    if (e1) throw e1
    const { data: verifs, error: e2 } = await supabase.from('verifications').select('*').order('created_at', { ascending: false })
    if (e2) throw e2

    professionals.value = (pros || []).map((p: any) => ({
      ...p,
      verifications: (verifs || []).filter((v: any) => v.pro_id === p.id)
    }))
  } catch (err: any) {
    errorMessage.value = err.message || 'Impossible de charger la file de modération.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { if (isAdmin.value) fetchQueue() })

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
    const { data, error } = await useFetch('/api/v1/admin/approve-pro', {
      method: 'POST',
      body: { pro_id: proId, approved }
    })
    if (error.value) throw new Error(error.value.data?.statusMessage || 'Erreur.')
    if (data.value?.status === 'SUCCESS') await fetchQueue()
  } catch (err: any) {
    errorMessage.value = err.message
  } finally {
    actionLoading.value = null
  }
}

const moderateDocument = async (proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected') => {
  const key = `${proId}-${docType}`
  actionLoading.value = key
  errorMessage.value  = null
  try {
    const { data, error } = await useFetch('/api/v1/admin/verify', {
      method: 'POST',
      body: { pro_id: proId, document_type: docType, status, expiry_date: expiryDates.value[key] || undefined }
    })
    if (error.value) throw new Error(error.value.data?.statusMessage || 'Erreur.')
    if (data.value?.status === 'SUCCESS') await fetchQueue()
  } catch (err: any) {
    errorMessage.value = err.message
  } finally {
    actionLoading.value = null
  }
}

// ─── Filtered list ────────────────────────────────────────────────────────────
const filtered = computed(() => {
  if (activeTab.value === 'all') return professionals.value
  return professionals.value.filter(p =>
    p.verifications?.some(v => v.status === 'pending') ||
    (!p.is_verified && (p.verifications?.length || 0) > 0)
  )
})

const pendingCount = computed(() =>
  professionals.value.filter(p => p.verifications?.some(v => v.status === 'pending')).length
)

const statusLabel: Record<string, string> = {
  pending:  'En attente',
  approved: 'Validé',
  rejected: 'Rejeté',
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-background">
    <div class="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-foreground">Console de modération</h1>
          <p class="text-sm text-muted-foreground mt-1">Validation des Kbis et attestations décennales.</p>
        </div>
        <div v-if="isAdmin" class="flex items-center gap-2">
          <button
            @click="activeTab = 'pending'"
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
        </div>
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

        <!-- Empty -->
        <div v-else-if="filtered.length === 0" class="py-16 text-center border border-dashed border-border rounded-lg">
          <p class="text-sm text-muted-foreground">Aucun dossier {{ activeTab === 'pending' ? 'en attente' : '' }}.</p>
        </div>

        <!-- Pro cards -->
        <div v-else class="space-y-4">
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

      </div>
    </div>
  </div>
</template>
