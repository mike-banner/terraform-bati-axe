<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Lock, 
  ArrowRight,
  Sparkles
} from 'lucide-vue-next'

useHead({
  title: 'Espace Artisan — Rejoindre BÂTI-AXE',
  meta: [
    { name: 'description', content: 'Inscrivez-vous, revendiquez votre entreprise et qualifiez vos assurances décennales.' }
  ]
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

// Navigation & Tab State
const authMode = ref<'register' | 'login'>('register')
const activeStep = ref(1) // 1: Auth, 2: Info Entreprise, 3: Documents, 4: Succès

// Form fields
const authForm = reactive({
  email: '',
  password: '',
  full_name: ''
})

const proForm = reactive({
  company_name: '',
  siret: '',
  full_name: '',
  phone: '',
  postal_code: '',
  sms_opt_in: false,
  cgu_accepted: false
})

// Extract prospect_id from query params
const prospectId = computed(() => route.query.prospect_id as string || '')

// Fetch prospect details if prospect_id is present
onMounted(async () => {
  if (prospectId.value) {
    try {
      const { data, error } = await useFetch(`/api/v1/prospects/${prospectId.value}`)
      if (error.value) {
        console.error('Failed to pre-fill prospect details:', error.value)
        return
      }
      if (data.value && data.value.status === 'SUCCESS') {
        proForm.company_name = data.value.company_name || ''
        proForm.siret = data.value.siret || ''
        proForm.postal_code = data.value.postal_code || ''
      }
    } catch (err) {
      console.error('Error fetching prospect info:', err)
    }
  }
})

// Upload states
const files = reactive({
  kbis: null as File | null,
  decennale: null as File | null
})

const uploads = reactive({
  kbis: { progress: 0, status: 'idle' as 'idle' | 'uploading' | 'success' | 'error', error: '' },
  decennale: { progress: 0, status: 'idle' as 'idle' | 'uploading' | 'success' | 'error', error: '' }
})

// General feedback
const errorMessage = ref<string | null>(null)
const isLoading = ref(false)
const claimSlug = ref('')

// Compute validation
const isAuthValid = computed(() => {
  if (authMode.value === 'login') {
    return authForm.email.includes('@') && authForm.password.length >= 6
  }
  return authForm.email.includes('@') && authForm.password.length >= 6 && authForm.full_name.trim().length >= 2
})

const isProFormValid = computed(() => {
  return (
    proForm.company_name.trim().length >= 2 &&
    /^\d{14}$/.test(proForm.siret) &&
    proForm.full_name.trim().length >= 2 &&
    /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/.test(proForm.phone) &&
    /^\d{5}$/.test(proForm.postal_code) &&
    proForm.cgu_accepted
  )
})

// Actions
const handleAuth = async () => {
  isLoading.value = true
  errorMessage.value = null
  
  try {
    if (authMode.value === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password
      })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            full_name: authForm.full_name
          }
        }
      })
      if (error) throw error
    }
    
    // Auto-fill manager name if registered
    if (authForm.full_name) {
      proForm.full_name = authForm.full_name
    }
    
    // Check if professional record already exists for this user
    if (user.value) {
      const { data: existingPro } = await supabase
        .from('professionals')
        .select('id, canonical_slug')
        .eq('id', user.value.id)
        .maybeSingle()

      if (existingPro) {
        claimSlug.value = existingPro.canonical_slug
        activeStep.value = 3 // Go directly to document upload if already registered
      } else {
        activeStep.value = 2 // Fill company info
      }
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Une erreur d\'authentification est survenue.'
  } finally {
    isLoading.value = false
  }
}

const handleRegisterCompany = async () => {
  if (!isProFormValid.value) return
  isLoading.value = true
  errorMessage.value = null

  try {
    const { data, error } = await useFetch('/api/v1/pro/claim', {
      method: 'POST',
      body: {
        prospect_id: prospectId.value || undefined,
        company_name: proForm.company_name,
        siret: proForm.siret,
        full_name: proForm.full_name,
        phone: proForm.phone,
        postal_code: proForm.postal_code,
        sms_opt_in: proForm.sms_opt_in
      }
    })

    if (error.value) {
      throw new Error(error.value.data?.statusMessage || 'Impossible d\'enregistrer votre entreprise.')
    }

    if (data.value && data.value.status === 'SUCCESS') {
      claimSlug.value = data.value.slug
      activeStep.value = 3 // Go to document uploads
    }
  } catch (err: any) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = (event: Event, type: 'kbis' | 'decennale') => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    files[type] = target.files[0]
    uploads[type].status = 'idle'
    uploads[type].error = ''
  }
}

