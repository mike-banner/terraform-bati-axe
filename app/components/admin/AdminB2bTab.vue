<script setup lang="ts">
import type { B2bEngagementRow } from '~/types/b2b'

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
  // Qualification du dossier (appel avec le partenaire)
  qualifications_requises: string[]
  planning_start: string | null
  planning_end: string | null
  created_at: string
  updated_at: string
  assigned?: { email: string } | null
  // 09-03 — Signalement d'un AO suspect (D-09/D-10, purement informatif)
  reported_count?: number
  reported_at?: string | null
  report_reasons?: string[] | null
  // 05.21 — verrou juridique
  partner_framework?: { engagement_id: string; signed_at: string } | null
  engagements?: B2bEngagementRow[]
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

// Pipeline réduit à 3 statuts (Mike, 2026-11-10). Les anciennes valeurs (en_cours, rappele, converti)
// restent affichables pour les dossiers existants mais ne sont plus proposées.
const STATUS_ORDER = ['nouveau', 'qualifie', 'perdu'] as const

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau — aucune action',
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
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const statusFilter = ref<string>('all')
const expandedId = ref<string | null>(null)
const savingId = ref<string | null>(null)

// Phase 8 (D-01) — diffusion automatique aux artisans matchés zone × catégorie.
const diffusingId = ref<string | null>(null)
const diffuseResult = reactive<Record<string, string>>({})
const diffuseError = reactive<Record<string, string>>({})

// Enregistrer d'abord, diffuser ensuite : la diffusion exige un dossier qualifié, un chargé d'affaires,
// un statut de décision et un code postal valides, déjà ENREGISTRÉS (l'API vérifie l'état en base).
function canDiffuse(r: B2bRequest): boolean {
  return r.status === 'qualifie' && Boolean(r.assigned_to)
    && Boolean(r.decision_status) && /^\d{5}$/.test(r.project_postal_code || '')
}

// Bouton actif seulement si l'état enregistré est diffusable ET qu'aucune modification n'attend d'être enregistrée.
function canDiffuseDraft(r: B2bRequest): boolean {
  return canDiffuse(r) && !isDirty(r)
}

