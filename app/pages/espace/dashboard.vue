<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })

interface Pro {
  id: string; company_name: string; full_name: string; phone: string
  postal_code: string; canonical_slug: string; short_id: string
  is_verified: boolean; is_claimed: boolean; decennal_status: string; created_at: string
  categories: string[]; bio?: string; logo_url?: string
  siret_status?: string | null
  siret_company_name?: string | null
  siret_legal_form?: string | null
  siret_naf_code?: string | null
  is_available_subcontracting?: boolean
  workforce_size?: number | null
  lead_alerts_email?: boolean
}
interface Verif {
  document_type: string; status: string; expiry_date: string | null; created_at: string
  file_key?: string; reviewed_at?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie: 'Maçonnerie', toiture: 'Toiture', electricite: 'Électricité',
  plomberie: 'Plomberie', peinture: 'Peinture', isolation: 'Isolation',
}

const supabase = useSupabaseClient()
const { user } = useRequireAuth()
useHead({ title: 'Mon profil — BÂTI-AXE' })

const pro    = ref<Pro | null>(null)
const verifs = ref<Verif[]>([])
const loading = ref(true)
const router = useRouter()
const activeZoneCount = ref(0)

async function loadProData() {
  loading.value = true
  try {
    // Le token JWT doit être attaché au client Supabase AVANT la requête : sinon
    // elle part en `anon` et la policy RLS publique (is_verified=true) masque la
    // ligne d'un pro non encore vérifié → faux « Profil introuvable ».
    // getSession() force la restauration de la session et donc l'attache du token.
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) {
      loading.value = false
      return
    }
    const [{ data: proData, error: proErr }, { data: verifData, error: verifErr }, { count: zoneCount }] = await Promise.all([
      supabase.from('professionals')
        .select('id, company_name, full_name, phone, postal_code, canonical_slug, short_id, is_verified, is_claimed, decennal_status, siret_status, siret_company_name, siret_legal_form, siret_naf_code, created_at, categories, bio, logo_url, is_available_subcontracting, workforce_size, lead_alerts_email')
        .eq('id', uid).maybeSingle(),
      supabase.from('verifications')
        .select('document_type, status, expiry_date, created_at, file_key, reviewed_at')
        .eq('pro_id', uid).order('created_at', { ascending: false }),
      supabase.from('pro_zones')
        .select('id', { count: 'exact', head: true })
        .eq('pro_id', uid).eq('status', 'active')
    ])
    if (proErr && proErr.code !== 'PGRST116') console.error('[dashboard] pro fetch:', proErr.message)
    if (verifErr) console.error('[dashboard] verif fetch:', verifErr.message)
    activeZoneCount.value = zoneCount || 0
    
    if (!proData) {
      console.warn('[dashboard] Profile missing, proData is null. Showing fallback UI.')
      return
    }

    pro.value    = proData as Pro | null
    verifs.value = (verifData || []) as Verif[]
  } catch (e) {
    console.error('Error loading pro data', e)
  } finally {
    loading.value = false
  }
}

watch(user, () => loadProData(), { immediate: true })

const kbis      = computed(() => verifs.value?.find(v => v.document_type === 'kbis'))
const decennale = computed(() => verifs.value?.find(v => v.document_type === 'decennale'))

// Nom de fichier lisible (dernier segment de la clé R2) + dates
const docFileName = (key?: string) => key ? key.split('/').pop() : ''
const docFmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : ''
const docPeriod = (doc?: Verif) => {
  if (!doc) return null
  if (doc.status === 'approved' && doc.expiry_date) {
    return { prefix: 'En vigueur du ', date1: docFmtDate(doc.reviewed_at || doc.created_at), middle: ' au ', date2: docFmtDate(doc.expiry_date) }
  }
  return { prefix: 'Envoyé le ', date1: docFmtDate(doc.created_at), middle: '', date2: '' }
}

