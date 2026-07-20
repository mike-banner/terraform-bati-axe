<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

useHead({
  title: 'Espace Artisan — Rejoindre BÂTI-AXE',
  meta: [
    { name: 'description', content: 'Inscrivez-vous ou connectez-vous pour revendiquer votre profil artisan.' }
  ]
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

// ─── Regex ────────────────────────────────────────────────────────────────────
// Email : RFC-lite, max 254 chars
const RE_EMAIL    = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/
// Téléphone FR : accepte espaces/tirets/points, ex: 06 11 22 33 44 ou +33611223344
const RE_PHONE_FR = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/
// SIRET : 14 chiffres (espaces ignorés via normalisation)
const RE_SIRET    = /^(\d{3}\s?){3}\d{5}$|^\d{14}$/
// Code postal FR : 5 chiffres
const RE_CP       = /^(?:0[1-9]|[1-9]\d)\d{3}$/
// Mot de passe : 8-72 chars (bcrypt max)
const RE_PASSWORD = /^.{8,72}$/
// Nom : 2-100 chars, pas que des espaces
const RE_NAME     = /^.{2,100}$/

// ─── State ────────────────────────────────────────────────────────────────────
const authMode  = ref<'register' | 'login'>('login')
const activeStep = ref(1)
const isLoading  = ref(false)
const globalError = ref<string | null>(null)
const showPassword = ref(false)
const claimSlug = ref('')

const authForm = reactive({ email: '', password: '', full_name: '' })
const CATEGORIES = [
  { id: 'maconnerie',  label: 'Maçonnerie & Gros Œuvre' },
  { id: 'toiture',    label: 'Charpente & Toiture' },
  { id: 'electricite',label: 'Électricité' },
  { id: 'plomberie',  label: 'Plomberie & Chauffage' },
  { id: 'peinture',   label: 'Peinture & Finitions' },
  { id: 'isolation',  label: 'Isolation & Cloisons' },
]

const proForm  = reactive({
  company_name: '',
  siret: '',
  full_name: '',
  phone: '',
  postal_code: '',
  categories: [] as string[],
  sms_opt_in: false,
  cgu_accepted: false
})

// ─── Normalisation silencieuse ─────────────────────────────────────────────────
function normalizeSiret(val: string) { 
  let digits = val.replace(/\D/g, '')
  if (digits.length > 14) digits = digits.slice(0, 14)
  let formatted = digits
  if (digits.length > 9) formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,9)} ${digits.slice(9)}`
  else if (digits.length > 6) formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`
  else if (digits.length > 3) formatted = `${digits.slice(0,3)} ${digits.slice(3)}`
  proForm.siret = formatted
}

function normalizePhone(val: string) {
  let cleaned = val.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '+33' + cleaned.slice(1)
  if (cleaned.length > 0 && !cleaned.startsWith('+')) cleaned = '+' + cleaned
  const has33 = cleaned.startsWith('+33')
  const prefix = has33 ? '+33' : cleaned.slice(0,3)
  let rest = has33 ? cleaned.slice(3) : cleaned.slice(3)
  rest = rest.replace(/\D/g, '').slice(0, 9)
  let formatted = prefix
  if (rest.length > 0) formatted += ' ' + rest.slice(0,1)
  if (rest.length > 1) formatted += ' ' + rest.slice(1,3)
  if (rest.length > 3) formatted += ' ' + rest.slice(3,5)
  if (rest.length > 5) formatted += ' ' + rest.slice(5,7)
  if (rest.length > 7) formatted += ' ' + rest.slice(7,9)
  proForm.phone = formatted
}

function normalizePostalCode(val: string) {
  proForm.postal_code = val.replace(/\D/g, '').slice(0, 5)
}

// touched: only show errors after the field has been blurred
const authTouched = reactive({ email: false, password: false, full_name: false })
const proTouched  = reactive({
  company_name: false,
  siret: false,
  full_name: false,
  phone: false,
  postal_code: false,
  cgu_accepted: false
})