async function diffuse(r: B2bRequest) {
  diffusingId.value = r.id
  errorMessage.value = null
  delete diffuseResult[r.id]
  delete diffuseError[r.id]
  try {
    const res = await $fetch<{
      status: string; zone: string; lots_diffused: number
      notifications_sent: number; notifications_skipped: number; notifications_failed: number
    }>(`/api/v1/admin/b2b-requests/${r.id}/diffuse`, { method: 'POST' })
    diffuseResult[r.id] = `${res.lots_diffused} lot(s) diffusé(s) sur ${res.zone} — ${res.notifications_sent} artisan(s) notifié(s)`
      + (res.notifications_skipped ? `, ${res.notifications_skipped} ignoré(s) (plafond quotidien ou déjà notifiés)` : '')
      + (res.notifications_failed ? `, ${res.notifications_failed} échec(s) d'envoi` : '')
    await fetchRequests()
  } catch (err: any) {
    // Affiché sous le bouton : errorMessage en haut de l'onglet est hors de vue.
    diffuseError[r.id] = err.data?.statusMessage || err.message || 'Erreur de diffusion aux artisans.'
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
    const data = await $fetch<{ requests: B2bRequest[]; admins: { id: string; email: string }[] }>('/api/v1/admin/b2b-requests')
    requests.value = data.requests
    admins.value = data.admins
    for (const r of data.requests) {
      draft[r.id] = {
        status: r.status,
        assigned_to: r.assigned_to || '',
        notes: r.notes || '',
        qualifications: (r.qualifications_requises || []).join(', '),
        planning_start: r.planning_start || '',
        planning_end: r.planning_end || '',
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

function buildPayload(r: B2bRequest): Record<string, any> {
  const d = ensureDraft(r.id)
  const payload: Record<string, any> = {}
  if (d.status !== r.status) payload.status = d.status
  if ((d.assigned_to || null) !== (r.assigned_to || null)) payload.assigned_to = d.assigned_to || null
  if (d.notes !== (r.notes || '')) payload.notes = d.notes

  // Qualification DirCo (05.10-08)
  const quals = d.qualifications.split(',').map(s => s.trim()).filter(Boolean)
  if (JSON.stringify(quals) !== JSON.stringify(r.qualifications_requises || [])) payload.qualifications_requises = quals
  if (d.planning_start !== (r.planning_start || '')) payload.planning_start = d.planning_start || null
  if (d.planning_end !== (r.planning_end || '')) payload.planning_end = d.planning_end || null
  if (d.decision_status !== r.decision_status) payload.decision_status = d.decision_status
  if (d.project_postal_code !== (r.project_postal_code || '')) payload.project_postal_code = d.project_postal_code || null
  return payload
}

function isDirty(r: B2bRequest): boolean {
  return Object.keys(buildPayload(r)).length > 0
}

// Enregistrement : chargé d'affaires ET statut choisi (autre que « Nouveau ») obligatoires.
function canSave(r: B2bRequest): boolean {
  const d = ensureDraft(r.id)
  return Boolean(d.assigned_to) && d.status !== 'nouveau'
}

// Confirmation avant de passer un dossier en « Perdu » (le dossier n'est plus proposé aux artisans).
const lostConfirmId = ref<string | null>(null)

function requestSave(r: B2bRequest) {
  const d = ensureDraft(r.id)
  if (d.status === 'perdu' && r.status !== 'perdu') {
    lostConfirmId.value = r.id
    return
  }
  void saveChanges(r)
}

async function confirmLost(r: B2bRequest) {
  lostConfirmId.value = null
  await saveChanges(r)
}

async function saveChanges(r: B2bRequest) {
  savingId.value = r.id
  errorMessage.value = null
  const payload = buildPayload(r)

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

// 05.21 — engagements contractuels
const eur = (cents: number | null) => cents == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : ''
const ENG_LABELS: Record<string, string> = {
  signed: 'Avenant signé — devis à déclarer',
  not_awarded: 'Chantier non obtenu (déclaré par l\'artisan)',
  quote_declared: 'Devis déclaré — attente partenaire',
  quote_confirmed: 'Devis confirmé par le partenaire',
  deposit_paid: 'Acompte versé',
  invoiced: 'Facturé',
}
const linkResult = reactive<Record<string, string>>({})
const reasonOpenId = ref<string | null>(null) // engagement dont le motif de dérogation est en saisie
const engReason = reactive<Record<string, string>>({})

async function resendPartnerLink(r: B2bRequest) {
  delete linkResult[r.id]
  try {
    await $fetch(`/api/v1/admin/b2b-requests/${r.id}/partner-link`, { method: 'POST' })
    linkResult[r.id] = 'Lien de signature envoyé au partenaire.'
  } catch (err: any) {
    linkResult[r.id] = err.data?.statusMessage || 'Envoi impossible.'
  }
}

async function advanceEngagement(e: B2bEngagementRow, status: 'deposit_paid' | 'invoiced', reason?: string) {
  errorMessage.value = null
  try {
    await $fetch(`/api/v1/admin/engagements/${e.id}`, { method: 'PATCH', body: reason ? { status, reason } : { status } })
    reasonOpenId.value = null
    await fetchRequests()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Mise à jour impossible.'
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
        {{ requests.length }} dossier{{ requests.length > 1 ? 's' : '' }} — à rappeler au plus vite
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
                ⚠ Signalé{{ (r.reported_count ?? 0) > 1 ? ` ×${r.reported_count}` : '' }}
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
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Statut pipeline <span class="text-destructive" aria-hidden="true">*</span></label>
              <select
                v-model="ensureDraft(r.id).status"
                required
                aria-required="true"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              >
                <option v-for="s in STATUS_ORDER" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
                <!-- Ancien statut d'un dossier existant : affiché, plus proposé -->
                <option v-if="!(STATUS_ORDER as readonly string[]).includes(r.status)" :value="r.status" disabled>{{ STATUS_LABELS[r.status] }} (ancien statut)</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Chargé d'affaires <span class="text-destructive" aria-hidden="true">*</span></label>
              <select
                v-model="ensureDraft(r.id).assigned_to"
                required
                aria-required="true"
                class="w-full h-9 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:border-safety"
              >
                <option value="" disabled>Choisir un chargé d'affaires…</option>
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
                <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Statut de la décision <span class="text-destructive" aria-hidden="true">*</span></label>
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
                <label class="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Code postal du projet <span class="text-destructive" aria-hidden="true">*</span></label>
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

            <!-- 05.21 — Engagements contractuels -->
            <div data-testid="admin-engagements" class="border-t border-border pt-4 space-y-3">
              <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Engagements contractuels</p>
              <div class="flex items-center gap-2 flex-wrap text-sm">
                <template v-if="r.partner_framework">
                  <span class="text-[11px] px-2 py-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Convention signée le {{ fmtDate(r.partner_framework.signed_at) }}</span>
                  <a :href="`/api/v1/engagements/${r.partner_framework.engagement_id}/document`" target="_blank" rel="noopener" class="text-xs text-safety hover:underline">Voir</a>
                </template>
                <template v-else>
                  <span class="text-[11px] px-2 py-1 rounded-sm border border-amber-500/30 bg-amber-500/10 text-amber-500">Convention partenaire non signée</span>
                  <button type="button" class="h-7 px-2.5 text-xs rounded-sm border border-border hover:bg-muted" @click="resendPartnerLink(r)">Renvoyer le lien de signature</button>
                </template>
                <span v-if="linkResult[r.id]" class="text-[11px] text-emerald-500">{{ linkResult[r.id] }}</span>
              </div>

              <p v-if="!r.engagements?.length" class="text-xs text-muted-foreground">Aucun avenant signé pour ce dossier.</p>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th class="py-1 pr-3">Artisan</th><th class="pr-3">Lot</th><th class="pr-3">Statut</th><th class="pr-3">Déclaré HT</th><th class="pr-3">Confirmé HT</th><th class="pr-3">Commission HT</th><th class="pr-3">Relances</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="e in r.engagements" :key="e.id" class="border-t border-border align-top">
                      <td class="py-2 pr-3">{{ e.pro_company || '—' }}</td>
                      <td class="pr-3">{{ e.lot_category || '—' }}</td>
                      <td class="pr-3">
                        <span :class="e.status === 'not_awarded' ? 'px-1.5 py-0.5 rounded-sm border border-amber-500/30 bg-amber-500/10 text-amber-500' : ''">{{ ENG_LABELS[e.status] ?? e.status }}</span>
                      </td>
                      <td class="pr-3">{{ eur(e.declared_amount_cents) }}</td>
                      <td class="pr-3">
                        {{ eur(e.confirmed_amount_cents) }}
                        <span v-if="e.confirmed_amount_cents != null && e.declared_amount_cents != null && e.confirmed_amount_cents !== e.declared_amount_cents" class="ml-1 px-1.5 py-0.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive font-semibold">Écart</span>
                      </td>
                      <td class="pr-3">{{ eur(e.commission_cents) }}</td>
                      <td class="pr-3">
                        <div v-if="e.reminder_30_sent_at">J+30 {{ fmtDate(e.reminder_30_sent_at) }}</div>
                        <div v-if="e.reminder_60_sent_at">J+60 {{ fmtDate(e.reminder_60_sent_at) }}</div>
                      </td>
                      <td class="space-y-1.5">
                        <button v-if="e.status === 'quote_confirmed'" type="button" class="block h-7 px-2.5 rounded-sm border border-border hover:bg-muted" @click="advanceEngagement(e, 'deposit_paid')">Acompte versé</button>
                        <template v-if="e.status === 'quote_declared'">
                          <button type="button" class="block h-7 px-2.5 rounded-sm border border-amber-500/40 text-amber-500 hover:bg-amber-500/10" @click="reasonOpenId = reasonOpenId === e.id ? null : e.id">Forcer l'acompte (dérogation)</button>
                          <div v-if="reasonOpenId === e.id" class="space-y-1">
                            <textarea v-model="engReason[e.id]" rows="2" minlength="10" maxlength="500" required placeholder="Motif de la dérogation" aria-label="Motif de la dérogation" class="w-full px-2 py-1 rounded-sm border border-border bg-background" />
                            <button type="button" :disabled="(engReason[e.id] || '').trim().length < 10" class="h-7 px-2.5 rounded-sm bg-safety text-white disabled:opacity-40" @click="advanceEngagement(e, 'deposit_paid', (engReason[e.id] || '').trim())">Confirmer la dérogation</button>
                          </div>
                        </template>
                        <button v-if="e.status === 'deposit_paid'" type="button" class="block h-7 px-2.5 rounded-sm border border-border hover:bg-muted" @click="advanceEngagement(e, 'invoiced')">Facturé</button>
                        <a :href="`/api/v1/engagements/${e.id}/document`" target="_blank" rel="noopener" class="block text-safety hover:underline">Avenant</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 1. Enregistrer (chargé d'affaires + statut obligatoires), avant toute autre action -->
            <div class="mt-4 border-t border-border pt-4">
              <p class="text-[11px] text-muted-foreground mb-2"><span class="text-destructive">*</span> Chargé d'affaires et statut obligatoires pour enregistrer.</p>
              <div class="flex items-center justify-end gap-2">
                <span v-if="!canSave(r)" class="text-[11px] text-amber-500">
                  {{ !ensureDraft(r.id).assigned_to ? 'Choisissez un chargé d\'affaires.' : 'Choisissez un statut : Qualifié ou Perdu.' }}
                </span>
                <button
                  @click="requestSave(r)"
                  :disabled="savingId === r.id || !canSave(r)"
                  class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm bg-safety text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <svg v-if="savingId === r.id" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Enregistrer
                </button>
              </div>
              <div v-if="lostConfirmId === r.id" class="mt-2 p-3 border border-red-500/30 bg-red-500/10 rounded-sm space-y-2" role="alertdialog" aria-label="Confirmer le passage en perdu">
                <p class="text-sm text-red-400">Êtes-vous sûr de passer ce dossier en « Perdu » ? Il ne sera plus proposé aux artisans.</p>
                <div class="flex items-center gap-2">
                  <button type="button" class="h-9 px-4 text-sm font-medium rounded-sm bg-red-600 text-white hover:opacity-90" @click="confirmLost(r)">Oui, passer en Perdu</button>
                  <button type="button" class="h-9 px-4 text-sm font-medium rounded-sm border border-border hover:bg-muted" @click="lostConfirmId = null">Annuler</button>
                </div>
              </div>
            </div>

            <!-- 2. Phase 8 (D-01) — Diffusion automatique aux artisans matchés (dossier qualifié et enregistré) -->
            <div class="mt-4 border-t border-border pt-4">
              <p class="text-[11px] text-muted-foreground mb-2"><span class="text-destructive">*</span> Dossier qualifié et enregistré, statut de décision et code postal obligatoires pour diffuser.</p>
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
                <span v-if="!r.partner_framework">
                  Le partenaire doit signer la convention de partenariat avant toute diffusion.
                </span>
                <span v-else-if="canDiffuseDraft(r)">
                  Diffuse tous les lots ouverts de ce dossier aux artisans vérifiés ayant une zone active
                  correspondante et la catégorie du lot.
                </span>
                <span v-else-if="isDirty(r)">
                  Des modifications ne sont pas enregistrées : <strong>enregistrez</strong> avant de diffuser.
                </span>
                <span v-else>
                  Pour diffuser : statut <strong>Qualifié</strong>, chargé d'affaires, statut de décision et code postal à 5 chiffres,
                  puis <strong>enregistrez</strong>.
                </span>
              </div>
              <p v-if="diffuseError[r.id]" class="mt-1.5 text-sm text-red-500" role="alert">{{ diffuseError[r.id] }}</p>
              <p v-if="diffuseResult[r.id]" class="mt-1.5 text-[11px] text-emerald-500">
                {{ diffuseResult[r.id] }}
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  </div>
</template>
