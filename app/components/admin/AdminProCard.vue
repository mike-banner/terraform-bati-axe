<script setup lang="ts">
import type { Professional } from '~/types/admin'
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

function docStatusClasses(status?: string) {
  if (!status) return 'border-border text-muted-foreground bg-muted/30'
  if (status === 'pending') return 'border-amber-400/40 text-amber-300 bg-amber-500/15'
  if (status === 'approved') return 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15'
  if (status === 'rejected') return 'border-red-400/40 text-red-300 bg-red-500/15'
  return 'border-border text-muted-foreground'
}

function uploadKey(proId: string, docType: string) {
  return `${proId}-${docType}`
}
</script>

<template>
  <div class="bg-card border border-border rounded-sm overflow-hidden shadow-sm">
    <!-- Pro header row -->
    <div class="flex items-start justify-between gap-4 px-5 py-4">
      <div class="space-y-1.5 flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-bold text-foreground">{{ pro.company_name }}</span>
          <!-- Status badge -->
          <span
            v-if="pro.is_verified"
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300 bg-emerald-500/15"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Approuvé
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-400/40 text-amber-300 bg-amber-500/15"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            En attente
          </span>
          <!-- Category -->
          <span v-if="pro.category" class="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/30">
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
            class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shadow-safety/20"
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
          class="h-8 px-3 bg-muted/50 border border-destructive/30 text-destructive text-xs font-semibold rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
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
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                :class="docStatusClasses(getDocStatus(docType)?.status)"
              >
                <svg v-if="getDocStatus(docType)?.status === 'approved'" class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <svg v-else-if="getDocStatus(docType)?.status === 'pending'" class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                <svg v-else-if="getDocStatus(docType)?.status === 'rejected'" class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
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
              class="h-8 px-3 bg-muted/40 border border-border text-foreground text-xs font-medium rounded-sm hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              Ouvrir
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </button>

            <!-- Approve / reject (pending only) -->
            <template v-if="getDocStatus(docType)?.status === 'pending'">
              <button
                @click="emit('moderate', pro.id, docType, 'approved')"
                :disabled="actionLoading === uploadKey(pro.id, docType)"
                class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm shadow-safety/20"
              >
                <svg v-if="actionLoading === uploadKey(pro.id, docType)" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                Valider
              </button>
              <button
                @click="emit('moderate', pro.id, docType, 'rejected')"
                :disabled="actionLoading === uploadKey(pro.id, docType)"
                class="h-8 px-3 bg-muted/50 border border-destructive/30 text-destructive text-xs font-semibold rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
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
                  class="h-8 px-3 bg-safety text-white text-xs font-semibold rounded-sm hover:brightness-110 transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-sm shadow-safety/20"
                >
                  <svg v-if="uploadState[uploadKey(pro.id, docType)]?.status === 'uploading'" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Envoyer
                </button>
              </div>
              <label v-else class="cursor-pointer h-8 px-3 bg-muted/40 border border-dashed border-border text-foreground text-xs font-medium rounded-sm hover:bg-muted hover:border-solid transition-all flex items-center gap-1.5">
                <input type="file" @change="emit('file-select', $event, pro.id, docType)" accept=".pdf,image/*" class="sr-only" />
                <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
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
            class="h-9 px-3 border border-border rounded-sm text-sm bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  </div>
</template>