// ─── Inline errors ────────────────────────────────────────────────────────────
const authErrors = computed(() => ({
  full_name: authTouched.full_name && authMode.value === 'register' && !RE_NAME.test(authForm.full_name)
    ? 'Nom requis (2 caractères minimum).' : '',
  email: authTouched.email && !RE_EMAIL.test(authForm.email)
    ? 'Adresse e-mail invalide.' : '',
  password: authTouched.password && !RE_PASSWORD.test(authForm.password)
    ? 'Mot de passe : 8 caractères minimum.' : '',
}))

const proErrors = computed(() => ({
  company_name: proTouched.company_name && !RE_NAME.test(proForm.company_name)
    ? 'Raison sociale requise.' : '',
  siret: proTouched.siret && !RE_SIRET.test(proForm.siret)
    ? 'SIRET invalide : 14 chiffres sans espace.' : '',
  full_name: proTouched.full_name && !RE_NAME.test(proForm.full_name)
    ? 'Nom du gérant requis.' : '',
  phone: proTouched.phone && !RE_PHONE_FR.test(proForm.phone)
    ? 'Numéro de téléphone français invalide.' : '',
  postal_code: proTouched.postal_code && !RE_CP.test(proForm.postal_code)
    ? 'Code postal : 5 chiffres.' : '',
  cgu_accepted: proTouched.cgu_accepted && !proForm.cgu_accepted
    ? 'Vous devez accepter les CGU pour continuer.' : '',
}))

// ─── Auth validity ────────────────────────────────────────────────────────────
const isAuthValid = computed(() => {
  if (authMode.value === 'login') {
    return RE_EMAIL.test(authForm.email) && RE_PASSWORD.test(authForm.password)
  }
  return RE_EMAIL.test(authForm.email) && RE_PASSWORD.test(authForm.password) && RE_NAME.test(authForm.full_name)
})

const isProFormValid = computed(() =>
  RE_NAME.test(proForm.company_name) &&
  RE_SIRET.test(proForm.siret) &&
  RE_NAME.test(proForm.full_name) &&
  RE_PHONE_FR.test(proForm.phone) &&
  RE_CP.test(proForm.postal_code) &&
  proForm.categories.length > 0 &&
  proForm.cgu_accepted
)

const categoriesTouched = ref(false)

const toggleCategory = (id: string) => {
  categoriesTouched.value = true
  if (proForm.categories.includes(id)) {
    proForm.categories = proForm.categories.filter(c => c !== id)
  } else {
    proForm.categories.push(id)
  }
}

// Preview rapide : confirmation visuelle du nom d'entreprise + pre-cochage categories.
const siretPreview = reactive({ loading: false, companyName: '' as string | null, status: '' })
// Suit si proForm.company_name vient du dernier auto-remplissage (donc écrasable par un nouveau SIRET)
// ou d'une saisie manuelle (donc protégée).
const companyNameAutoFilled = ref(false)

async function fetchSuggestedCategories() {
  if (!RE_SIRET.test(proForm.siret)) { siretPreview.companyName = null; return }
  siretPreview.loading = true
  siretPreview.companyName = null
  try {
    const res = await $fetch<{ status: string; company_name?: string | null; suggested_categories: string[] }>('/api/v1/pro/siret-preview', {
      method: 'POST',
      body: { siret: proForm.siret.replace(/\s/g, '') }
    })
    siretPreview.status = res.status
    siretPreview.companyName = res.company_name ?? null
    if (siretPreview.companyName && (companyNameAutoFilled.value || !proForm.company_name)) {
      proForm.company_name = siretPreview.companyName
      companyNameAutoFilled.value = true
    }
    if (res.suggested_categories?.length && !categoriesTouched.value && proForm.categories.length === 0) {
      proForm.categories = [...res.suggested_categories]
    }
  } catch {
    // Suggestion UX uniquement : une erreur reseau ne doit jamais bloquer le formulaire.
  } finally {
    siretPreview.loading = false
  }
}

// ─── Error translation ────────────────────────────────────────────────────────
function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials'))   return 'E-mail ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed'))          return 'Confirmez votre e-mail avant de vous connecter.'
  if (msg.includes('User already registered'))      return 'Un compte existe déjà avec cet e-mail. Connectez-vous.'
  if (msg.includes('Password should be'))           return 'Mot de passe trop faible (8 caractères minimum).'
  if (msg.includes('rate limit'))                   return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (msg.includes('Email rate limit'))             return 'Trop d\'e-mails envoyés. Patientez quelques minutes.'
  return 'Une erreur est survenue. Veuillez réessayer.'
}