const docStatus = (doc: any) => {
  if (!doc) return { label: 'Non envoyé', cls: 'text-muted-foreground border-border' }
  
  if (doc.status === 'approved') {
    if (doc.expiry_date) {
      const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      if (daysLeft < 0) {
        return { label: 'Expiré ⚠️', cls: 'text-red-700 border-red-200 bg-red-50' }
      }
      const warningDays = doc.document_type === 'decennale' ? 30 : 14
      if (daysLeft <= warningDays) {
        return { label: 'Expire bientôt', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
      }
    }
    return { label: 'Validé ✓', cls: 'text-emerald-800 border-emerald-400 bg-emerald-100' }
  }
  
  if (doc.status === 'rejected') return { label: 'Rejeté', cls: 'text-red-700 border-red-200 bg-red-50' }
  return { label: 'En attente', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
}

// ─── Upload inline ─────────────────────────────────────────────────────────────
const uploads = reactive({
  kbis:      { file: null as File | null, status: 'idle' as 'idle'|'uploading'|'success'|'error', error: '' },
  decennale: { file: null as File | null, status: 'idle' as 'idle'|'uploading'|'success'|'error', error: '',
    policyNumber: '', expirationDate: '' },
})

// ─── Capacité sous-traitance (05.11-02) ─────────────────────────────────────
const capacity = reactive({ saving: false, available: false, workforce: '' })

// ─── Alertes email nouveaux leads (P4) ───────────────────────────────────────
const leadAlerts = reactive({ saving: false, enabled: true })

watch(() => pro.value, (p) => {
  if (p) {
    capacity.available = p.is_available_subcontracting === true
    capacity.workforce = p.workforce_size != null ? String(p.workforce_size) : ''
    leadAlerts.enabled = p.lead_alerts_email !== false
  }
}, { immediate: true })

async function saveLeadAlerts() {
  leadAlerts.saving = true
  try {
    await $fetch('/api/v1/pro/profile/me', {
      method: 'PATCH',
      body: { lead_alerts_email: leadAlerts.enabled },
    })
    if (pro.value) pro.value.lead_alerts_email = leadAlerts.enabled
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Erreur de sauvegarde.')
  } finally {
    leadAlerts.saving = false
  }
}

async function saveCapacity() {
  capacity.saving = true
  try {
    const workforce = capacity.workforce === '' ? null : Number(capacity.workforce)
    if (workforce != null && (!Number.isInteger(workforce) || workforce < 1 || workforce > 999)) {
      throw new Error('Effectif invalide (1 à 999).')
    }
    await $fetch('/api/v1/pro/profile/me', {
      method: 'PATCH',
      body: { is_available_subcontracting: capacity.available, workforce_size: workforce },
    })
    if (pro.value) {
      pro.value.is_available_subcontracting = capacity.available
      pro.value.workforce_size = workforce
    }
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Erreur de sauvegarde.')
  } finally {
    capacity.saving = false
  }
}

function onFileSelect(e: Event, type: 'kbis' | 'decennale') {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { uploads[type].file = f; uploads[type].status = 'idle'; uploads[type].error = '' }
}

async function uploadDoc(type: 'kbis' | 'decennale') {
  const file = uploads[type].file
  if (!file) return
  uploads[type].status = 'uploading'
  uploads[type].error  = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) throw new Error('Utilisateur non connecté.')

    const presign = await $fetch<{ status: string; signedUrl: string; fileKey: string }>(
      '/api/v1/pro/documents/presign',
      { method: 'POST', body: { document_type: type, content_type: file.type, filename: file.name } }
    )
    if (presign.status !== 'SUCCESS') throw new Error('Erreur de signature.')
    const res = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error('Échec du transfert.')

    // Historisation via endpoint serveur : auto-approbation pour la décennale,
    // pending pour le KBIS (validation admin requise).
    const uploadBody: Record<string, string> = { document_type: type, file_key: presign.fileKey }
    if (type === 'decennale') {
      uploadBody.policy_number  = uploads.decennale.policyNumber
      uploadBody.expiration_date = uploads.decennale.expirationDate
    }
    const { error: insertErr } = await $fetch<{ error: string | null }>('/api/v1/pro/documents/upload', { method: 'POST', body: uploadBody })
    if (insertErr) throw new Error(insertErr)
    uploads[type].status = 'success'
    await loadProData() // refresh badges
  } catch (err: any) {
    uploads[type].status = 'error'
    const errorMsg = err.data?.message || err.message || 'Erreur.'
    // Différencier l'erreur pour aider au debug
    if (errorMsg === 'Failed to fetch') {
      uploads[type].error = 'Erreur réseau (CORS ou blocage navigateur) lors du transfert vers R2.'
    } else {
      uploads[type].error = errorMsg
    }
  }
}