const uploadDocument = async (type: 'kbis' | 'decennale') => {
  const file = files[type]
  if (!file) return

  uploads[type].status = 'uploading'
  uploads[type].progress = 10
  
  try {
    // 1. Get presigned upload URL from Nitro API
    const { data: presignData, error: presignError } = await useFetch('/api/v1/pro/documents/presign', {
      method: 'POST',
      body: {
        document_type: type,
        filename: file.name
      }
    })

    if (presignError.value || !presignData.value || presignData.value.status !== 'SUCCESS') {
      throw new Error(presignError.value?.data?.statusMessage || 'Erreur lors de la génération de la signature.')
    }

    const { signedUrl, path } = presignData.value
    uploads[type].progress = 50

    // 2. PUT directly to signed URL
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    })

    if (!uploadRes.ok) {
      throw new Error('Échec du transfert vers le serveur de stockage.')
    }
    
    uploads[type].progress = 80

    // 3. Log pending verification in database using Supabase Client
    const { error: dbError } = await supabase
      .from('verifications')
      .insert({
        pro_id: user.value?.id,
        document_type: type,
        file_key: path,
        status: 'pending'
      })

    if (dbError) {
      console.error('Error inserting verification row:', dbError)
    }

    uploads[type].progress = 100
    uploads[type].status = 'success'
  } catch (err: any) {
    uploads[type].status = 'error'
    uploads[type].error = err.message || 'Erreur de transfert'
  }
}

