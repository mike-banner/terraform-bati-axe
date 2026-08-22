<script setup lang="ts">
interface ArtisanDocument {
  id: string
  professional_id: string
  doc_type: 'kbis' | 'urssaf' | 'decennale'
  status: 'pending' | 'valid' | 'expired' | 'suspended'
  file_key: string | null
  expires_at: string | null
  activities_subscribed: string[]
  validated_by_api: boolean
  last_reviewed_at: string | null
  created_at: string
  needs_review: boolean
  professional?: {
    id: string
    company_name: string
    full_name: string
    is_verified: boolean
    is_available_subcontracting: boolean
    workforce_size: number | null
  } | null
}

const DOC_TYPE_LABELS: Record<string, string> = {
  kbis: 'KBIS',
  urssaf: 'Attestation URSSAF',
  decennale: 'Décennale',
}

const STATUS_ORDER = ['pending', 'valid', 'expired', 'suspended'] as const

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  valid: 'Valide',
  expired: 'Expiré',
  suspended: 'Suspendu',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  valid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  expired: 'bg-red-500/10 text-red-400 border-red-500/30',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const documents = ref<ArtisanDocument[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const statusFilter = ref<string>('all')
const expandedId = ref<string | null>(null)
const savingId = ref<string | null>(null)

interface DocDraft {
  status: string
  expires_at: string
  activities: string
}

const draft = reactive<Record<string, DocDraft>>({})

function ensureDraft(id: string): DocDraft {
  let d = draft[id]
  if (!d) {
    const doc = documents.value.find(x => x.id === id)
    d = {
      status: doc?.status || 'pending',
      expires_at: doc?.expires_at ? doc.expires_at.slice(0, 10) : '',
      activities: (doc?.activities_subscribed || []).join(', '),
    }
    draft[id] = d
  }
  return d
}

const filteredDocuments = computed(() =>
  statusFilter.value === 'all'
    ? documents.value
    : documents.value.filter(d => d.status === statusFilter.value)
)

async function fetchDocuments() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await $fetch<{ documents: ArtisanDocument[]; total: number }>('/api/v1/admin/documents-artisan')
    documents.value = data.documents
    for (const d of data.documents) {
      draft[d.id] = {
        status: d.status,
        expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '',
        activities: (d.activities_subscribed || []).join(', '),
      }
    }
    if (!expandedId.value && data.documents.length > 0) {
      expandedId.value = data.documents[0]?.id || null
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de chargement.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDocuments)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function saveChanges(doc: ArtisanDocument) {
  const d = ensureDraft(doc.id)
  savingId.value = doc.id
  errorMessage.value = null
  const payload: Record<string, any> = {}
  if (d.status !== doc.status) payload.status = d.status
  if (d.expires_at !== (doc.expires_at ? doc.expires_at.slice(0, 10) : '')) payload.expires_at = d.expires_at || null
  const activities = d.activities.split(',').map(s => s.trim()).filter(Boolean)
  if (JSON.stringify(activities) !== JSON.stringify(doc.activities_subscribed || [])) payload.activities_subscribed = activities

  if (Object.keys(payload).length === 0) {
    savingId.value = null
    return
  }

  try {
    await $fetch(`/api/v1/admin/documents-artisan/${doc.id}`, { method: 'PATCH', body: payload })
    await fetchDocuments()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de sauvegarde.'
  } finally {
    savingId.value = null
  }
}

async function markReviewed(doc: ArtisanDocument) {
  savingId.value = `${doc.id}-review`
  errorMessage.value = null
  try {
    await $fetch(`/api/v1/admin/documents-artisan/${doc.id}`, {
      method: 'PATCH',
      body: { last_reviewed_at: new Date().toISOString() },
    })
    await fetchDocuments()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de sauvegarde.'
  } finally {
    savingId.value = null
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function daysLeft(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header + filtre -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-muted-foreground">
        {{ documents.length }} document{{ documents.length > 1 ? 's' : '' }} — devoir de vigilance : re-contrôle tous les 6 mois
      </p>
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          v-for="s in ['all', ...STATUS_ORDER]"
          :key="s"
          @click="statusFilter = s"
          class="h-7 px-2.5 text-[11px] font-medium rounded-sm border transition-colors"
          :class="statusFilter === s
            ? 'border-safety bg-safety/10 text-safety'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
        >
          {{ s === 'all' ? 'Tous' : STATUS_LABELS[s] }}
        </button>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="errorMessage" role="alert" class="flex items-start gap-2.5 p-3 border border-destructive/30 bg-destructive/10 rounded-sm text-sm text-destructive">
      <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && documents.length === 0" class="flex justify-center py-16">
      <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredDocuments.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'all' ? 'Aucun document enregistré dans le coffre-fort.' : 'Aucun document dans ce statut.' }}
      </p>
    </div>

    <!-- Liste -->
    <div v-else class="space-y-3">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="border border-border rounded-sm bg-card overflow-hidden"
      >
        <!-- Header -->
        <button
          @click="toggleExpand(doc.id)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-foreground">{{ doc.professional?.company_name || doc.professional?.full_name || 'Pro inconnu' }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">{{ DOC_TYPE_LABELS[doc.doc_type] }}</span>
              <span v-if="doc.needs_review" class="text-[10px] px-1.5 py-0.5 rounded-sm border border-amber-500/30 text-amber-400 bg-amber-500/10 font-semibold">À re-contrôler</span>
            </div>
            <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Expire : {{ fmtDate(doc.expires_at) }}</span>
              <span v-if="daysLeft(doc.expires_at) !== null && daysLeft(doc.expires_at) !== undefined">
                <template v-if="daysLeft(doc.expires_at)! < 0">· expiré depuis {{ -daysLeft(doc.expires_at)! }}j</template>
                <template v-else-if="daysLeft(doc.expires_at)! <= 30">· dans {{ daysLeft(doc.expires_at) }}j ⚠️</template>
              </span>
              <span v-if="doc.professional?.is_available_subcontracting">· capacité sous-traitance ON ({{ doc.professional.workforce_size || '?' }} pers.)</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] px-2 py-1 rounded-sm border font-medium" :class="STATUS_COLORS[doc.status]">
              {{ STATUS_LABELS[doc.status] }}
            </span>
            <svg class="w-4 h-4 text-muted-foreground transition-transform" :class="expandedId === doc.id ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
          </div>
        </button>

        <!-- Détail -->
        <div v-if="expandedId === doc.id" class="border-t border-border px-4 py-4 space-y-4">
          <!-- Activités souscrites -->
          <div>
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Activités souscrites</p>
            <div v-if="doc.activities_subscribed.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="a in doc.activities_subscribed"
                :key="a"
                class="text-[11px] px-2 py-0.5 rounded-sm border border-border bg-muted/40 text-muted-foreground"
              >
                {{ a }}
              </span>
            </div>
            <p v-else class="text-xs text-muted-foreground">Aucune activité renseignée.</p>
          </div>

          <!-- Dernier re-contrôle -->
          <p class="text-[11px] text-muted-foreground">
            Dernier re-contrôle : {{ fmtDate(doc.last_reviewed_at) }}
            <span v-if="doc.needs_review" class="text-amber-400 font-medium"> — re-contrôle requis (devoir de vigilance 6 mois)</span>
          </p>

          <!-- Édition -->
          <div class="grid sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Statut</label>
              <select
                v-model="ensureDraft(doc.id).status"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              >
                <option v-for="s in STATUS_ORDER" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Expiration</label>
              <input
                v-model="ensureDraft(doc.id).expires_at"
                type="date"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              />
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Activités (virgules)</label>
              <input
                v-model="ensureDraft(doc.id).activities"
                maxlength="500"
                placeholder="Gros œuvre, isolation…"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-safety"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 flex-wrap">
            <button
              @click="markReviewed(doc)"
              :disabled="savingId === `${doc.id}-review`"
              class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Re-contrôle effectué
            </button>
            <button
              @click="saveChanges(doc)"
              :disabled="savingId === doc.id"
              class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm bg-safety text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <svg v-if="savingId === doc.id" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