const steps = computed(() => [
  { label: 'Compte créé',       done: true,                    desc: user.value?.email || '' },
  { label: 'Profil entreprise', done: !!pro.value?.company_name, desc: pro.value?.company_name ? 'Identité enregistrée' : 'Non renseigné',
    action: !pro.value?.company_name ? { label: 'Compléter mon profil', to: '/pro/claim' } : null },
  { label: 'Kbis envoyé',       done: !!kbis.value,            desc: kbis.value ? `Statut : ${docStatus(kbis.value).label}` : 'Document manquant' },
  { label: 'Décennale envoyée', done: !!decennale.value,        desc: decennale.value ? `Statut : ${docStatus(decennale.value).label}` : 'Document manquant' },
  { label: 'Abonnement Premium', done: activeZoneCount.value > 0,
    desc: activeZoneCount.value > 0 ? `${activeZoneCount.value} zone${activeZoneCount.value > 1 ? 's' : ''} active${activeZoneCount.value > 1 ? 's' : ''}.` : 'Débloquez tous les leads en illimité.',
    action: activeZoneCount.value === 0 ? { label: 'Devenir Premium', to: '/espace/premium' } : { label: 'Gérer mon abonnement', to: '/espace/premium' } },
  { label: 'Mon profil public', done: !!(pro.value?.bio || pro.value?.logo_url),
    desc: "Bio, logo, zone d'intervention",
    action: { label: 'Éditer mon profil', to: '/espace/profil' } },
])

const currentStepIndex = computed(() => {
  const idx = steps.value.findIndex(s => !s.done)
  return idx === -1 ? steps.value.length - 1 : idx
})

const docsComplete = computed(() => !!kbis.value && !!decennale.value)
</script>

