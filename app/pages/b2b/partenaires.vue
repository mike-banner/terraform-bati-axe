<script setup lang="ts">
import { APPORTEUR_LABELS, BUDGET_OPTIONS, TRAVAUX_OPTIONS, LOT_CATEGORY_OPTIONS } from '~/types/b2b'
import type { B2bApporteurType, B2bNeedType, B2bBudgetRange, B2bRequestFile, B2bTravauxSuggere, B2bLotCategory } from '~/types/b2b'

useHead({ title: 'Espace Partenaires — BÂTI-AXE' })

definePageMeta({ layout: 'default' })

// ─── State ────────────────────────────────────────────────────────────────────
const step = ref(1)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const submittedId = ref('')

// Form data
const apporteurType = ref<B2bApporteurType | ''>('')
const needType = ref<B2bNeedType | ''>('')
const projectLocation = ref('78 — Yvelines')
const budgetRange = ref<B2bBudgetRange | ''>('')
const certificationNumber = ref('')
const travauxSuggeres = ref<B2bTravauxSuggere[]>([])
const isDiagnostiqueur = computed(() => apporteurType.value === 'diagnostiqueur')
function toggleTravail(t: B2bTravauxSuggere) {
  const idx = travauxSuggeres.value.indexOf(t)
  if (idx === -1) travauxSuggeres.value.push(t)
  else travauxSuggeres.value.splice(idx, 1)
}
const description = ref('')
const lotsCategories = ref<B2bLotCategory[]>([])
const isSyndic = computed(() => apporteurType.value === 'syndic')
function toggleLot(c: B2bLotCategory) {
  const idx = lotsCategories.value.indexOf(c)
  if (idx === -1) lotsCategories.value.push(c)
  else lotsCategories.value.splice(idx, 1)
}
const uploadedFiles = ref<B2bRequestFile[]>([])
const uploading = ref(false)
const uploadError = ref<string | null>(null)

const contactName = ref('')
const contactCompany = ref('')
const contactPhone = ref('')
const contactEmail = ref('')
const consentAccepted = ref(false)

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalSteps = computed(() => needType.value === 'partenariat_regulier' ? 3 : 4)

const canNextStep = computed(() => {
  switch (step.value) {
    case 1: return !!apporteurType.value
    case 2: return !!needType.value
    case 3: return description.value.trim().length >= 20
    case 4: return contactName.value.length >= 2 && contactPhone.value.length >= 8 && contactEmail.value.includes('@') && consentAccepted.value
    default: return false
  }
})

const apporteurTypes = Object.entries(APPORTEUR_LABELS) as [string, typeof APPORTEUR_LABELS[B2bApporteurType]][]

// ─── Steps ────────────────────────────────────────────────────────────────────
function nextStep() {
  if (step.value === 2 && needType.value === 'partenariat_regulier') {
    step.value = 4 // Skip file upload
  } else if (step.value < totalSteps.value) {
    step.value++
  }
}

function prevStep() {
  if (step.value === 4 && needType.value === 'partenariat_regulier') {
    step.value = 2
  } else if (step.value > 1) {
    step.value--
  }
}

// ─── File upload ──────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['pdf', 'dwg', 'dxf', 'png', 'jpg', 'jpeg', 'zip', 'docx']
const MAX_SIZE = 50 * 1024 * 1024

async function handleFileDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (!files) return
  await processFiles(files)
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) await processFiles(input.files)
}

async function processFiles(fileList: FileList) {
  uploadError.value = null

  for (const file of Array.from(fileList)) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      uploadError.value = `Format non autorisé : .${ext}`
      continue
    }
    if (file.size > MAX_SIZE) {
      uploadError.value = `${file.name} dépasse 50 Mo`
      continue
    }
    if (uploadedFiles.value.length >= 10) {
      uploadError.value = 'Maximum 10 fichiers'
      break
    }

    uploading.value = true
    try {
      // Get presigned URL
      const presign = await $fetch<{ status: string; signedUrl: string; fileKey: string }>('/api/v1/b2b/presign', {
        method: 'POST',
        body: {
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        },
      })

      if (presign.status !== 'SUCCESS') throw new Error('Erreur de signature')

      // Upload to R2
      const res = await fetch(presign.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!res.ok) throw new Error('Échec du transfert')

      uploadedFiles.value.push({
        file_key: presign.fileKey,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size: file.size,
      })
    } catch (err: any) {
      uploadError.value = err.message || 'Erreur lors de l\'upload'
    } finally {
      uploading.value = false
    }
  }
}