const finishOnboarding = () => {
  activeStep.value = 4
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Glow BG -->
    <div class="absolute top-1/4 left-1/3 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
      <NuxtLink to="/" class="text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 inline-flex items-center gap-1.5">
        <Sparkles class="w-3.5 h-3.5" /> BÂTI-AXE Pro
      </NuxtLink>
      <h2 class="text-3xl font-extrabold text-white tracking-tight">Espace Professionnels</h2>
      
      <!-- Steps Indicator -->
      <div class="flex items-center justify-center gap-4 text-xs font-semibold text-zinc-500 pt-2" v-if="activeStep < 4">
        <span :class="activeStep >= 1 ? 'text-indigo-400' : ''">1. Connexion</span>
        <span class="w-4 h-px bg-zinc-800"></span>
        <span :class="activeStep >= 2 ? 'text-indigo-400' : ''">2. Profil</span>
        <span class="w-4 h-px bg-zinc-800"></span>
        <span :class="activeStep >= 3 ? 'text-indigo-400' : ''">3. Validation</span>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div class="bg-zinc-900/60 backdrop-blur-md py-8 px-4 border border-zinc-800/80 shadow-2xl rounded-2xl sm:px-10">
        
        <!-- Step 1: Authentication -->
        <div v-if="activeStep === 1" class="space-y-6">
          <div class="flex justify-center border-b border-zinc-800 pb-4">
            <button 
              @click="authMode = 'register'"
              class="flex-1 text-center py-2 text-sm font-semibold transition-colors"
              :class="authMode === 'register' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-400 hover:text-white'"
            >
              Créer un compte
            </button>
            <button 
              @click="authMode = 'login'"
              class="flex-1 text-center py-2 text-sm font-semibold transition-colors"
              :class="authMode === 'login' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-400 hover:text-white'"
            >
              Se connecter
            </button>
          </div>

          <form @submit.prevent="handleAuth" class="space-y-4">
            <div v-if="authMode === 'register'">
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nom Complet du Gérant</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500"><User class="w-4 h-4" /></span>
                <input 
                  type="text" 
                  v-model="authForm.full_name" 
                  placeholder="Jean Dupont"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Adresse E-mail Professionnelle</label>
              <input 
                type="email" 
                v-model="authForm.email" 
                placeholder="contact@dupont-plomberie.fr"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mot de passe</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500"><Lock class="w-4 h-4" /></span>
                <input 
                  type="password" 
                  v-model="authForm.password" 
                  placeholder="••••••••"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="p-3 bg-red-950/40 border border-red-900 rounded-xl text-red-300 text-xs flex gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <button 
              type="submit" 
              class="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
              :disabled="isLoading || !isAuthValid"
            >
              <Loader2 class="w-4 h-4 animate-spin" v-if="isLoading" />
              <span>{{ authMode === 'register' ? 'S\'enregistrer' : 'Connexion' }}</span>
            </button>
          </form>
        </div>

        <!-- Step 2: Company Claim / Registration -->
        <div v-if="activeStep === 2" class="space-y-6">
          <div class="text-center">
            <h3 class="text-lg font-bold text-white">Profil de l'entreprise</h3>
            <p class="text-xs text-zinc-400 mt-1">Fournissez les détails officiels pour revendiquer ou créer votre profil.</p>
          </div>

          <form @submit.prevent="handleRegisterCompany" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nom de l'entreprise (Raison Sociale)</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500"><Building2 class="w-4 h-4" /></span>
                <input 
                  type="text" 
                  v-model="proForm.company_name" 
                  placeholder="DUPONT PLOMBERIE"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Numéro SIRET (14 chiffres)</label>
              <input 
                type="text" 
                v-model="proForm.siret" 
                placeholder="12345678900012"
                maxlength="14"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nom Complet du Gérant</label>
              <input 
                type="text" 
                v-model="proForm.full_name" 
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Téléphone</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500"><Phone class="w-4 h-4" /></span>
                  <input 
                    type="tel" 
                    v-model="proForm.phone" 
                    placeholder="0611223344"
                    class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Code Postal</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500"><MapPin class="w-4 h-4" /></span>
                  <input 
                    type="text" 
                    v-model="proForm.postal_code" 
                    placeholder="78955"
                    maxlength="5"
                    class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <!-- Consent box -->
            <div class="space-y-3 border-t border-zinc-800 pt-4">
              <label class="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" v-model="proForm.cgu_accepted" class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600" />
                <span class="text-xs text-zinc-400">J'accepte les conditions générales de vente et d'utilisation Pro de BÂTI-AXE. *</span>
              </label>

              <label class="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" v-model="proForm.sms_opt_in" class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600" />
                <span class="text-xs text-zinc-400">J'accepte d'être alerté instantanément par SMS lors du dépôt d'un nouveau projet éligible dans ma zone.</span>
              </label>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="p-3 bg-red-950/40 border border-red-900 rounded-xl text-red-300 text-xs flex gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <button 
              type="submit" 
              class="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
              :disabled="isLoading || !isProFormValid"
            >
              <Loader2 class="w-4 h-4 animate-spin" v-if="isLoading" />
              <span>Valider mon profil</span>
            </button>
          </form>
        </div>

        <!-- Step 3: Document Uploads -->
        <div v-if="activeStep === 3" class="space-y-6">
          <div class="text-center">
            <h3 class="text-lg font-bold text-white">Vérification de compte</h3>
            <p class="text-xs text-zinc-400 mt-1">Téléversez vos justificatifs pour activer l'affichage public et accéder aux leads.</p>
          </div>

          <div class="space-y-6">
            <!-- KBIS Upload Box -->
            <div class="p-4 rounded-xl border bg-zinc-950/40" :class="uploads.kbis.status === 'success' ? 'border-emerald-500/50' : 'border-zinc-800'">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <FileText class="w-5 h-5 text-indigo-400" />
                  <span class="font-semibold text-sm">Extrait KBIS (Moins de 3 mois)</span>
                </div>
                <span class="text-[10px] uppercase font-bold text-zinc-500">PDF, JPG, PNG</span>
              </div>
              <div v-if="uploads.kbis.status !== 'success'" class="space-y-3">
                <input type="file" @change="handleFileSelect($event, 'kbis')" accept=".pdf,image/*" class="w-full text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                <button v-if="files.kbis" @click="uploadDocument('kbis')" class="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2" :disabled="uploads.kbis.status === 'uploading'">
                  <Loader2 class="w-3.5 h-3.5 animate-spin" v-if="uploads.kbis.status === 'uploading'" />
                  <UploadCloud class="w-3.5 h-3.5" v-else />
                  Téléverser le KBIS
                </button>
              </div>
              <div v-else class="text-xs text-emerald-400 flex items-center gap-1.5 py-1">
                <CheckCircle class="w-4 h-4" /> Justificatif KBIS envoyé avec succès.
              </div>
            </div>

            <!-- Decennale Upload Box -->
            <div class="p-4 rounded-xl border bg-zinc-950/40" :class="uploads.decennale.status === 'success' ? 'border-emerald-500/50' : 'border-zinc-800'">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <FileText class="w-5 h-5 text-indigo-400" />
                  <span class="font-semibold text-sm">Attestation Assurance Décennale</span>
                </div>
                <span class="text-[10px] uppercase font-bold text-zinc-500">PDF, JPG, PNG</span>
              </div>
              <div v-if="uploads.decennale.status !== 'success'" class="space-y-3">
                <input type="file" @change="handleFileSelect($event, 'decennale')" accept=".pdf,image/*" class="w-full text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                <button v-if="files.decennale" @click="uploadDocument('decennale')" class="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2" :disabled="uploads.decennale.status === 'uploading'">
                  <Loader2 class="w-3.5 h-3.5 animate-spin" v-if="uploads.decennale.status === 'uploading'" />
                  <UploadCloud class="w-3.5 h-3.5" v-else />
                  Téléverser l'Attestation
                </button>
              </div>
              <div v-else class="text-xs text-emerald-400 flex items-center gap-1.5 py-1">
                <CheckCircle class="w-4 h-4" /> Justificatif Décennale envoyé avec succès.
              </div>
            </div>
          </div>

          <!-- Bottom Finish Action -->
          <button 
            @click="finishOnboarding"
            class="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all mt-4"
          >
            <span>Finaliser mon inscription</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

        <!-- Step 4: Success Screen -->
        <div v-if="activeStep === 4" class="text-center py-6 space-y-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-bounce">
            <CheckCircle class="w-10 h-10" />
          </div>
          <div>
            <h3 class="text-2xl font-bold text-white tracking-tight">Inscription Envoyée !</h3>
            <p class="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
              Vos documents administratifs sont en cours de modération. Nos équipes valideront votre compte sous 24 heures ouvrées.
            </p>
          </div>
          <div class="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl max-w-sm mx-auto text-xs text-zinc-400 space-y-1">
            <p>Votre slug de profil unique :</p>
            <code class="font-mono text-indigo-400 select-all block mt-1">{{ claimSlug }}</code>
          </div>
          <div class="pt-4 flex gap-4">
            <NuxtLink to="/" class="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Retour Accueil
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
