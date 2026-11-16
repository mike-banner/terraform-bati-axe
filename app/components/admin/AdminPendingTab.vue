<script setup lang="ts">
import type { Professional, DocType } from '~/types/admin'
import { needsValidation, isAwaitingDocuments, missingDocuments, DOC_LABELS } from '~/types/admin'

const props = defineProps<{
  professionals: Professional[]
  isLoading: boolean
  actionLoading: string | null
  expiryDates: Record<string, string>
  uploadState: Record<string, { file: File | null, status: 'idle' | 'uploading' | 'error', error: string }>
}>()

defineEmits<{
  (e: 'approve', proId: string, approved: boolean): void
  (e: 'moderate', proId: string, docType: DocType, status: 'approved' | 'rejected'): void
  (e: 'view-doc', fileKey: string): void
  (e: 'update-expiry', key: string, value: string): void
  (e: 'file-select', event: Event, proId: string, docType: DocType): void
  (e: 'upload-doc', proId: string, docType: DocType): void
}>()
const toValidate = computed(() => props.professionals.filter(needsValidation))
const awaiting = computed(() => props.professionals.filter(isAwaitingDocuments))
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="toValidate.length === 0 && awaiting.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucun dossier en attente.</p>
    </div>

    <div v-else class="space-y-6">
    <section>
      <h2 class="mb-2 text-sm font-semibold text-foreground">À valider <span class="font-normal text-muted-foreground">({{ toValidate.length }})</span></h2>
      <p v-if="toValidate.length === 0" class="text-xs text-muted-foreground">Aucun document n'attend de décision.</p>
      <div v-else class="space-y-3">
      <AdminProCard
        v-for="pro in toValidate"
        :key="pro.id"
        :pro="pro"
        :action-loading="actionLoading"
        :expiry-dates="expiryDates"
        :upload-state="uploadState"
        @approve="(id, val) => $emit('approve', id, val)"
        @moderate="(id, doc, status) => $emit('moderate', id, doc, status)"
        @view-doc="(key) => $emit('view-doc', key)"
        @update-expiry="(key, val) => $emit('update-expiry', key, val)"
        @file-select="(e, id, doc) => $emit('file-select', e, id, doc)"
        @upload-doc="(id, doc) => $emit('upload-doc', id, doc)"
      />
      </div>
    </section>

    <section>
      <h2 class="mb-1 text-sm font-semibold text-foreground">Documents manquants <span class="font-normal text-muted-foreground">({{ awaiting.length }})</span></h2>
      <p class="mb-2 text-xs text-muted-foreground">Aucune validation à faire : ces artisans n'ont pas encore envoyé toutes leurs pièces obligatoires.</p>
      <p v-if="awaiting.length === 0" class="text-xs text-muted-foreground">Aucun artisan en attente de documents.</p>
      <ul v-else class="divide-y divide-border/60 border border-border/60 rounded-md bg-card">
        <li v-for="pro in awaiting" :key="pro.id" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-foreground truncate">{{ pro.company_name }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ pro.email }}</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="m in missingDocuments(pro)"
              :key="m.type"
              class="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
              :class="m.rejected ? 'border-red-400/40 text-red-300 bg-red-500/15' : 'border-border text-muted-foreground bg-muted/30'"
            >
              {{ DOC_LABELS[m.type] }} {{ m.rejected ? 'refusé' : 'manquant' }}
            </span>
          </div>
        </li>
      </ul>
    </section>
    </div>
  </template>
</template>
