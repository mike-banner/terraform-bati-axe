<script setup lang="ts">
interface B2bFile {
  file_key: string
  filename: string
  content_type: string
  size: number
}

interface B2bRequest {
  id: string
  apporteur_type: 'architecte' | 'bet' | 'agence_immo' | 'syndic' | 'diagnostiqueur' | 'autre'
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
  description: string | null
  decision_status: 'confirme' | 'en_attente'
  project_postal_code: string | null
  // 05.10-08 — Qualification DirCo
  qualifications_requises: string[]
  planning_start: string | null
  planning_end: string | null
  recommended_pros: string[]
  created_at: string
  updated_at: string
  assigned?: { email: string } | null
  // 09-03 — Signalement d'un AO suspect (D-09/D-10, purement informatif)
  reported_count?: number
  reported_at?: string | null
  report_reasons?: string[] | null
}

interface B2bPro {
  id: string
  company_name: string
  full_name: string
  category: string | null
  canonical_slug: string | null
  postal_code: string | null
}

const APPORTEUR_LABELS: Record<string, string> = {
  architecte: 'Architecte / MOA',
  bet: "Bureau d'études",
  agence_immo: 'Agence immo',
  syndic: 'Syndic',
  diagnostiqueur: 'Diagnostiqueur',
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

const DECISION_LABELS: Record<string, string> = {
  confirme: 'Confirmé — travaux décidés et budgétés',
  en_attente: 'En attente de décision — devis à comparer avant validation (ex. avant AG)',
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
const professionals = ref<B2bPro[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const statusFilter = ref<string>('all')
const expandedId = ref<string | null>(null)
const savingId = ref<string | null>(null)
const restitutionId = ref<string | null>(null)

// Phase 8 (D-01) — diffusion automatique aux artisans matchés zone × catégorie.
const diffusingId = ref<string | null>(null)
const diffuseResult = reactive<Record<string, string>>({})

// État persisté (ce que l'API vérifie réellement côté serveur).
function canDiffuse(r: B2bRequest): boolean {
  return Boolean(r.decision_status) && /^\d{5}$/.test(r.project_postal_code || '')
}

// État du brouillon en cours de saisie — active le bouton dès une saisie valide ;
// diffuse() enregistre automatiquement avant d'appeler l'API si besoin.
function canDiffuseDraft(r: B2bRequest): boolean {
  const d = ensureDraft(r.id)
  return Boolean(d.decision_status) && /^\d{5}$/.test(d.project_postal_code || '')
}

async function diffuse(r: B2bRequest) {
  diffusingId.value = r.id
  errorMessage.value = null
  delete diffuseResult[r.id]
  try {
    // Le statut de décision / code postal peuvent avoir été saisis sans clic
    // séparé sur "Enregistrer" — on les persiste ici pour éviter le 422
    // (l'API vérifie l'état en base, pas le brouillon local).
    const d = ensureDraft(r.id)
    if (d.decision_status !== r.decision_status || d.project_postal_code !== (r.project_postal_code || '')) {
      await saveChanges(r)
      if (!canDiffuse(r)) return
    }
    const res = await $fetch<{
      status: string; zone: string; lots_diffused: number
      notifications_sent: number; notifications_skipped: number; notifications_failed: number
    }>(`/api/v1/admin/b2b-requests/${r.id}/diffuse`, { method: 'POST' })
    diffuseResult[r.id] = `${res.lots_diffused} lot(s) diffusé(s) sur ${res.zone} — ${res.notifications_sent} artisan(s) notifié(s)`
      + (res.notifications_skipped ? `, ${res.notifications_skipped} ignoré(s) (plafond quotidien ou déjà notifiés)` : '')
      + (res.notifications_failed ? `, ${res.notifications_failed} échec(s) d'envoi` : '')
    await fetchRequests()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur de diffusion aux artisans.'
  } finally {
    diffusingId.value = null
  }
}

// Formulaires par demande (sans muter les props reçues)
interface B2bDraft {
  status: string
  assigned_to: string
  notes: string
  qualifications: string
  planning_start: string
  planning_end: string
  recommended: string[]
  decision_status: string
  project_postal_code: string
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
      qualifications: (r?.qualifications_requises || []).join(', '),
      planning_start: r?.planning_start || '',
      planning_end: r?.planning_end || '',
      recommended: [...(r?.recommended_pros || [])],
      decision_status: r?.decision_status || 'en_attente',
      project_postal_code: r?.project_postal_code || '',
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
    const data = await $fetch<{ requests: B2bRequest[]; admins: { id: string; email: string }[]; professionals: B2bPro[] }>('/api/v1/admin/b2b-requests')
    requests.value = data.requests
    admins.value = data.admins
    professionals.value = data.professionals || []
    for (const r of data.requests) {
      draft[r.id] = {
        status: r.status,
        assigned_to: r.assigned_to || '',
        notes: r.notes || '',
        qualifications: (r.qualifications_requises || []).join(', '),
        planning_start: r.planning_start || '',
        planning_end: r.planning_end || '',
        recommended: [...(r.recommended_pros || [])],
        decision_status: r.decision_status || 'en_attente',
        project_postal_code: r.project_postal_code || '',
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

  // Qualification DirCo (05.10-08)
  const quals = d.qualifications.split(',').map(s => s.trim()).filter(Boolean)
  if (JSON.stringify(quals) !== JSON.stringify(r.qualifications_requises || [])) payload.qualifications_requises = quals
  if (d.planning_start !== (r.planning_start || '')) payload.planning_start = d.planning_start || null
  if (d.planning_end !== (r.planning_end || '')) payload.planning_end = d.planning_end || null
  if (JSON.stringify(d.recommended) !== JSON.stringify(r.recommended_pros || [])) payload.recommended_pros = d.recommended
  if (d.decision_status !== r.decision_status) payload.decision_status = d.decision_status
  if (d.project_postal_code !== (r.project_postal_code || '')) payload.project_postal_code = d.project_postal_code || null

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

function togglePro(r: B2bRequest, proId: string) {
  const d = ensureDraft(r.id)
  const idx = d.recommended.indexOf(proId)
  if (idx >= 0) d.recommended.splice(idx, 1)
  else if (d.recommended.length < 3) d.recommended.push(proId)
}

async function sendRestitution(r: B2bRequest) {
  restitutionId.value = r.id
  errorMessage.value = null
  try {
    await $fetch(`/api/v1/admin/b2b-requests/${r.id}/restitution`, { method: 'POST' })
    await fetchRequests()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Erreur d\'envoi des propositions.'
  } finally {
    restitutionId.value = null
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
              <span
                v-if="(r.reported_count || 0) > 0"
                class="text-[10px] px-1.5 py-0.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive font-semibold"
                :title="(r.report_reasons || []).join(' · ')"
              >
                ⚠ Signalé{{ r.reported_count > 1 ? ` ×${r.reported_count}` : '' }}
              </span>
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
          <!-- Signalement artisan (D-09/D-10) -->
          <div v-if="(r.reported_count || 0) > 0" class="p-3 border border-destructive/30 bg-destructive/5 rounded-sm">
            <p class="text-[10px] uppercase tracking-wide text-destructive font-semibold mb-1.5">
              Signalé {{ r.reported_count }} fois par des artisans — dernier signalement {{ timeAgo(r.reported_at!) }}
            </p>
            <ul class="text-xs text-muted-foreground space-y-0.5">
              <li v-for="(reason, i) in (r.report_reasons || [])" :key="i">• {{ reason }}</li>
            </ul>
            <p class="text-[11px] text-muted-foreground mt-2">
              Signalement informatif : l'appel d'offres reste diffusé. À vous de décider (garder, clore, contacter le partenaire).
            </p>
          </div>

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

          <!-- Besoin décrit par le partenaire -->
          <div v-if="r.description" class="mb-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Besoin décrit par le partenaire</p>
            <p class="text-sm text-foreground whitespace-pre-line">{{ r.description }}</p>
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

          <!-- Qualification DirCo (05.10-08) -->
          <div class="border-t border-border pt-4">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">Qualification DirCo</p>

            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Qualifications requises (Qualibat, RGE…)</label>
                <input
                  v-model="ensureDraft(r.id).qualifications"
                  maxlength="500"
                  placeholder="Isolation RGE, électricité Qualifelec… (séparées par des virgules)"
                  class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-safety"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Début planning</label>
                  <input
                    v-model="ensureDraft(r.id).planning_start"
                    type="date"
                    class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Fin planning</label>
                  <input
                    v-model="ensureDraft(r.id).planning_end"
                    type="date"
                    class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
                  />
                </div>
              </div>
            </div>

            <div class="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Statut de la décision</label>
                <select
                  v-model="ensureDraft(r.id).decision_status"
                  class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
                >
                  <option v-for="(label, value) in DECISION_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
                <p class="mt-1.5 text-[10px] text-muted-foreground">
                  Visible par l'artisan avant qu'il ne réponde. Un AO confirmé se ferme au premier artisan intéressé ; un AO en attente accepte plusieurs devis.
                </p>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Code postal du projet</label>
                <input
                  v-model="ensureDraft(r.id).project_postal_code"
                  type="text"
                  inputmode="numeric"
                  maxlength="5"
                  pattern="\d{5}"
                  placeholder="78000"
                  class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-safety"
                />
                <p v-if="ensureDraft(r.id).project_postal_code && !/^\d{5}$/.test(ensureDraft(r.id).project_postal_code)" class="mt-1.5 text-[10px] text-destructive">
                  Code postal invalide (5 chiffres attendus).
                </p>
              </div>
            </div>

            <!-- Picker sous-traitants (max 3) -->
            <div class="mt-3">
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Sous-traitants recommandés ({{ ensureDraft(r.id).recommended.length }}/3) — restitution au donneur d'ordres uniquement
              </label>
              <div v-if="professionals.length === 0" class="text-xs text-muted-foreground border border-dashed border-border rounded-sm px-3 py-2">
                Aucun pro vérifié disponible pour la sélection.
              </div>
              <div v-else class="max-h-44 overflow-y-auto border border-border rounded-sm divide-y divide-border">
                <label
                  v-for="p in professionals"
                  :key="p.id"
                  class="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  :class="{
                    'opacity-40 pointer-events-none': !ensureDraft(r.id).recommended.includes(p.id) && ensureDraft(r.id).recommended.length >= 3
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="ensureDraft(r.id).recommended.includes(p.id)"
                    @change="togglePro(r, p.id)"
                    class="accent-[#EA580C] shrink-0"
                  />
                  <span class="text-sm text-foreground truncate">{{ p.company_name || p.full_name }}</span>
                  <span v-if="p.category" class="text-[10px] text-muted-foreground ml-auto shrink-0">{{ p.category }}</span>
                </label>
              </div>
            </div>

            <!-- Phase 8 (D-01) — Diffusion automatique aux artisans matchés -->
            <div class="mt-4 border-t border-border pt-4">
              <div class="flex items-center justify-end">
                <button
                  @click="diffuse(r)"
                  :disabled="diffusingId === r.id || !canDiffuseDraft(r)"
                  class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm bg-safety text-white hover:bg-safety/90 transition-colors disabled:opacity-40"
                >
                  <svg v-if="diffusingId === r.id" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Diffuser aux artisans
                </button>
              </div>
              <div
                class="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-sm border text-sm"
                :class="canDiffuseDraft(r) ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-500'"
              >
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                <span v-if="canDiffuseDraft(r)">
                  Diffuse tous les lots ouverts de ce dossier aux artisans vérifiés ayant une zone active
                  correspondante et la catégorie du lot.
                </span>
                <span v-else>
                  Renseignez le statut de décision et un code postal à 5 chiffres, puis <strong>enregistrez</strong>,
                  pour activer la diffusion.
                </span>
              </div>
              <p v-if="diffuseResult[r.id]" class="mt-1.5 text-[11px] text-emerald-500">
                {{ diffuseResult[r.id] }}
              </p>
            </div>

            <!-- Restitution au donneur d'ordres -->
            <div class="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <p class="text-[11px] text-muted-foreground">
                Statut : {{ STATUS_LABELS[r.status] }}
                <span v-if="r.recommended_pros && r.recommended_pros.length"> — {{ r.recommended_pros.length }} pro(s) recommandé(s)</span>
              </p>
              <button
                @click="sendRestitution(r)"
                :disabled="restitutionId === r.id || ensureDraft(r.id).recommended.length === 0"
                class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm border border-safety text-safety hover:bg-safety/10 transition-colors disabled:opacity-40"
              >
                <svg v-if="restitutionId === r.id" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Envoyer les propositions au donneur d'ordres
              </button>
            </div>
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
