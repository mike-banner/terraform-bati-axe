<script setup lang="ts">
import type { Professional, Verification } from '~/types/admin'
import { CATEGORY_LABELS, STATUS_LABELS } from '~/types/admin'

const props = defineProps<{
  pro: Professional
  actionLoading: string | null
  expiryDates: Record<string, string>
  uploadState: Record<string, { file: File | null, status: 'idle' | 'uploading' | 'error', error: string }>
}>()

const emit = defineEmits<{
  (e: 'approve', proId: string, approved: boolean): void
  (e: 'moderate', proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected'): void
  (e: 'view-doc', fileKey: string): void
  (e: 'update-expiry', key: string, value: string): void
  (e: 'file-select', event: Event, proId: string, docType: 'kbis' | 'decennale'): void
  (e: 'upload-doc', proId: string, docType: 'kbis' | 'decennale'): void
}>()

const canApprove = computed(() => {
  const kbis = props.pro.verifications?.find(v => v.document_type === 'kbis' && v.status === 'approved')
  const decennale = props.pro.verifications?.find(v => v.document_type === 'decennale' && v.status === 'approved')
  return !!kbis && !!decennale
})

function getDocStatus(docType: 'kbis' | 'decennale') {
  return props.pro.verifications?.find(v => v.document_type === docType)
}

function docStatusLabel(status?: string) {
  return STATUS_LABELS[status || ''] || 'Non envoyé'
}

function docStatusClass(status?: string) {
  return {
    'border-border text-muted-foreground': !status,
    'border-amber-500/30 text-amber-400 bg-amber-500/10': status === 'pending',
    'border-emerald-500/30 text-emerald-400 bg-emerald-500/10': status === 'approved',
    'border-red-500/30 text-red-400 bg-red-500/10': status === 'rejected',
  }
}

function uploadKey(proId: string, docType: string) {
  return `${proId}-${docType}`
}
</script>

<template>
  <div class="bg-card border border-border rounded-sm overflow-hidden">
    <!-- Pro header row -->
    <div class="flex items-start justify-between gap-4 px-5 py-4">
      <div class="space-y-1 flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-bold text-foreground">{{ pro.company_name }}</span>
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full border"
            :class="pro.is_verified ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'"
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

        <div v-if="!pro.is_verified" class="flex flex-col items-end gap-1">
          <button
            @click="emit('approve', pro.id, true)"
            :disabled="actionLoading === `${pro.id}-approve` || !canApprove"
            :title="!canApprove ? 'KBIS et décennale doivent être validés avant approbation' : ''"
            class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg v-if="actionLoading === `${pro.id}-approve`" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            Approuver
          </button>
          <span v-if="!canApprove" class="text-[10px] text-muted-foreground">KBIS + décennale requis</span>
        </div>

        <button
          v-if="pro.is_verified"
          @click="emit('approve', pro.id, false)"
          :disabled="actionLoading === `${pro.id}-approve`"
          class="h-8 px-3 bg-card border border-destructive/30 text-destructive text-xs font-semibold rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
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
                :class="docStatusClass(getDocStatus(docType)?.status)"
              >
                {{ docStatusLabel(getDocStatus(docType)?.status) }}
              </span>
            </div>
            <p v-if="getDocStatus(docType)?.expiry_date" class="text-xs text-muted-foreground">
              Expire le {{ new Date(getDocStatus(docType)!.expiry_date!).toLocaleDateString('fr-FR') }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <!-- View doc -->
            <button
              v-if="getDocStatus(docType)?.file_key"
              @click="emit('view-doc', getDocStatus(docType)!.file_key)"
              class="h-8 px-3 bg-card border border-border text-xs font-medium rounded-sm hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              Ouvrir
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </button>

            <!-- Approve / reject (pending only) -->
            <template v-if="getDocStatus(docType)?.status === 'pending'">
              <button
                @click="emit('moderate', pro.id, docType, 'approved')"
                :disabled="actionLoading === uploadKey(pro.id, docType)"
                class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
              >
                <svg v-if="actionLoading === uploadKey(pro.id, docType)" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                Valider
              </button>
              <button
                @click="emit('moderate', pro.id, docType, 'rejected')"
                :disabled="actionLoading === uploadKey(pro.id, docType)"
                class="h-8 px-3 bg-card border border-destructive/30 text-destructive text-xs font-semibold rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                Rejeter
              </button>
            </template>

            <!-- Upload document by Admin (if missing) -->
            <template v-if="!getDocStatus(docType)">
              <div v-if="uploadState[uploadKey(pro.id, docType)]?.file" class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground truncate w-24" :title="uploadState[uploadKey(pro.id, docType)]?.file?.name">
                  {{ uploadState[uploadKey(pro.id, docType)]?.file?.name }}
                </span>
                <button
                  @click="emit('upload-doc', pro.id, docType)"
                  :disabled="uploadState[uploadKey(pro.id, docType)]?.status === 'uploading'"
                  class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-40"
                >
                  <svg v-if="uploadState[uploadKey(pro.id, docType)]?.status === 'uploading'" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Envoyer
                </button>
              </div>
              <label v-else class="cursor-pointer h-8 px-3 bg-card border border-border text-xs font-medium rounded-sm hover:bg-muted transition-colors flex items-center gap-1.5">
                <input type="file" @change="emit('file-select', $event, pro.id, docType)" accept=".pdf,image/*" class="sr-only" />
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                Uploader
              </label>
              <p v-if="uploadState[uploadKey(pro.id, docType)]?.error" class="text-xs text-destructive ml-2 mt-1">
                {{ uploadState[uploadKey(pro.id, docType)]?.error }}
              </p>
            </template>
          </div>
        </div>

        <!-- Expiry date input for decennale (pending) -->
        <div
          v-if="docType === 'decennale' && getDocStatus('decennale')?.status === 'pending'"
          class="mt-3"
        >
          <label class="block text-xs text-muted-foreground mb-1">Date d'expiration de la décennale</label>
          <input
            type="date"
            :value="expiryDates[uploadKey(pro.id, 'decennale')] || ''"
            @input="emit('update-expiry', uploadKey(pro.id, 'decennale'), ($event.target as HTMLInputElement).value)"
            class="h-9 px-3 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  </div>
</template>