<template>
  <div class="w-full max-w-[1440px] px-6 py-5 md:px-10 md:py-6">

    <!-- Loading -->
    <div v-if="loading" class="py-12 flex justify-center">
      <svg class="w-8 h-8 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>

    <!-- Main Dashboard -->
    <template v-else-if="pro">

      <div class="flex flex-col lg:grid lg:grid-cols-5 gap-6 items-start">

        <!-- COLONNE GAUCHE (Documents - 60%) -->
        <div class="lg:col-span-3 space-y-4 order-2 lg:order-1 w-full">
          <!-- Header -->
          <div class="mb-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-foreground/60">
              <span><span class="text-foreground/40">Dép.</span> <span class="font-mono font-medium text-foreground/80">{{ pro.postal_code }}</span></span>
              <template v-if="legalFormLabel(pro.siret_legal_form)">
                <span class="text-foreground/30">·</span>
                <span><span class="text-foreground/40">Forme</span> <span class="font-medium text-foreground/80">{{ legalFormLabel(pro.siret_legal_form) }}</span></span>
              </template>
              <template v-if="pro.siret_naf_code">
                <span class="text-foreground/30">·</span>
                <span><span class="text-foreground/40">NAF</span> <span class="font-mono font-medium text-foreground/80">{{ pro.siret_naf_code }}</span></span>
              </template>
              <NuxtLink
                v-if="activeZoneCount === 0"
                to="/espace/premium"
                class="cta-premium inline-flex items-center gap-2 h-9 px-4 text-white text-xs font-bold rounded-md ml-auto"
              >
                <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-1.012 1.09l1.242 5.385c.114.495-.417.882-.84.62l-4.757-2.937a.563.563 0 00-.594 0L5.973 21.085c-.423.262-.954-.125-.84-.62l1.242-5.385a.563.563 0 00-.182-.557L1.99 10.916c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                <span class="relative">Devenir Premium</span>
              </NuxtLink>
              <NuxtLink
                v-else
                to="/espace/premium"
                class="inline-flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-md ml-auto border border-slate-200 text-foreground/80 hover:bg-slate-50"
              >
                Gérer mon abonnement
              </NuxtLink>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <VerifiedBadge v-if="pro.is_verified && docsComplete" />
              <span
                v-else-if="pro.siret_status !== 'active' && decennale?.status !== 'approved'"
                class="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border border-amber-300 text-amber-700 bg-amber-50"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Vérification en cours
              </span>
              <BadgeEntrepriseVerifiee
                v-if="pro.siret_status"
                :pending="pro.siret_status !== 'active'"
              />
              <BadgeDecennaleCertifiee
                :pending="!decennale || decennale.status !== 'approved'"
              />
            </div>
            <div v-if="pro.categories && pro.categories.length > 0" class="flex flex-wrap gap-2 mt-3">
              <span
                v-for="cat in pro.categories"
                :key="cat"
                class="inline-flex items-center text-[13px] font-semibold px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 bg-white"
              >
                {{ CATEGORY_LABELS[cat] || cat }}
              </span>
            </div>
          </div>
          <!-- ─── Documents (toujours visible pour permettre le renouvellement) ───── -->
          <div class="bento-card rounded-sm p-6 border" :class="docsComplete ? 'border-slate-200 bg-white shadow-sm' : 'border-red-300 bg-red-50'">
            <div class="flex items-start gap-2 mb-3">
          <svg v-if="!docsComplete" class="w-4 h-4 text-red-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <div>
            <p class="text-sm font-semibold" :class="docsComplete ? 'text-foreground' : 'text-red-900'">Documents requis</p>
            <p v-if="!docsComplete" class="text-xs text-red-700 mt-0.5">Envoyez vos justificatifs pour valider votre profil et accéder aux leads (même gratuits).</p>
            <p v-else class="text-xs text-muted-foreground mt-0.5">Renouvelez-les en cas d'expiration ou de mise à jour.</p>
          </div>
        </div>

        <!-- KBIS -->
        <div v-if="!kbis" class="mb-3">
          <p class="text-xs font-semibold text-foreground mb-2">Extrait KBIS <span class="text-muted-foreground font-normal">(moins de 3 mois · PDF, JPG, PNG)</span></p>
          <div v-if="uploads.kbis.status !== 'success'" class="flex items-center gap-3 flex-wrap">
            <label class="cursor-pointer">
              <input type="file" @change="onFileSelect($event, 'kbis')" accept=".pdf,image/*" class="sr-only" />
              <span class="h-9 px-4 border border-border rounded-sm text-xs font-medium bg-white hover:bg-muted transition-colors flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                Choisir
              </span>
            </label>
            <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ uploads.kbis.file ? uploads.kbis.file.name : 'Aucun fichier' }}</span>
            <button
              v-if="uploads.kbis.file"
              @click="uploadDoc('kbis')"
              :disabled="uploads.kbis.status === 'uploading'"
              class="h-9 px-5 bg-safety text-white text-xs font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="uploads.kbis.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {{ uploads.kbis.status === 'uploading' ? 'Envoi…' : 'Envoyer le KBIS' }}
            </button>
          </div>
          <p v-if="uploads.kbis.status === 'error'" class="text-xs text-red-600 mt-1">{{ uploads.kbis.error }}</p>
          <p v-if="uploads.kbis.status === 'success'" class="text-xs text-foreground font-semibold mt-1">✓ KBIS envoyé</p>
        </div>
        <div v-else class="mb-4 text-xs text-foreground">
          <div class="flex items-center gap-2 flex-wrap">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <span class="font-semibold">KBIS</span>
            <span class="text-muted-foreground">—</span>
            <span :class="docStatus(kbis).cls" class="px-2 py-0.5 border rounded-full font-semibold">{{ docStatus(kbis).label }}</span>
            <span v-if="docFileName(kbis.file_key)" class="text-muted-foreground font-mono">· {{ docFileName(kbis.file_key) }}</span>
            <label class="cursor-pointer ml-auto">
              <input type="file" @change="onFileSelect($event, 'kbis'); uploadDoc('kbis')" accept=".pdf,image/*" class="sr-only" />
              <span class="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {{ uploads.kbis.status === 'uploading' ? 'Envoi...' : 'Modifier' }}
              </span>
            </label>
          </div>
          <p v-if="docPeriod(kbis)" class="mt-1 ml-6 text-sm text-foreground leading-snug">
            {{ docPeriod(kbis)!.prefix }}<span class="text-base font-bold">{{ docPeriod(kbis)!.date1 }}</span>{{ docPeriod(kbis)!.middle }}<span v-if="docPeriod(kbis)!.date2" class="text-base font-bold">{{ docPeriod(kbis)!.date2 }}</span>
          </p>
        </div>

        <!-- Décennale -->
        <div v-if="!decennale">
          <p class="text-xs font-semibold text-foreground mb-2">Attestation décennale <span class="text-muted-foreground font-normal">(PDF, JPG, PNG)</span></p>
          <div v-if="uploads.decennale.status !== 'success'" class="space-y-3">
            <!-- Champs obligatoires : numéro de police + date d'expiration -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-muted-foreground mb-1">Numéro de police <span class="text-red-500">*</span></label>
                <input
                  v-model="uploads.decennale.policyNumber"
                  type="text"
                  placeholder="Ex : 12345678A"
                  maxlength="50"
                  class="h-9 w-full px-3 border border-border rounded-sm text-xs bg-white focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <p class="text-[10px] text-muted-foreground mt-1">Numéro figurant sur votre attestation, tel quel (l'assureur fixe le format — pas de nombre de chiffres fixe).</p>
              </div>
              <div>
                <label class="block text-xs text-muted-foreground mb-1">Date d'expiration <span class="text-red-500">*</span></label>
                <input
                  v-model="uploads.decennale.expirationDate"
                  type="date"
                  class="h-9 w-full px-3 border border-border rounded-sm text-xs bg-white focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <label class="cursor-pointer">
                <input type="file" @change="onFileSelect($event, 'decennale')" accept=".pdf,image/*" class="sr-only" />
                <span class="h-9 px-4 border border-border rounded-sm text-xs font-medium bg-white hover:bg-muted transition-colors flex items-center gap-2">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                  Choisir
                </span>
              </label>
              <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ uploads.decennale.file ? uploads.decennale.file.name : 'Aucun fichier' }}</span>
              <button
                v-if="uploads.decennale.file"
                @click="uploadDoc('decennale')"
                :disabled="uploads.decennale.status === 'uploading' || !uploads.decennale.policyNumber || !uploads.decennale.expirationDate"
                class="h-9 px-5 bg-safety text-white text-xs font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform flex items-center gap-2 disabled:opacity-50"
              >
                <svg v-if="uploads.decennale.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {{ uploads.decennale.status === 'uploading' ? 'Envoi…' : 'Envoyer la décennale' }}
              </button>
            </div>
          </div>
          <p v-if="uploads.decennale.status === 'error'" class="text-xs text-red-600 mt-1">{{ uploads.decennale.error }}</p>
          <p v-if="uploads.decennale.status === 'success'" class="text-xs text-foreground font-semibold mt-1">✓ Décennale envoyée — badge décennale activé automatiquement</p>
        </div>
        <div v-else class="text-xs text-foreground">
          <div class="flex items-center gap-2 flex-wrap">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <span class="font-semibold">Décennale</span>
            <span class="text-muted-foreground">—</span>
            <span :class="docStatus(decennale).cls" class="px-2 py-0.5 border rounded-full font-semibold">{{ docStatus(decennale).label }}</span>
            <span v-if="docFileName(decennale.file_key)" class="text-muted-foreground font-mono">· {{ docFileName(decennale.file_key) }}</span>
            <label class="cursor-pointer ml-auto">
              <input type="file" @change="onFileSelect($event, 'decennale'); uploadDoc('decennale')" accept=".pdf,image/*" class="sr-only" />
              <span class="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {{ uploads.decennale.status === 'uploading' ? 'Envoi...' : 'Modifier' }}
              </span>
            </label>
          </div>
          <p v-if="docPeriod(decennale)" class="mt-1 ml-6 text-sm text-foreground leading-snug">
            {{ docPeriod(decennale)!.prefix }}<span class="text-base font-bold">{{ docPeriod(decennale)!.date1 }}</span>{{ docPeriod(decennale)!.middle }}<span v-if="docPeriod(decennale)!.date2" class="text-base font-bold">{{ docPeriod(decennale)!.date2 }}</span>
          </p>
        </div>

        <!-- Responsabilité -->
        <div class="mt-3 pt-3 border-t border-border/50 bg-yellow-100">
          <p class="text-xs text-muted-foreground leading-relaxed">
            <span class="font-semibold">⚠️ Responsabilité :</span> Vous garantissez l'authenticité et la validité des documents envoyés. Toute fausse déclaration ou document falsifié peut entraîner la fermeture de votre compte et des poursuites légales. BÂTI-AXE décline toute responsabilité en cas de fraude documentaire.
          </p>
        </div>
      </div>

        <!-- ─── Capacité sous-traitance (05.11-02) ───── -->
        <div class="bento-card rounded-sm p-6 border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between gap-3 mb-1">
            <div>
              <p class="text-sm font-semibold text-foreground">Capacité sous-traitance</p>
              <p class="text-xs text-muted-foreground mt-0.5">Pré-qualification pour les dossiers B2B (apporteurs d'affaires, majors).</p>
            </div>
            <button
              type="button"
              @click="capacity.available = !capacity.available"
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-safety/50"
              :class="capacity.available ? 'bg-safety' : 'bg-slate-300'"
              role="switch"
              :aria-checked="capacity.available"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="capacity.available ? 'translate-x-6' : 'translate-x-1'" />
            </button>
          </div>
          <label class="block text-xs font-medium text-foreground mt-4 mb-1.5">Effectif mobilisable <span class="text-muted-foreground font-normal">(1 à 999)</span></label>
          <div class="flex items-center gap-3">
            <input
              v-model="capacity.workforce"
              type="number"
              min="1"
              max="999"
              inputmode="numeric"
              maxlength="3"
              placeholder="Ex. 12"
              class="w-28 h-10 px-3 text-sm rounded-sm border border-slate-300 bg-white text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-safety"
            />
            <button
              @click="saveCapacity"
              :disabled="capacity.saving"
              class="inline-flex items-center h-10 px-4 text-sm font-semibold rounded-sm bg-safety text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <svg v-if="capacity.saving" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Enregistrer
            </button>
          </div>
          <p class="text-[11px] text-muted-foreground mt-2">La capacité est automatiquement désactivée si un document légal (KBIS, URSSAF, décennale) expire.</p>
        </div>

        <!-- ─── Alertes email nouveaux leads (P4) ───── -->
        <div class="bento-card rounded-sm p-6 border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-foreground">Alertes par email</p>
              <p class="text-xs text-muted-foreground mt-0.5">Recevez un email dès qu'un nouveau lead correspond à vos catégories.</p>
            </div>
            <button
              type="button"
              @click="leadAlerts.enabled = !leadAlerts.enabled"
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-safety/50"
              :class="leadAlerts.enabled ? 'bg-safety' : 'bg-slate-300'"
              role="switch"
              :aria-checked="leadAlerts.enabled"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="leadAlerts.enabled ? 'translate-x-6' : 'translate-x-1'" />
            </button>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3">L'alerte vous prévient qu'un lead est disponible — elle ne débloque pas les coordonnées. L'accès suit la règle habituelle : Premium, 3 leads gratuits (documents déposés) ou 48 h.</p>
          <button
            @click="saveLeadAlerts"
            :disabled="leadAlerts.saving"
            class="mt-4 inline-flex items-center h-10 px-4 text-sm font-semibold rounded-sm bg-safety text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <svg v-if="leadAlerts.saving" class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Enregistrer
          </button>
        </div>
        </div>

        <!-- COLONNE DROITE (Checklist - 40%) -->
        <div class="lg:col-span-2 order-1 lg:order-2 w-full lg:sticky lg:top-6">
          <!-- Progress checklist -->
          <div class="bento-card border border-slate-200 rounded-sm overflow-hidden bg-white shadow-sm">
            <div v-for="(step, i) in steps" :key="i" class="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-50 transition-all duration-300 relative group">
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            :class="step.done ? 'bg-foreground text-background' : i === currentStepIndex ? 'border-2 border-foreground' : 'border border-border'"
          >
            <svg v-if="step.done" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <NuxtLink v-if="step.action" :to="step.action.to"
              class="text-sm font-semibold text-foreground hover:opacity-70 transition-opacity">
              {{ step.label }}
            </NuxtLink>
            <p v-else class="text-sm font-semibold text-foreground">{{ step.label }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ step.desc }}</p>
            <NuxtLink
              v-if="step.action"
              :to="step.action.to"
              class="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              {{ step.action.label }}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>
        </div>

      </div>

    </template>

    <!-- Fallback if pro is null and redirect fails -->
    <div v-else class="py-16 text-center space-y-4">
      <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <h2 class="text-xl font-semibold text-foreground">Profil professionnel introuvable</h2>
      <p class="text-sm text-muted-foreground max-w-md mx-auto">
        Votre compte existe, mais les données de votre entreprise n'ont pas pu être chargées.
      </p>
      <NuxtLink to="/pro/claim" class="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full bg-safety text-white font-semibold text-sm hover:scale-105 shadow-safety/20 transition-transform">
        Créer ou vérifier mon profil
      </NuxtLink>
    </div>

  </div>
</template>

<style scoped>
/* CTA premium : dégradé profond + relief + balayage lumineux au survol
   (distinct du shimmer continu de VerifiedBadge, réservé à une action). */
.cta-premium {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(135deg, #1E293B 0%, #0F172A 60%, #1a1a2e 100%);
  box-shadow:
    0 6px 20px -4px rgba(15, 23, 42, 0.55),
    0 2px 6px -1px rgba(15, 23, 42, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.cta-premium::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%);
  background-size: 220% 100%;
  background-position: 150% 0;
  transition: background-position 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.cta-premium:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 8px 28px -4px rgba(15, 23, 42, 0.65),
    0 3px 8px -1px rgba(15, 23, 42, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.cta-premium:hover::before {
  background-position: -50% 0;
}

@media (prefers-reduced-motion: reduce) {
  .cta-premium {
    transition: box-shadow 0.2s ease;
  }
  .cta-premium:hover {
    transform: none;
  }
  .cta-premium::before {
    transition: none;
  }
}
</style>