// ─── Prospect pre-fill ────────────────────────────────────────────────────────
const prospectId = computed(() => route.query.prospect_id as string || '')

const router = useRouter()

// Aiguillage d'un utilisateur authentifié confirmé : profil existant → dashboard,
// admin → console, sinon étape 2 (renseigner l'entreprise).
async function routeAuthedUser(authedUser: any) {
  const { data: pro } = await supabase
    .from('professionals').select('id').eq('id', authedUser.id).maybeSingle()
  if (pro) return router.push('/espace/dashboard')
  if (authedUser.app_metadata?.role === 'admin') return router.push('/admin')
  if (authedUser.user_metadata?.full_name) proForm.full_name = authedUser.user_metadata.full_name
  activeStep.value = 2
}

// Décision d'auth autoritaire, client uniquement : getSession() lit le stockage
// réel et ne souffre PAS du null transitoire de useSupabaseUser() à l'hydratation.
// Évite le « flash connexion » pour un pro déjà connecté qui atterrit ici.
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await routeAuthedUser(session.user)
  } else {
    activeStep.value = 1
  }
})

// Déconnexion explicite après coup → retour à l'écran de connexion.
watch(user, (newUser) => {
  if (newUser === null) activeStep.value = 1
})

if (prospectId.value) {
  try {
    const { data } = await useFetch<{ status: string; company_name?: string; siret?: string; postal_code?: string }>(`/api/v1/prospects/${prospectId.value}`)
    if (data.value?.status === 'SUCCESS') {
      proForm.company_name = data.value.company_name || ''
      proForm.siret        = data.value.siret        || ''
      proForm.postal_code  = data.value.postal_code  || ''
    }
  } catch { /* silent */ }
}

// ─── Upload state ─────────────────────────────────────────────────────────────
const files = reactive({ kbis: null as File | null, decennale: null as File | null })
const uploads = reactive({
  kbis:      { status: 'idle' as 'idle' | 'uploading' | 'success' | 'error', error: '' },
  decennale: { status: 'idle' as 'idle' | 'uploading' | 'success' | 'error', error: '',
    policyNumber: '', expirationDate: '' }
})

// ─── Handlers ─────────────────────────────────────────────────────────────────
const touchAllAuth = () => {
  authTouched.email = true
  authTouched.password = true
  if (authMode.value === 'register') authTouched.full_name = true
}

const touchAllPro = () => {
  proTouched.company_name = true
  proTouched.siret        = true
  proTouched.full_name    = true
  proTouched.phone        = true
  proTouched.postal_code  = true
  proTouched.cgu_accepted = true
}

const handleAuth = async () => {
  touchAllAuth()
  if (!isAuthValid.value) {
    globalError.value = 'Veuillez corriger les champs en rouge pour continuer.'
    return
  }
  isLoading.value = true
  globalError.value = null

  try {
    if (authMode.value === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: { data: { full_name: authForm.full_name } }
      })
      if (error) throw error
    }

    if (authForm.full_name) proForm.full_name = authForm.full_name

    // Fetch fresh session to get populated app_metadata (nextTick is not enough)
    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user ?? useSupabaseUser().value

    // Admin → redirect to console immediately
    if ((currentUser as any)?.app_metadata?.role === 'admin') {
      return await navigateTo('/admin')
    }

    if (currentUser) {
      const { data: existingPro } = await supabase
        .from('professionals')
        .select('id, canonical_slug')
        .eq('id', currentUser.id)
        .maybeSingle() as { data: { id: string; canonical_slug: string } | null }

      if (existingPro) {
        return navigateTo('/espace/dashboard')
      } else {
        activeStep.value = 2
      }
    } else {
      activeStep.value = 2
    }
  } catch (err: any) {
    globalError.value = translateAuthError(err.message || '')
  } finally {
    isLoading.value = false
  }
}

