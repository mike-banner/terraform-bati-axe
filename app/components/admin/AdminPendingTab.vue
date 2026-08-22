<script setup lang="ts">
import type { Professional } from '~/types/admin'

defineProps<{
  professionals: Professional[]
  isLoading: boolean
  actionLoading: string | null
  expiryDates: Record<string, string>
  uploadState: Record<string, { file: File | null, status: 'idle' | 'uploading' | 'error', error: string }>
}>()

defineEmits<{
  (e: 'approve', proId: string, approved: boolean): void
  (e: 'moderate', proId: string, docType: 'kbis' | 'decennale', status: 'approved' | 'rejected'): void
  (e: 'view-doc', fileKey: string): void
  (e: 'update-expiry', key: string, value: string): void
  (e: 'file-select', event: Event, proId: string, docType: 'kbis' | 'decennale'): void
  (e: 'upload-doc', proId: string, docType: 'kbis' | 'decennale'): void
}>()
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="professionals.filter(p => !p.is_verified).length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucun dossier en attente.</p>
    </div>

    <div v-else class="space-y-3">
      <AdminProCard
        v-for="pro in professionals.filter(p => !p.is_verified)"
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
  </template>
</template>
