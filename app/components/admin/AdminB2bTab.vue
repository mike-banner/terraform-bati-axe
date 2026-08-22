<script setup lang="ts">
interface B2bFile {
  file_key: string
  filename: string
  content_type: string
  size: number
}

interface B2bRequest {
  id: string
  apporteur_type: 'architecte' | 'bet' | 'agence_immo' | 'syndic' | 'autre'
  need_type: 'projet_immediat' | 'partenariat_regulier'
  project_location: string | null
  budget_range: '<30k' | '30-100k' | '100-300k' | '>300k' | null
  files: B2bFile[]
  contact_name: string
  contact_company: string | null
  contact_phone: string
  contact_email: string
  consent_accepted: boolean
  consent_at: string | null
  status: 'nouveau' | 'en_cours' | 'rappele' | 'qualifie' | 'converti' | 'perdu'
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  assigned?: { email: string } | null
}

const APPORTEUR_LABELS: Record<string, string> = {
  architecte: 'Architecte / MOA',
  bet: "Bureau d'études",
  agence_immo: 'Agence immo',
  syndic: 'Syndic',
  autre: 'Autre',
}

const NEED_LABELS: Record<string, string> = {
  projet_immediat: 'Projet immédiat',
  partenariat_regulier: 'Partenariat régulier',
}

const BUDGET_LABELS: Record<string, string> = {
  '<30k': '< 30 k€',
  '30-100k': '30–100 k€',
  '100-300k': '100–300 k€',
  '>300k': '> 300 k€',
}

const STATUS_ORDER = ['nouveau', 'en_cours', 'rappele', 'qualifie', 'converti', 'perdu'] as const

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  rappele: 'Rappelé',
  qualifie: 'Qualifié',
  converti: 'Converti',
  perdu: 'Perdu',
}

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  en_cours: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  rappele: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  qualifie: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  converti: 'bg-green-500/10 text-green-400 border-green-500/30',
  perdu: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const requests = ref<B2bRequest[]>([])
