<script setup lang="ts">
import type { Professional, Project, Realisation, Overview } from '~/types/admin'

definePageMeta({ layout: 'dynamic' })

useHead({ title: 'Console Admin — BÂTI-AXE' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// ─── State ────────────────────────────────────────────────────────────────────
const isLoading = ref(true)
const actionLoading = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const activeTab = ref<'overview' | 'pending' | 'all' | 'projects' | 'realisations'>('overview')

const professionals = ref<Professional[]>([])
const projects = ref<Project[]>([])
const realisations = ref<Realisation[]>([])
const overview = ref<Overview | null>(null)
const expiryDates = ref<Record<string, string>>({})
const uploadState = reactive<Record<string, { file: File | null, status: 'idle' | 'uploading' | 'error', error: string }>>({})

// ─── Access ───────────────────────────────────────────────────────────────────
const isAdmin = computed(() => (user.value as any)?.app_metadata?.role === 'admin')
const pendingCount = computed(() => professionals.value.filter(p => !p.is_verified).length)

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchAll() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const [queueRes, projectsRes, realisationsRes, overviewRes] = await Promise.allSettled([
      $fetch('/api/v1/admin/queue'),
      $fetch('/api/v1/admin/projects'),
      $fetch('/api/v1/admin/realisations'),
      $fetch('/api/v1/admin/overview'),
    ])
    if (queueRes.status === 'fulfilled') professionals.value = (queueRes.value as any)?.professionals || []
    if (projectsRes.status === 'fulfilled') projects.value = (projectsRes.value as any)?.projects || []
    if (realisationsRes.status === 'fulfilled') realisations.value = (realisationsRes.value as any)?.realisations || []
    if (overviewRes.status === 'fulfilled') overview.value = overviewRes.value as Overview
  } catch (err: any) {
    errorMessage.value = err.message || 'Erreur de chargement.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { if (isAdmin.value) fetchAll() })

// ─── Document viewing ─────────────────────────────────────────────────────────
async function viewDocument(fileKey: string) {
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

// ─── Professional actions ─────────────────────────────────────────────────────
async function approvePro(proId: string, approved: boolean) {
  actionLoading.value = `${proId}-approve`
  errorMessage.value = null
  try {
    await $fetch('/api/v1/admin/approve-pro', { method: 'POST', body: { pro_id: proId, approved } })
    await fetchAll()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    actionLoading.value = null
  }
}

async function moderateDocument(proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected') {
  const key = `${proId}-${docType}`
  actionLoading.value = key
  errorMessage.value = null
  try {
    await $fetch('/api/v1/admin/verify', {
      method: 'POST',
      body: { pro_id: proId, document_type: docType, status, expiry_date: expiryDates.value[key] || undefined }
    })
    await fetchAll()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    actionLoading.value = null
  }
}

// ─── Upload admin documents ───────────────────────────────────────────────────
function onFileSelect(e: Event, proId: string, docType: 'kbis' | 'decennale') {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) uploadState[`${proId}-${docType}`] = { file: f, status: 'idle', error: '' }
}

async function uploadAdminDoc(proId: string, docType: 'kbis' | 'decennale') {
  const key = `${proId}-${docType}`
  const state = uploadState[key]
  if (!state?.file) return
  state.status = 'uploading'
  state.error = ''
  try {
    const presign = await $fetch<{ status: string; signedUrl: string; fileKey: string }>(
      '/api/v1/pro/documents/presign',
      { method: 'POST', body: { document_type: docType, content_type: state.file.type, filename: state.file.name, pro_id: proId } }
    )
    if (presign.status !== 'SUCCESS') throw new Error('Erreur de signature.')
    const res = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': state.file.type }, body: state.file })
    if (!res.ok) throw new Error('Échec du transfert vers Cloudflare R2.')
    await (supabase as any).from('verifications').insert({
      pro_id: proId, document_type: docType, file_key: presign.fileKey, status: 'approved'
    })
    state.status = 'idle'
    state.file = null
    await fetchAll()
  } catch (err: any) {
    state.status = 'error'
    state.error = err.data?.message || err.message || 'Erreur inconnue.'
  }
}

// ─── Showcase toggle ──────────────────────────────────────────────────────────
async function toggleShowcase(projectId: string, isShowcased: boolean) {
  actionLoading.value = `${projectId}-showcase`
  errorMessage.value = null
  try {
    await $fetch('/api/v1/admin/realisations-showcase', { method: 'POST', body: { project_id: projectId, is_showcased: isShowcased } })
    await fetchAll()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <!-- Access denied -->
  <div v-if="!isAdmin" class="flex items-center justify-center min-h-screen px-6 bg-background">
    <div class="text-center space-y-4 max-w-sm">
      <div class="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
      </div>
      <p class="text-sm font-semibold text-foreground">Accès réservé</p>
      <p class="text-xs text-muted-foreground">
        {{ user?.email || 'Non connecté' }} — ce compte n'a pas les droits d'administration.
      </p>
      <NuxtLink to="/pro/claim" class="inline-flex items-center h-9 px-4 border border-border text-sm font-medium rounded-sm hover:bg-muted transition-colors">
        Se connecter
      </NuxtLink>
    </div>
  </div>

  <!-- Admin layout -->
  <AdminLayout
    v-else
    :active-tab="activeTab"
    :pending-count="pendingCount"
    @navigate="activeTab = $event as any"
  >
    <!-- Error -->
    <div v-if="errorMessage" role="alert" class="flex items-start gap-2.5 p-3 border border-destructive/30 bg-destructive/10 rounded-sm text-sm text-destructive">
      <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Tab: Overview -->
    <AdminOverview
      v-if="activeTab === 'overview'"
      :overview="overview"
      :projects="projects"
      :is-loading="isLoading"
    />

    <!-- Tab: Pending -->
    <AdminPendingTab
      v-else-if="activeTab === 'pending'"
      :professionals="professionals"
      :is-loading="isLoading"
      :action-loading="actionLoading"
      :expiry-dates="expiryDates"
      :upload-state="uploadState"
      @approve="approvePro"
      @moderate="moderateDocument"
      @view-doc="viewDocument"
      @update-expiry="(key, val) => expiryDates[key] = val"
      @file-select="onFileSelect"
      @upload-doc="uploadAdminDoc"
    />

    <!-- Tab: All pros -->
    <AdminAllProsTab
      v-else-if="activeTab === 'all'"
      :professionals="professionals"
      :is-loading="isLoading"
      :action-loading="actionLoading"
      :expiry-dates="expiryDates"
      :upload-state="uploadState"
      @approve="approvePro"
      @moderate="moderateDocument"
      @view-doc="viewDocument"
      @update-expiry="(key, val) => expiryDates[key] = val"
      @file-select="onFileSelect"
      @upload-doc="uploadAdminDoc"
    />

    <!-- Tab: Projects -->
    <AdminProjectsTab
      v-else-if="activeTab === 'projects'"
      :projects="projects"
      :is-loading="isLoading"
    />

    <!-- Tab: Réalisations -->
    <AdminRealisationsTab
      v-else-if="activeTab === 'realisations'"
      :realisations="realisations"
      :is-loading="isLoading"
      :action-loading="actionLoading"
      @toggle-showcase="toggleShowcase"
    />
  </AdminLayout>
</template>