function removeFile(index: number) {
  uploadedFiles.value.splice(index, 1)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1048576).toFixed(1)} Mo`
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function submitRequest() {
  if (!canNextStep.value || isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = null

  try {
    const result = await $fetch<{ status: string; id: string }>('/api/v1/b2b/requests', {
      method: 'POST',
      body: {
        apporteur_type: apporteurType.value,
        need_type: needType.value,
        project_location: projectLocation.value || null,
        description: description.value.trim() || null,
        lots_categories: lotsCategories.value.length ? lotsCategories.value : null,
        budget_range: budgetRange.value || null,
        certification_number: isDiagnostiqueur.value ? (certificationNumber.value || null) : null,
        travaux_suggeres: isDiagnostiqueur.value && travauxSuggeres.value.length > 0 ? travauxSuggeres.value : null,
        files: uploadedFiles.value,
        contact_name: contactName.value,
        contact_company: contactCompany.value || null,
        contact_phone: contactPhone.value,
        contact_email: contactEmail.value,
        consent_accepted: true,
      },
    })

    submittedId.value = result.id?.slice(0, 8).toUpperCase() || ''
    submitSuccess.value = true
    step.value = 5 // Thank you
  } catch (err: any) {
    submitError.value = err.data?.statusMessage || err.message || 'Erreur lors de l\'envoi.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- ═══ TUNNEL ═══ -->
    <div class="max-w-2xl mx-auto px-6 pt-10">
      <NuxtLink to="/partenaires" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 -my-2">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour à la page Partenaires
      </NuxtLink>
    </div>
    <div v-if="!submitSuccess" class="max-w-2xl mx-auto px-6 py-12">
      <!-- Progress bar -->
      <div class="flex items-center gap-2 mb-8">
        <template v-for="s in totalSteps" :key="s">
          <div
            class="h-1.5 flex-1 rounded-full transition-colors"
            :class="s <= step ? 'bg-copper' : 'bg-muted'"
          />
        </template>
        <span class="text-xs text-muted-foreground ml-2">Étape {{ step }}/{{ totalSteps }}</span>
      </div>

      <!-- Error -->
      <div v-if="submitError" class="mb-6 p-3 border border-destructive/30 bg-destructive/10 rounded-sm text-sm text-destructive">
        {{ submitError }}
      </div>

      <!-- ─── Étape 1: Profil apporteur ─── -->
      <div v-if="step === 1">
        <h2 class="text-xl font-bold text-foreground mb-2">Vous êtes :</h2>
        <p class="text-sm text-muted-foreground mb-6">Sélectionnez votre profil professionnel.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">            <button
            v-for="([key, data], idx) in apporteurTypes"
            :key="idx"
            @click="apporteurType = key as B2bApporteurType"
            class="flex items-start gap-3 p-4 rounded-sm border text-left transition-all"
            :class="apporteurType === key
              ? 'border-copper bg-copper/5 ring-1 ring-copper/20'
              : 'border-border bg-card hover:border-muted-foreground/30'"
          >
            <span class="text-xl mt-0.5">{{ data.icon }}</span>
            <div>
              <p class="text-sm font-semibold text-foreground">{{ data.label }}</p>
              <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">{{ data.promise }}</p>
            </div>
          </button>
        </div>
      </div>

      <!-- ─── Étape 2: Nature du besoin ─── -->
      <div v-if="step === 2">
        <h2 class="text-xl font-bold text-foreground mb-2">Quel est votre besoin actuel ?</h2>
        <p class="text-sm text-muted-foreground mb-6">Cela nous permettra de traiter votre demande rapidement.</p>

        <div class="space-y-3">
          <button
            @click="needType = 'projet_immediat'"
            class="w-full flex items-center gap-4 p-5 rounded-sm border text-left transition-all"
            :class="needType === 'projet_immediat'
              ? 'border-copper bg-copper/5 ring-1 ring-copper/20'
              : 'border-border bg-card hover:border-muted-foreground/30'"
          >
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" :class="needType === 'projet_immediat' ? 'border-copper' : 'border-border'">
              <div v-if="needType === 'projet_immediat'" class="w-2.5 h-2.5 rounded-full bg-copper" />
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">J'ai un projet / chantier immédiat à faire chiffrer</p>
              <p class="text-xs text-muted-foreground mt-0.5">Déposez votre dossier technique, nous vous recontactons sous 4h.</p>
            </div>
          </button>

          <button
            @click="needType = 'partenariat_regulier'"
            class="w-full flex items-center gap-4 p-5 rounded-sm border text-left transition-all"
            :class="needType === 'partenariat_regulier'
              ? 'border-copper bg-copper/5 ring-1 ring-copper/20'
              : 'border-border bg-card hover:border-muted-foreground/30'"
          >
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" :class="needType === 'partenariat_regulier' ? 'border-copper' : 'border-border'">
              <div v-if="needType === 'partenariat_regulier'" class="w-2.5 h-2.5 rounded-full bg-copper" />
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">Je souhaite établir un partenariat régulier</p>
              <p class="text-xs text-muted-foreground mt-0.5">Pour mes futurs dossiers, accédez à notre réseau d'artisans vérifiés.</p>
            </div>
          </button>
        </div>
      </div>

      <!-- ─── Étape 3: Dépôt du dossier (si projet immédiat) ─── -->
      <div v-if="step === 3">
        <h2 class="text-xl font-bold text-foreground mb-2">Décrivez votre projet</h2>
        <p class="text-sm text-muted-foreground mb-6">Déposez vos plans, CCTP ou compromis de vente.</p>

        <!-- Location -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-foreground mb-1.5">Adresse ou département du projet</label>
          <input
            v-model="projectLocation"
            type="text"
            placeholder="Ex : 78 — Yvelines / 75 — Paris"
            class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <!-- Description obligatoire (TEND-01) -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-foreground mb-1.5">Décrivez votre besoin *</label>
          <textarea
            v-model="description"
            rows="4"
            maxlength="5000"
            placeholder="Ex : Ravalement de façade + réfection toiture sur bâtiment collectif, 1200 m², parties communes uniquement."
            class="w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <p v-if="description.trim().length > 0 && description.trim().length < 20" class="mt-1 text-xs text-destructive">
            Description trop courte (20 caractères minimum, {{ description.trim().length }} actuellement).
          </p>
          <p v-else-if="description.trim().length === 0" class="mt-1 text-xs text-muted-foreground">
            20 caractères minimum — plus l'artisan comprend l'ampleur du chantier, plus vite il vous répond.
          </p>
        </div>

        <!-- Sélecteur multi-lots (syndic uniquement, TEND-05) -->
        <div v-if="isSyndic" class="mb-4">
          <label class="block text-sm font-medium text-foreground mb-1.5">Corps de métier concernés (parties communes)</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in LOT_CATEGORY_OPTIONS"
              :key="opt.value"
              type="button"
              @click="toggleLot(opt.value)"
              class="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
              :class="lotsCategories.includes(opt.value)
                ? 'border-copper bg-copper/10 text-copper'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="mt-1.5 text-xs text-muted-foreground">
            Sélectionnez tous les corps de métier nécessaires — chacun sera traité comme un lot indépendant.
          </p>
        </div>

        <!-- Diagnostiqueur : n° certification + types de travaux suggérés -->
        <template v-if="isDiagnostiqueur">
          <div class="mb-4">
            <label class="block text-sm font-medium text-foreground mb-1.5">Numéro de certification</label>
            <input
              v-model="certificationNumber"
              type="text"
              maxlength="50"
              placeholder="Ex : CERT-2024-XXXX"
              class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-foreground mb-1.5">Travaux suggérés par votre rapport DPE</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in TRAVAUX_OPTIONS"
                :key="opt.value"
                type="button"
                @click="toggleTravail(opt.value)"
                class="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
                :class="travauxSuggeres.includes(opt.value)
                  ? 'border-copper bg-copper/10 text-copper'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </template>

        <!-- Budget -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-foreground mb-1.5">Budget estimé des travaux</label>
          <select
            v-model="budgetRange"
            class="h-10 px-3 pr-8 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="">Sélectionner un budget</option>
            <option v-for="opt in BUDGET_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Drop zone -->
        <div
          @dragover.prevent
          @drop.prevent="handleFileDrop"
          class="border-2 border-dashed border-border rounded-sm p-8 text-center hover:border-copper/40 transition-colors cursor-pointer"
        >
          <svg class="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
          <p class="text-sm font-medium text-foreground">Glissez vos fichiers ici</p>
          <p class="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
          <p class="text-xs text-muted-foreground mt-2">PDF, DWG, DXF, PNG, JPG, ZIP, DOCX — max 50 Mo/fichier</p>
          <input type="file" multiple @change="handleFileSelect" accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.zip,.docx" class="sr-only" />
        </div>

        <!-- Upload status -->
        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Upload en cours...
        </div>
        <p v-if="uploadError" class="mt-2 text-xs text-destructive">{{ uploadError }}</p>

        <!-- Uploaded files list -->
        <div v-if="uploadedFiles.length > 0" class="mt-4 space-y-2">
          <div
            v-for="(file, idx) in uploadedFiles"
            :key="idx"
            class="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-sm"
          >
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
              <span class="text-xs text-foreground truncate">{{ file.filename }}</span>
              <span class="text-[10px] text-muted-foreground">{{ formatFileSize(file.size) }}</span>
            </div>
            <button @click="removeFile(idx)" class="text-muted-foreground hover:text-destructive transition-colors ml-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Étape 4: Coordonnées ─── -->
      <div v-if="step === 4">
        <h2 class="text-xl font-bold text-foreground mb-2">Vos coordonnées</h2>
        <p class="text-sm text-muted-foreground mb-6">Un chargé d'affaires vous recontacte sous 4 heures ouvrées.</p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Nom & Prénom *</label>
            <input v-model="contactName" type="text" required class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Jean Dupont" />
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Nom du cabinet / de la structure</label>
            <input v-model="contactCompany" type="text" class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Cabinet Dupont Architecture" />
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Téléphone direct *</label>
            <input v-model="contactPhone" type="tel" required class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Adresse e-mail professionnelle *</label>
            <input v-model="contactEmail" type="email" required class="h-10 w-full px-3 border border-border rounded-sm text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="jean@cabinet-dupont.fr" />
          </div>

          <!-- GDPR consent -->
          <label class="flex items-start gap-3 cursor-pointer pt-2">
            <input v-model="consentAccepted" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-copper focus:ring-copper" />
            <span class="text-xs text-muted-foreground leading-relaxed">
              J'accepte d'être recontacté dans le cadre de ma demande. Mes données sont traitées conformément à la <NuxtLink to="/legal/confidentialite" class="underline hover:text-foreground">politique de confidentialité</NuxtLink>.
            </span>
          </label>
        </div>
      </div>

      <!-- ─── Navigation ─── -->
      <div class="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <button
          v-if="step > 1"
          @click="prevStep"
          class="h-11 px-4 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-full hover:bg-muted transition-colors"
        >
          ← Retour
        </button>
        <div v-else />

        <button
          v-if="step < totalSteps"
          @click="nextStep"
          :disabled="!canNextStep"
          class="h-11 px-6 text-sm font-semibold bg-copper text-white rounded-full hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-copper/20"
        >
          Continuer
        </button>
        <button
          v-else
          @click="submitRequest"
          :disabled="!canNextStep || isSubmitting"
          class="h-11 px-6 text-sm font-semibold bg-copper text-white rounded-full hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-copper/20 flex items-center gap-2"
        >
          <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Envoyer le dossier — Rappel garanti sous 4h
        </button>
      </div>
    </div>

    <!-- ═══ THANK YOU ═══ -->
    <div v-if="submitSuccess" class="max-w-lg mx-auto px-6 py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h2 class="text-2xl font-bold text-foreground mb-3">Dossier transmis à notre pôle Pro.</h2>
      <p class="text-sm text-muted-foreground leading-relaxed">
        Un chargé d'affaires dédié analyse vos pièces. Vous serez recontacté <strong class="text-foreground">sous 4 heures ouvrées</strong>.
      </p>
      <p v-if="submittedId" class="text-xs text-muted-foreground mt-4">
        Référence : <span class="font-mono text-foreground">{{ submittedId }}</span>
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 mt-8 h-10 px-6 text-sm font-medium border border-border rounded-full hover:bg-muted transition-colors text-foreground"
      >
        Retour à l'accueil
      </NuxtLink>
    </div>
  </div>
</template>