const admins = ref<{ id: string; email: string }[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const statusFilter = ref<string>('all')
const expandedId = ref<string | null>(null)
const savingId = ref<string | null>(null)

// Formulaires par demande (sans muter les props reçues)
interface B2bDraft {
  status: string
  assigned_to: string
  notes: string
}

const draft = reactive<Record<string, B2bDraft>>({})

// Accès garanti (noUncheckedIndexedAccess) — crée le brouillon si absent
function ensureDraft(id: string): B2bDraft {
  let d = draft[id]
  if (!d) {
    const r = requests.value.find(x => x.id === id)
    d = {
      status: r?.status || 'nouveau',
      assigned_to: r?.assigned_to || '',
      notes: r?.notes || '',
    }
    draft[id] = d
  }
  return d
}

const filteredRequests = computed(() =>
  statusFilter.value === 'all'
    ? requests.value
    : requests.value.filter(r => r.status === statusFilter.value)
)

async function fetchRequests() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await $fetch<{ requests: B2bRequest[]; admins: { id: string; email: string }[] }>('/api/v1/admin/b2b-requests')
    requests.value = data.requests
    admins.value = data.admins
    for (const r of data.requests) {
      draft[r.id] = {
        status: r.status,
        assigned_to: r.assigned_to || '',
        notes: r.notes || '',
      }
    }
    if (!expandedId.value && data.requests.length > 0) {
      expandedId.value = data.requests[0]?.id || null
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de chargement.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchRequests)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function saveChanges(r: B2bRequest) {
  const d = ensureDraft(r.id)
  savingId.value = r.id
  errorMessage.value = null
  const payload: Record<string, any> = {}
  if (d.status !== r.status) payload.status = d.status
  if ((d.assigned_to || null) !== (r.assigned_to || null)) payload.assigned_to = d.assigned_to || null
  if (d.notes !== (r.notes || '')) payload.notes = d.notes

  if (Object.keys(payload).length === 0) {
    savingId.value = null
    return
  }

  try {
    const res = await $fetch<{ status: string; request: Partial<B2bRequest> }>(`/api/v1/admin/b2b-requests/${r.id}`, {
      method: 'PATCH',
      body: payload,
    })
    Object.assign(r, res.request)
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de sauvegarde.'
  } finally {
    savingId.value = null
  }
}

async function viewFile(file: B2bFile) {
  try {
    const res = await $fetch<{ status: string; signedUrl: string }>('/api/v1/admin/b2b-file.view', {
      method: 'POST',
      body: { file_key: file.file_key },
    })
    if (res.signedUrl) window.open(res.signedUrl, '_blank')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Impossible d\'ouvrir la pièce.'
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

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

function pipelineLabel(status: string): string {
  const idx = STATUS_ORDER.indexOf(status as any)
  return idx >= 0 ? `Étape ${idx + 1}/${STATUS_ORDER.length}` : ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header + filtre -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-muted-foreground">
        {{ requests.length }} dossier{{ requests.length > 1 ? 's' : '' }} — rappel engagé sous 4h ouvrées
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
    <div v-if="isLoading && requests.length === 0" class="flex justify-center py-16">
      <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRequests.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'all' ? 'Aucun dossier B2B reçu pour le moment.' : 'Aucun dossier dans ce statut.' }}
      </p>
    </div>

    <!-- Queue -->
    <div v-else class="space-y-3">
      <div
        v-for="r in filteredRequests"
        :key="r.id"
        class="border border-border rounded-sm bg-card overflow-hidden"
      >
        <!-- Card header (cliquable) -->
        <button
          @click="toggleExpand(r.id)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-foreground">{{ r.contact_name }}</span>
              <span v-if="r.contact_company" class="text-xs text-muted-foreground">{{ r.contact_company }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">{{ APPORTEUR_LABELS[r.apporteur_type] }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{{ NEED_LABELS[r.need_type] }}</span>
              <span v-if="r.project_location">• {{ r.project_location }}</span>
              <span v-if="r.budget_range">• {{ BUDGET_LABELS[r.budget_range] }}</span>
              <span>• {{ timeAgo(r.created_at) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] text-muted-foreground hidden sm:inline">{{ pipelineLabel(r.status) }}</span>
            <span class="text-[11px] px-2 py-1 rounded-sm border font-medium" :class="STATUS_COLORS[r.status]">
              {{ STATUS_LABELS[r.status] }}
            </span>
            <svg class="w-4 h-4 text-muted-foreground transition-transform" :class="expandedId === r.id ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
          </div>
        </button>

        <!-- Card body (détail) -->
        <div v-if="expandedId === r.id" class="border-t border-border px-4 py-4 space-y-4">
          <!-- Coordonnées -->
          <div class="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Contact</p>
              <p class="text-foreground font-medium">{{ r.contact_name }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ r.contact_company || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Téléphone</p>
              <a :href="`tel:${r.contact_phone}`" class="text-safety hover:underline">{{ r.contact_phone }}</a>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Email</p>
              <a :href="`mailto:${r.contact_email}`" class="text-safety hover:underline break-all">{{ r.contact_email }}</a>
            </div>
          </div>

          <!-- Pièces jointes -->
          <div v-if="r.files.length > 0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Pièces jointes ({{ r.files.length }})
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="f in r.files"
                :key="f.file_key"
                @click="viewFile(f)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-sm border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                :title="f.filename"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                <span class="max-w-40 truncate">{{ f.filename }}</span>
                <span class="text-[10px] opacity-60">{{ formatSize(f.size) }}</span>
              </button>
            </div>
          </div>

          <!-- Gestion pipeline -->
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Statut pipeline</label>
              <select
                v-model="ensureDraft(r.id).status"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              >
                <option v-for="s in STATUS_ORDER" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Chargé d'affaires</label>
              <select
                v-model="ensureDraft(r.id).assigned_to"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              >
                <option value="">Non assigné</option>
                <option v-for="a in admins" :key="a.id" :value="a.id">{{ a.email }}</option>
              </select>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Notes internes</label>
            <textarea
              v-model="ensureDraft(r.id).notes"
              rows="2"
              maxlength="5000"
              placeholder="Qualification du besoin, actions de rappel…"
              class="w-full px-2.5 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-safety resize-y"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2">
            <span v-if="r.assigned?.email" class="text-[11px] text-muted-foreground">
              Assigné à {{ r.assigned.email }}
            </span>
            <button
              @click="saveChanges(r)"
              :disabled="savingId === r.id"
              class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm bg-safety text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <svg v-if="savingId === r.id" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