const handleRegisterCompany = async () => {
  isLoading.value = true
  globalError.value = null
  touchAllPro()
  if (!isProFormValid.value) {
    globalError.value = 'Veuillez corriger les champs en rouge pour continuer.'
    isLoading.value = false
    return
  }

  try {
    const result = await $fetch<{ status: string; slug: string; professionalId: string }>('/api/v1/pro/claim', {
      method: 'POST',
      body: {
        prospect_id:  prospectId.value || undefined,
        company_name: proForm.company_name,
        siret:        proForm.siret.replace(/\s/g, ''),
        full_name:    proForm.full_name,
        phone:        proForm.phone.replace(/\s/g, ''),
        postal_code:  proForm.postal_code,
        categories:   proForm.categories,
        sms_opt_in:   proForm.sms_opt_in
      }
    })

      if (result?.status === 'SUCCESS') {
      claimSlug.value = result.slug
      activeStep.value = 3
    }
  } catch (err: any) {
    // Extraire l'erreur de validation Zod si disponible pour plus de clarté
    const zodErrors = err.data?.data
    if (zodErrors) {
      const messages = Object.values(zodErrors).filter(v => v && (v as any)._errors).map(v => (v as any)._errors.join(', '))
      globalError.value = messages.length > 0 ? messages.join(' | ') : err.message
    } else {
      globalError.value = err.message
    }
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = (event: Event, type: 'kbis' | 'decennale') => {
  const target = event.target as HTMLInputElement
  if (target.files?.[0]) {
    files[type] = target.files[0]
    uploads[type].status = 'idle'
    uploads[type].error  = ''
  }
}

const uploadDocument = async (type: 'kbis' | 'decennale') => {
  const file = files[type]
  if (!file) return
  if (type === 'decennale' && (!uploads.decennale.policyNumber || !uploads.decennale.expirationDate)) return

  uploads[type].status = 'uploading'
  uploads[type].error  = ''

  try {
    const presignData = await $fetch<{ status: string; signedUrl: string; fileKey: string }>('/api/v1/pro/documents/presign', {
      method: 'POST',
      body: { document_type: type, filename: file.name }
    })

    if (presignData?.status !== 'SUCCESS') {
      throw new Error('Erreur lors de la génération de la signature.')
    }

    const { signedUrl, fileKey } = presignData
    const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) throw new Error('Échec du transfert. Vérifiez votre connexion et réessayez.')

    const uploadBody: Record<string, string> = { document_type: type, file_key: fileKey }
    if (type === 'decennale') {
      uploadBody.policy_number   = uploads.decennale.policyNumber
      uploadBody.expiration_date = uploads.decennale.expirationDate
    }
    await $fetch('/api/v1/pro/documents/upload', { method: 'POST', body: uploadBody })

    uploads[type].status = 'success'
  } catch (err: any) {
    uploads[type].status = 'error'
    uploads[type].error  = err.data?.statusMessage || err.message || 'Erreur de transfert.'
  }
}

const finishOnboarding = () => navigateTo('/espace/dashboard')

const switchMode = (mode: 'register' | 'login') => {
  authMode.value = mode
  // reset touched state when switching tabs
  authTouched.email     = false
  authTouched.password  = false
  authTouched.full_name = false
  globalError.value     = null
}

const logoutAndRestart = async () => {
  await supabase.auth.signOut()
  switchMode('register')
  activeStep.value = 1
}

const backToStep2 = () => {
  activeStep.value = 2
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-page flex items-start justify-center px-4 py-16">
    <div class="w-full max-w-md">

      <!-- Page title -->
      <div class="mb-10">
        <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">Espace artisan</p>
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-foreground" style="text-wrap: balance">
          {{ activeStep === 1 ? (authMode === 'register' ? 'Créer votre compte' : 'Se connecter') : activeStep === 2 ? 'Votre entreprise' : activeStep === 3 ? 'Vos documents' : 'Demande envoyée' }}
        </h1>
      </div>

      <!-- Step indicator — inscription only, not login -->
      <div v-if="activeStep < 4 && !(activeStep === 1 && authMode === 'login')" class="flex items-center gap-0 mb-10">
        <template v-for="n in 3" :key="n">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              :class="activeStep === n ? 'bg-foreground text-background' : activeStep > n ? 'bg-foreground text-background opacity-40' : 'border border-border text-muted-foreground'"
            >{{ n }}</div>
            <span class="text-xs font-medium" :class="activeStep === n ? 'text-foreground' : 'text-muted-foreground'">
              {{ n === 1 ? 'Connexion' : n === 2 ? 'Profil' : 'Documents' }}
            </span>
          </div>
          <div v-if="n < 3" class="flex-1 h-px bg-border mx-3" />
        </template>
      </div>

      <!-- ─── STEP 1: Auth ─────────────────────────────────────────────────── -->
      <div v-if="activeStep === 1">

        <!-- Tabs — Se connecter LEFT, Créer un compte RIGHT -->
        <div class="flex border-b border-border mb-8">
          <button
            class="flex-1 pb-3 text-sm font-semibold transition-colors"
            :class="authMode === 'login' ? 'text-foreground border-b-2 border-foreground -mb-px' : 'text-muted-foreground hover:text-foreground'"
            @click="switchMode('login')"
          >Se connecter</button>
          <button
            class="flex-1 pb-3 text-sm font-semibold transition-colors"
            :class="authMode === 'register' ? 'text-foreground border-b-2 border-foreground -mb-px' : 'text-muted-foreground hover:text-foreground'"
            @click="switchMode('register')"
          >Créer un compte</button>
        </div>

        <form @submit.prevent="handleAuth" novalidate class="space-y-5">

          <!-- Full name (register only) -->
          <Transition name="field">
            <div v-if="authMode === 'register'">
              <label for="auth-name" class="block text-sm font-heading font-500 text-text mb-2">Nom complet</label>
              <input
                id="auth-name"
                type="text"
                v-model="authForm.full_name"
                autocomplete="name"
                placeholder="Jean Dupont"
                @blur="authTouched.full_name = true"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                :class="authErrors.full_name ? 'border-red-500' : 'border-border'"
                :aria-invalid="!!authErrors.full_name"
                :aria-describedby="authErrors.full_name ? 'err-name' : undefined"
              />
              <p v-if="authErrors.full_name" id="err-name" class="mt-2 text-xs text-red-600 font-500">{{ authErrors.full_name }}</p>
            </div>
          </Transition>

          <!-- Email -->
          <div>
            <label for="auth-email" class="block text-sm font-heading font-500 text-text mb-2">Adresse e-mail</label>
            <input
              id="auth-email"
              type="email"
              v-model="authForm.email"
              autocomplete="email"
              placeholder="contact@dupont-plomberie.fr"
              @blur="authTouched.email = true"
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              :class="authErrors.email ? 'border-red-500' : 'border-border'"
              :aria-invalid="!!authErrors.email"
              :aria-describedby="authErrors.email ? 'err-email' : undefined"
            />
            <p v-if="authErrors.email" id="err-email" class="mt-2 text-xs text-red-600 font-500">{{ authErrors.email }}</p>
          </div>

          <!-- Password -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="auth-password" class="text-sm font-medium text-foreground">Mot de passe</label>
              <button v-if="authMode === 'login'" type="button" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Mot de passe oublié ?
              </button>
            </div>
            <div class="relative">
              <input
                id="auth-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="authForm.password"
                autocomplete="current-password"
                placeholder="••••••••"
                @blur="authTouched.password = true"
                class="w-full h-11 px-3 pr-10 border rounded-md text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                :class="authErrors.password ? 'border-red-500' : 'border-border'"
                :aria-invalid="!!authErrors.password"
                :aria-describedby="authErrors.password ? 'err-password' : undefined"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>
            </div>
            <p v-if="authErrors.password" id="err-password" class="mt-2 text-xs text-red-600 font-500">{{ authErrors.password }}</p>
            <p v-if="authMode === 'register' && !authErrors.password" class="mt-1.5 text-xs text-muted-foreground">8 caractères minimum.</p>
          </div>

          <!-- Global error -->
          <div v-if="globalError" role="alert" class="flex items-start gap-2.5 p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
            <span>{{ globalError }}</span>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-12 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <span>{{ authMode === 'register' ? 'Créer mon compte' : 'Se connecter' }}</span>
          </button>

          <p class="text-center text-xs text-muted-foreground">
            <template v-if="authMode === 'register'">
              Déjà un compte ?
              <button type="button" @click="switchMode('login')" class="font-semibold text-foreground underline underline-offset-2">Se connecter</button>
            </template>
            <template v-else>
              Pas encore de compte ?
              <button type="button" @click="switchMode('register')" class="font-semibold text-foreground underline underline-offset-2">Créer un compte</button>
            </template>
          </p>

        </form>
      </div>

      <!-- ─── STEP 2: Company ──────────────────────────────────────────────── -->
      <div v-if="activeStep === 2">
        <p class="text-sm text-muted-foreground mb-8">Renseignez les informations officielles de votre entreprise. Elles seront vérifiées par notre équipe.</p>

        <form @submit.prevent="handleRegisterCompany" novalidate class="space-y-5">

          <!-- SIRET -->
          <div>
            <label for="pro-siret" class="block text-sm font-heading font-500 text-text mb-2">Numéro SIRET</label>
            <input
              id="pro-siret"
              type="text"
              v-model="proForm.siret"
              placeholder="123 456 789 00012"
              maxlength="19"
              inputmode="numeric"
              @input="normalizeSiret(($event.target as HTMLInputElement).value)"
              @blur="proTouched.siret = true; fetchSuggestedCategories()"
              class="w-full h-11 px-3 border border-border rounded-md text-sm bg-white text-text placeholder:text-gray-500 font-mono tracking-wider transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              :class="proErrors.siret ? 'border-red-500' : 'border-border'"
              :aria-invalid="!!proErrors.siret"
            />
            <p v-if="proErrors.siret" class="mt-2 text-xs text-red-600 font-500">{{ proErrors.siret }}</p>
            <p v-else-if="siretPreview.loading" class="mt-1.5 text-xs text-muted-foreground">Recherche...</p>
            <p v-else-if="siretPreview.companyName" class="mt-1.5 text-xs text-green-700 font-500">✓ {{ siretPreview.companyName }}</p>
            <p v-else class="mt-1.5 text-xs text-muted-foreground">14 chiffres, sans espace.</p>
          </div>

          <!-- Company name -->
          <div>
            <label for="pro-company" class="block text-sm font-heading font-500 text-text mb-2">Raison sociale</label>
            <input
              id="pro-company"
              type="text"
              v-model="proForm.company_name"
              placeholder="DUPONT PLOMBERIE SARL"
              @blur="proTouched.company_name = true; companyNameAutoFilled = false"
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              :class="proErrors.company_name ? 'border-red-500' : 'border-border'"
              :aria-invalid="!!proErrors.company_name"
            />
            <p v-if="proErrors.company_name" class="mt-2 text-xs text-red-600 font-500">{{ proErrors.company_name }}</p>
          </div>

          <!-- Manager name -->
          <div>
            <label for="pro-name" class="block text-sm font-heading font-500 text-text mb-2">Nom du gérant</label>
            <input
              id="pro-name"
              type="text"
              v-model="proForm.full_name"
              @blur="proTouched.full_name = true"
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              :class="proErrors.full_name ? 'border-red-500' : 'border-border'"
              :aria-invalid="!!proErrors.full_name"
            />
            <p v-if="proErrors.full_name" class="mt-2 text-xs text-red-600 font-500">{{ proErrors.full_name }}</p>
          </div>

          <!-- Phone + Postal code -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="pro-phone" class="block text-sm font-heading font-500 text-text mb-2">Téléphone</label>
              <input
                id="pro-phone"
                type="tel"
                v-model="proForm.phone"
                placeholder="06 11 22 33 44"
                autocomplete="tel"
                maxlength="20"
                @input="normalizePhone(($event.target as HTMLInputElement).value)"
                @blur="proTouched.phone = true"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                :class="proErrors.phone ? 'border-red-500' : 'border-border'"
                :aria-invalid="!!proErrors.phone"
              />
              <p v-if="proErrors.phone" class="mt-2 text-xs text-red-600 font-500">{{ proErrors.phone }}</p>
            </div>
            <div>
              <label for="pro-cp" class="block text-sm font-heading font-500 text-text mb-2">Code postal</label>
              <input
                id="pro-cp"
                type="text"
                v-model="proForm.postal_code"
                placeholder="78955"
                maxlength="5"
                inputmode="numeric"
                @input="normalizePostalCode(($event.target as HTMLInputElement).value)"
                @blur="proTouched.postal_code = true"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                :class="proErrors.postal_code ? 'border-red-500' : 'border-border'"
                :aria-invalid="!!proErrors.postal_code"
              />
              <p v-if="proErrors.postal_code" class="mt-2 text-xs text-red-600 font-500">{{ proErrors.postal_code }}</p>
            </div>
          </div>

          <!-- Categories -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Corps de métier <span class="text-red-600">*</span></label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="cat in CATEGORIES"
                :key="cat.id"
                type="button"
                @click="toggleCategory(cat.id)"
                class="h-10 px-3 rounded-md border text-sm font-medium text-left transition-colors"
                :class="proForm.categories.includes(cat.id)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-foreground hover:bg-muted'"
              >
                {{ cat.label }}
              </button>
            </div>
            <p v-if="proForm.categories.length === 0 && proTouched.cgu_accepted" class="mt-2 text-xs text-red-600 font-500">Sélectionnez au moins un corps de métier.</p>
            <p class="mt-2 text-xs text-muted-foreground">Vos catégories doivent correspondre aux travaux couverts par votre assurance décennale. En cas de sinistre hors couverture, votre responsabilité personnelle est engagée.</p>
          </div>

          <!-- Consents -->
          <div class="pt-2 space-y-3 border-t border-border">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="proForm.cgu_accepted"
                @change="proTouched.cgu_accepted = true"
                class="mt-0.5 w-4 h-4 rounded border-border text-foreground"
              />
              <span class="text-sm text-foreground leading-snug">
                J'accepte les <NuxtLink to="/legal/cgu" class="underline underline-offset-2 hover:opacity-70">conditions générales d'utilisation</NuxtLink> Pro. <span class="text-red-600">*</span>
              </span>
            </label>
            <p v-if="proErrors.cgu_accepted" role="alert" class="ml-7 text-xs text-red-600">{{ proErrors.cgu_accepted }}</p>

            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="proForm.sms_opt_in"
                class="mt-0.5 w-4 h-4 rounded border-border text-foreground"
              />
              <span class="text-sm text-muted-foreground leading-snug">
                J'accepte de recevoir des alertes SMS lors du dépôt d'un projet dans ma zone. Désabonnement possible à tout moment par retour SMS STOP.
              </span>
            </label>
          </div>

          <!-- Global error -->
          <div v-if="globalError" role="alert" class="flex items-start gap-2.5 p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
            <span>{{ globalError }}</span>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-12 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <span>Valider mon profil</span>
          </button>
          
          <button
            type="button"
            @click="logoutAndRestart"
            :disabled="isLoading"
            class="w-full h-12 border border-slate-200 bg-white text-foreground text-sm font-semibold rounded-full hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            <span>Retour (Changer d'e-mail)</span>
          </button>
        </form>
      </div>

      <!-- ─── STEP 3: Documents ─────────────────────────────────────────────── -->
      <div v-if="activeStep === 3" class="space-y-6">
        <p class="text-sm text-muted-foreground">Téléversez vos justificatifs pour activer votre profil et accéder aux leads. Chaque document est contrôlé manuellement par notre équipe.</p>

        <!-- KBIS -->
        <div class="bento-card border border-slate-200 rounded-3xl p-8" :class="uploads.kbis.status === 'success' ? 'border-foreground/30' : ''">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm font-semibold text-foreground">Extrait KBIS</p>
              <p class="text-xs text-muted-foreground mt-0.5">Moins de 3 mois · PDF, JPG ou PNG</p>
            </div>
            <div v-if="uploads.kbis.status === 'success'" class="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              Envoyé
            </div>
          </div>

          <div v-if="uploads.kbis.status !== 'success'" class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer text-sm">
              <input type="file" @change="handleFileSelect($event, 'kbis')" accept=".pdf,image/*" class="sr-only" />
              <span class="h-9 px-4 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                Choisir un fichier
              </span>
              <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ files.kbis ? files.kbis.name : 'Aucun fichier sélectionné' }}</span>
            </label>
            <div v-if="uploads.kbis.status === 'error'" role="alert" class="text-xs text-red-600">{{ uploads.kbis.error }}</div>
            <button
              v-if="files.kbis"
              @click="uploadDocument('kbis')"
              :disabled="uploads.kbis.status === 'uploading'"
              class="h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="uploads.kbis.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {{ uploads.kbis.status === 'uploading' ? 'Envoi en cours…' : 'Envoyer le KBIS' }}
            </button>
          </div>
        </div>

        <!-- Décennale -->
        <div class="bento-card border border-slate-200 rounded-3xl p-8" :class="uploads.decennale.status === 'success' ? 'border-foreground/30' : ''">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm font-semibold text-foreground">Attestation décennale</p>
              <p class="text-xs text-muted-foreground mt-0.5">Date d'expiration vérifiée · PDF, JPG ou PNG</p>
            </div>
            <div v-if="uploads.decennale.status === 'success'" class="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              Envoyée
            </div>
          </div>

          <div v-if="uploads.decennale.status !== 'success'" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-muted-foreground mb-1">Numéro de police <span class="text-red-500">*</span></label>
                <input
                  v-model="uploads.decennale.policyNumber"
                  type="text"
                  placeholder="Ex : 12345678A"
                  class="h-9 w-full px-3 border border-border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label class="block text-xs text-muted-foreground mb-1">Date d'expiration <span class="text-red-500">*</span></label>
                <input
                  v-model="uploads.decennale.expirationDate"
                  type="date"
                  class="h-9 w-full px-3 border border-border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>
            <label class="flex items-center gap-3 cursor-pointer text-sm">
              <input type="file" @change="handleFileSelect($event, 'decennale')" accept=".pdf,image/*" class="sr-only" />
              <span class="h-9 px-4 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                Choisir un fichier
              </span>
              <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ files.decennale ? files.decennale.name : 'Aucun fichier sélectionné' }}</span>
            </label>
            <div v-if="uploads.decennale.status === 'error'" role="alert" class="text-xs text-red-600">{{ uploads.decennale.error }}</div>
            <button
              v-if="files.decennale"
              @click="uploadDocument('decennale')"
              :disabled="uploads.decennale.status === 'uploading' || !uploads.decennale.policyNumber || !uploads.decennale.expirationDate"
              class="h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="uploads.decennale.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {{ uploads.decennale.status === 'uploading' ? 'Envoi en cours…' : 'Envoyer la décennale' }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            @click="finishOnboarding"
            class="w-full h-11 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
          >
            <span>Finaliser mon inscription</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          
          <button
            type="button"
            @click="backToStep2"
            class="w-full h-11 border border-border text-foreground text-sm font-semibold rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            <span>Retour aux infos de l'entreprise</span>
          </button>
        </div>

        <p class="text-xs text-center text-muted-foreground mt-4">Vous pouvez envoyer vos documents plus tard depuis votre espace.</p>
      </div>

      <!-- ─── STEP 4: Success ──────────────────────────────────────────────── -->
      <div v-if="activeStep === 4" class="py-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-foreground text-background mb-8">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
        </div>

        <h2 class="text-2xl font-black tracking-tight text-foreground mb-3">Demande envoyée.</h2>
        <p class="text-sm text-muted-foreground leading-relaxed mb-8">
          Vos documents sont en cours d'examen. Notre équipe valide chaque dossier sous 24 heures ouvrées. Vous recevrez un e-mail de confirmation à l'issue de la vérification.
        </p>

        <div v-if="claimSlug" class="p-4 border border-border rounded-lg mb-8">
          <p class="text-xs text-muted-foreground mb-1">Identifiant de votre profil</p>
          <code class="font-mono text-sm text-foreground select-all">{{ claimSlug }}</code>
        </div>

        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center h-11 px-6 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors"
        >
          Retour à l'accueil
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.field-enter-active,
.field-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.field-enter-from,
.field-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .field-enter-active,
  .field-leave-active {
    transition: opacity 0.15s ease;
  }
  .field-enter-from,
  .field-leave-to {
    transform: none;
  }
}
</style>
