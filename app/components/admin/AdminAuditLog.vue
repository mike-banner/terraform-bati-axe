<script setup lang="ts">
interface AuditLog {
  id: string
  actor_id: string
  action: string
  target_table: string
  target_id: string
  metadata: Record<string, any>
  created_at: string
  actor?: { email: string } | null
}

const logs = ref<AuditLog[]>([])
const total = ref(0)
const isLoading = ref(true)
const page = ref(0)
const limit = 50

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  lead_unlocked: { label: 'Lead débloqué', icon: '🔓', color: 'text-sky-400' },
  doc_validated: { label: 'Document vérifié', icon: '📋', color: 'text-amber-400' },
  prospect_converted: { label: 'Prospect converti', icon: '👤', color: 'text-emerald-400' },
  project_created: { label: 'Projet créé', icon: '📁', color: 'text-blue-400' },
  consent_updated: { label: 'Consentement mis à jour', icon: '✅', color: 'text-muted-foreground' },
  showcase_toggled: { label: 'Mise en avant', icon: '⭐', color: 'text-safety' },
}

function actionInfo(action: string) {
  return ACTION_LABELS[action] || { label: action, icon: '•', color: 'text-muted-foreground' }
}

function metaSummary(log: AuditLog): string {
  const m = log.metadata || {}
  if (log.action === 'doc_validated') {
    const doc = m.document_type === 'decennale' ? 'Décennale' : 'KBIS'
    const st = m.status === 'approved' ? 'approuvé' : 'rejeté'
    return `${doc} ${st}`
  }
  if (log.action === 'showcase_toggled') {
    return m.is_showcased ? 'Activée' : 'Désactivée'
  }
  if (log.action === 'lead_unlocked') {
    return `Lead ${m.lead_id?.slice(0, 8) || ''}`
  }
  return ''
}

async function fetchLogs(reset = false) {
  if (reset) { page.value = 0; logs.value = [] }
  isLoading.value = true
  try {
    const data = await $fetch<{ logs: AuditLog[]; total: number }>(`/api/v1/admin/audit-logs?limit=${limit}&offset=${page.value * limit}`)
    logs.value = reset ? data.logs : [...logs.value, ...data.logs]
    total.value = data.total
  } catch (err: any) {
    console.error('Audit log error:', err)
  } finally {
    isLoading.value = false
  }
}

function loadMore() {
  page.value++
  fetchLogs()
}

const hasMore = computed(() => logs.value.length < total.value)

onMounted(() => fetchLogs(true))

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}
</script>

<template>
  <div v-if="isLoading && logs.length === 0" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else>
    <div v-if="logs.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">Aucune action enregistrée.</p>
    </div>

    <div v-else class="space-y-1">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
        <span>{{ total }} action{{ total > 1 ? 's' : '' }}</span>
      </div>

      <!-- Log entries -->
      <div
        v-for="log in logs"
        :key="log.id"
        class="flex items-start gap-3 px-4 py-3 rounded-sm hover:bg-muted/50 transition-colors"
      >
        <!-- Icon -->
        <span class="text-base shrink-0 mt-0.5">{{ actionInfo(log.action).icon }}</span>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-foreground">{{ actionInfo(log.action).label }}</span>
            <span v-if="metaSummary(log)" class="text-xs text-muted-foreground">— {{ metaSummary(log) }}</span>
          </div>
          <div class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{{ log.actor?.email || 'Système' }}</span>
            <span>•</span>
            <span>{{ log.target_table }}</span>
            <span>•</span>
            <span :title="new Date(log.created_at).toLocaleString('fr-FR')">{{ timeAgo(log.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center py-4">
        <button
          @click="loadMore"
          :disabled="isLoading"
          class="h-8 px-4 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors disabled:opacity-40"
        >
          <svg v-if="isLoading" class="w-3 h-3 animate-spin inline-block mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Charger plus
        </button>
      </div>
    </div>
  </template>
</template>
