<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ChefHat, Bath, Sofa, BedDouble, Trees, LayoutGrid } from 'lucide-vue-next'
import { computeEstimate } from '~/utils/calculateur'

useHead({
  title: 'Simulateur de Travaux — BÂTI-AXE',
  meta: [
    { name: 'description', content: 'Estimez vos travaux et trouvez le professionnel idéal à Carrières-sous-Poissy.' }
  ]
})

// ─── Data ─────────────────────────────────────────────────────────────────────
const renovationTypes = [
  { id: 'totale',  label: 'Rénovation totale', desc: 'Ensemble du logement, de A à Z' },
  { id: 'pieces',  label: 'Pièce par pièce',   desc: 'Une ou plusieurs pièces ciblées' },
]

const piecesList = [
  { id: 'cuisine',       label: 'Cuisine',        icon: ChefHat },
  { id: 'salle_de_bain', label: 'Salle de bain',  icon: Bath },
  { id: 'salon',         label: 'Salon',          icon: Sofa },
  { id: 'chambre',       label: 'Chambre',        icon: BedDouble },
  { id: 'exterieur',     label: 'Extérieur',      icon: Trees },
  { id: 'autre',         label: 'Autre',          icon: LayoutGrid },
]

const gammes = [
  { id: 'leger',    label: 'Rafraîchissement', desc: 'Finitions, peinture, petites réparations' },
  { id: 'standard', label: 'Standard',         desc: 'Rénovation complète, matériaux courants' },
  { id: 'premium',  label: 'Premium',          desc: 'Haut de gamme, matériaux nobles' },
]

// ─── State ────────────────────────────────────────────────────────────────────
const step         = ref(1)
const totalSteps   = 6
const isSubmitting = ref(false)
const submitError  = ref<string | null>(null)
const createdProjectId = ref<string | null>(null)
const createdAccessToken = ref<string | null>(null)
const revealed = ref(false)

const form = reactive({
  renovation_type: '',
  pieces:          [] as string[],
  surface_m2:      0,
  gamme:           '',
  postal_code:     '',
  customer_name:   '',
  customer_email:  '',
  customer_phone:  '',
  cgu_accepted:    false,
  sms_opt_in:      false,
})

// touched for lead wall contact fields
const touched = reactive({ name: false, email: false, phone: false })

// ─── Regex ────────────────────────────────────────────────────────────────────
const RE_EMAIL    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RE_PHONE_FR = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]*\d{2}){4}$/

// ─── Validation ───────────────────────────────────────────────────────────────
const isStepValid = computed(() => {
  switch (step.value) {
    case 1: return !!form.renovation_type
    case 2: return form.renovation_type === 'totale' ? true : form.pieces.length > 0
    case 3: return form.surface_m2 > 0
    case 4: return !!form.gamme
    case 5: return form.postal_code === '78955'
    case 6: return (
      form.customer_name.trim().length >= 2 &&
      RE_EMAIL.test(form.customer_email) &&
      RE_PHONE_FR.test(form.customer_phone) &&
      form.cgu_accepted
    )
    default: return false
  }
})

const contactErrors = computed(() => ({
  name:  touched.name  && form.customer_name.trim().length < 2 ? 'Nom requis.' : '',
  email: touched.email && !RE_EMAIL.test(form.customer_email) ? 'Adresse e-mail invalide.' : '',
  phone: touched.phone && !RE_PHONE_FR.test(form.customer_phone) ? 'Numéro français invalide (ex: 06 12 34 56 78).' : '',
}))

const progress = computed(() => Math.round(((step.value - 1) / totalSteps) * 100))

const stepLabels: Record<number, string> = {
  1: 'Type de rénovation',
  2: 'Pièces concernées',
  3: 'Surface',
  4: 'Niveau de prestation',
  5: 'Localisation',
  6: 'Vos coordonnées',
}

// ─── Estimation (calculée en continu, jamais affichée avant révélation) ───────
const estimate = computed(() => computeEstimate({
  renovation_type: form.renovation_type,
  pieces: form.pieces,
  surface_m2: form.surface_m2,
  gamme: form.gamme as 'leger' | 'standard' | 'premium',
}))

const formatEuro = (n: number) => n.toLocaleString('fr-FR') + ' €'

// ─── Handlers ─────────────────────────────────────────────────────────────────
const nextStep = () => {
  if (step.value < totalSteps && isStepValid.value) {
    step.value++
    // Rénovation totale : pas de sélection de pièces, on saute l'étape 2.
    if (step.value === 2 && form.renovation_type === 'totale') step.value = 3
    submitError.value = null
  }
}

const selectRenovationType = (id: string) => { form.renovation_type = id; nextStep() }
const selectGamme = (id: string) => { form.gamme = id; nextStep() }

const togglePiece = (id: string) => {
  const i = form.pieces.indexOf(id)
  if (i === -1) form.pieces.push(id)
  else form.pieces.splice(i, 1)
}

const prevStep = () => {
  if (step.value > 1) {
    step.value--
    // Retour : sauter l'étape 2 si rénovation totale (pas de pièces à choisir).
    if (step.value === 2 && form.renovation_type === 'totale') step.value = 1
    submitError.value = null
  }
}

const normalizePhone = (e: Event) => {
  let val = (e.target as HTMLInputElement).value
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
  form.customer_phone = formatted
}

const normalizePostalCode = (e: Event) => {
  form.postal_code = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 5)
}

const handleSubmit = async () => {
  touched.name = true; touched.email = true; touched.phone = true
  if (!isStepValid.value) return
  isSubmitting.value = true
  submitError.value  = null

  try {
    const data = await $fetch<{ status: string; projectId: string; zoneName: string; accessToken?: string }>('/api/v1/projects', {
      method: 'POST',
      body: {
        calculator_data: {
          renovation_type: form.renovation_type,
          pieces:          form.pieces,
          surface_m2:      form.surface_m2,
          gamme:           form.gamme,
          estimate_min:    estimate.value.estimate_min,
          estimate_max:    estimate.value.estimate_max,
        },
        postal_code:    form.postal_code,
        customer_name:  form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone.replace(/\s/g, ''),
        cgu_accepted:   form.cgu_accepted,
        sms_opt_in:     form.sms_opt_in,
      }
    })

    if (data?.status === 'SUCCESS') {
      createdProjectId.value = data.projectId
      if (data.accessToken) createdAccessToken.value = data.accessToken
      revealed.value = true
    }
  } catch (err: any) {
    submitError.value = err.data?.data?.message || err.statusMessage || err.message || 'Une erreur serveur est survenue. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-page flex items-start justify-center px-4 py-12 md:py-16">
    <div class="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10">

      <!-- ─── Révélation estimation (après Lead Wall validé) ────────────── -->
      <div v-if="revealed" class="py-8">
        <p class="text-xs font-semibold text-safety uppercase tracking-wide mb-3">Votre estimation</p>
        <h1
          class="font-black tracking-tight text-foreground mb-3"
          style="font-size: clamp(2.5rem, 4vw + 1rem, 3.5rem); text-wrap: balance"
        >
          <span class="text-safety">{{ formatEuro(estimate.estimate_min) }} – {{ formatEuro(estimate.estimate_max) }}</span>
        </h1>
        <p class="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm" style="text-wrap: pretty">
          Cette fourchette est indicative. Votre demande a été transmise aux artisans partenaires de Carrières-sous-Poissy. Vous recevrez un premier contact sous 2 minutes si un artisan abonné est disponible.
        </p>
        <div v-if="createdProjectId" class="p-4 border border-border rounded-lg mb-8">
          <p class="text-xs text-muted-foreground mb-1">Référence de votre projet</p>
          <code class="font-mono text-sm text-foreground select-all">{{ createdProjectId }}</code>
        </div>

        <div v-if="createdAccessToken" class="p-5 border border-slate-200 bg-slate-50 rounded-2xl mb-8">
          <p class="text-sm font-semibold text-slate-900 mb-1">🛠️ Mode Dév : Tester la messagerie</p>
          <p class="text-xs text-slate-600 mb-4">En production, ce lien est envoyé par email (Magic Link).</p>
          <NuxtLink
            :to="`/mon-projet/${createdAccessToken}`"
            class="inline-flex items-center justify-center h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform w-full"
            target="_blank"
          >
            Ouvrir l'Espace Client
          </NuxtLink>
        </div>
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center h-11 px-6 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors"
        >
          Retour à l'accueil
        </NuxtLink>
      </div>

      <!-- ─── Simulator steps ───────────────────────────────────────────── -->
      <template v-else>

        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs text-muted-foreground">Étape {{ step }} / {{ totalSteps }} — {{ stepLabels[step] }}</span>
            <NuxtLink to="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">Annuler</NuxtLink>
          </div>
          <!-- Progress bar -->
          <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-safety transition-all duration-300 ease-out"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <Transition name="fade" mode="out-in">

        <!-- ─── Step 1: Type de rénovation ──────────────────────────────── -->
        <div v-if="step === 1" key="step1" class="space-y-4 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Quel type de rénovation ?
          </h1>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              v-for="t in renovationTypes"
              :key="t.id"
              type="button"
              @click="selectRenovationType(t.id)"
              class="bento-card reveal-item flex items-center justify-between p-4 border rounded-2xl text-left transition-colors min-h-11"
              :class="form.renovation_type === t.id
                ? 'border-orange-500 bg-orange-50 text-slate-900'
                : 'border-border hover:border-foreground/40 hover:bg-muted'"
            >
              <div>
                <p class="text-sm font-semibold">{{ t.label }}</p>
                <p class="text-xs mt-0.5 text-muted-foreground">{{ t.desc }}</p>
              </div>
              <svg v-if="form.renovation_type === t.id" class="w-4 h-4 shrink-0 ml-3 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ─── Step 2: Pièces concernées (multi-select) ─────────────────── -->
        <div v-else-if="step === 2" key="step2" class="space-y-4 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Quelles pièces sont concernées ?
          </h1>
          <p class="text-sm text-muted-foreground">Sélectionnez une ou plusieurs pièces.</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
            <button
              v-for="p in piecesList"
              :key="p.id"
              type="button"
              @click="togglePiece(p.id)"
              class="bento-card reveal-item flex flex-col items-center justify-center gap-2 p-4 border rounded-2xl text-center transition-colors min-h-11"
              :class="form.pieces.includes(p.id)
                ? 'border-orange-500 bg-orange-50 text-slate-900'
                : 'border-border hover:border-foreground/40 hover:bg-muted'"
            >
              <component :is="p.icon" class="w-5 h-5" :class="form.pieces.includes(p.id) ? 'text-safety' : 'text-muted-foreground'" />
              <span class="text-sm font-semibold">{{ p.label }}</span>
            </button>
          </div>
        </div>

        <!-- ─── Step 3: Surface ───────────────────────────────────────────── -->
        <div v-else-if="step === 3" key="step3" class="space-y-4 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Quelle surface au total ?
          </h1>
          <p class="text-sm text-muted-foreground">Surface approximative en m².</p>
          <div class="pt-4 space-y-4">
            <div class="flex items-baseline gap-2">
              <input
                type="number"
                v-model.number="form.surface_m2"
                min="1"
                max="1000"
                step="1"
                inputmode="numeric"
                placeholder="50"
                class="w-32 h-14 px-4 border border-border rounded-md text-xl font-semibold bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
              />
              <span class="text-sm text-muted-foreground">m²</span>
            </div>
            <input
              type="range"
              v-model.number="form.surface_m2"
              min="1"
              max="300"
              step="1"
              class="w-full accent-safety"
            />
          </div>
        </div>

        <!-- ─── Step 4: Gamme ─────────────────────────────────────────────── -->
        <div v-else-if="step === 4" key="step4" class="space-y-4 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Quel niveau de prestation ?
          </h1>
          <div class="space-y-2 pt-2">
            <button
              v-for="g in gammes"
              :key="g.id"
              type="button"
              @click="selectGamme(g.id)"
              class="bento-card reveal-item w-full flex items-center justify-between p-4 border rounded-2xl text-left transition-colors min-h-11"
              :class="form.gamme === g.id
                ? 'border-orange-500 bg-orange-50 text-slate-900'
                : 'border-border hover:border-foreground/40 hover:bg-muted text-foreground'"
            >
              <div>
                <p class="text-sm font-semibold">{{ g.label }}</p>
                <p class="text-xs mt-0.5 text-muted-foreground">{{ g.desc }}</p>
              </div>
              <svg v-if="form.gamme === g.id" class="w-4 h-4 shrink-0 text-safety" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
              <div v-else class="w-4 h-4 rounded-full border border-border shrink-0" />
            </button>
          </div>
        </div>

        <!-- ─── Step 5: Code postal ───────────────────────────────────────── -->
        <div v-else-if="step === 5" key="step5" class="space-y-4 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Où se situe le chantier ?
          </h1>
          <p class="text-sm text-muted-foreground">
            Zone pilote actuelle : <strong class="text-foreground">Carrières-sous-Poissy (78955)</strong>.
          </p>
          <div class="pt-2 space-y-3">
            <input
              type="text"
              v-model="form.postal_code"
              placeholder="78955"
              maxlength="5"
              minlength="5"
              pattern="[0-9]{5}"
              required
              inputmode="numeric"
              @input="normalizePostalCode"
              class="w-full h-14 px-4 border border-border rounded-md text-xl font-semibold tracking-widest bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
            />
            <div
              v-if="form.postal_code.length === 5"
              class="flex items-start gap-3 p-4 border rounded-md"
              :class="form.postal_code === '78955'
                ? 'border-foreground/30 bg-muted'
                : 'border-red-200 bg-red-50'"
            >
              <svg v-if="form.postal_code === '78955'" class="w-4 h-4 shrink-0 mt-0.5 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
              <svg v-else class="w-4 h-4 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <div>
                <p class="text-sm font-semibold" :class="form.postal_code === '78955' ? 'text-foreground' : 'text-red-700'">
                  {{ form.postal_code === '78955' ? 'Zone éligible' : 'Cette zone n\'est pas encore couverte' }}
                </p>
                <p class="text-xs mt-0.5" :class="form.postal_code === '78955' ? 'text-muted-foreground' : 'text-red-600'">
                  {{ form.postal_code === '78955'
                    ? 'Le service est disponible à Carrières-sous-Poissy. Les artisans partenaires recevront votre demande.'
                    : 'BÂTI-AXE est en phase pilote sur Carrières-sous-Poissy (78955). Laissez vos coordonnées, nous vous recontactons dès l\'ouverture de votre secteur.' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Step 6: Lead Wall ─────────────────────────────────────────── -->
        <div v-else-if="step === 6" key="step6" class="space-y-5 reveal">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground" style="text-wrap: balance">
            Votre estimation est prête. À qui l'envoyons-nous ?
          </h1>
          <p class="text-sm text-muted-foreground">
            Recevez votre fourchette de prix par email et soyez mis en relation avec un artisan certifié près de chez vous.
          </p>

          <div class="space-y-4 pt-2">
            <div>
              <label for="c-name" class="block text-sm font-medium text-foreground mb-1.5">Nom complet</label>
              <input
                id="c-name"
                type="text"
                v-model="form.customer_name"
                placeholder="Jean Dupont"
                autocomplete="name"
                required
                minlength="2"
                maxlength="100"
                @blur="touched.name = true"
                class="w-full h-11 px-3 border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
                :class="contactErrors.name ? 'border-red-500' : 'border-border'"
              />
              <p v-if="contactErrors.name" class="mt-1.5 text-xs text-red-600">{{ contactErrors.name }}</p>
            </div>
            <div>
              <label for="c-email" class="block text-sm font-medium text-foreground mb-1.5">Adresse e-mail</label>
              <input
                id="c-email"
                type="email"
                v-model="form.customer_email"
                placeholder="jean.dupont@exemple.com"
                autocomplete="email"
                required
                maxlength="255"
                @blur="touched.email = true"
                class="w-full h-11 px-3 border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
                :class="contactErrors.email ? 'border-red-500' : 'border-border'"
              />
              <p v-if="contactErrors.email" class="mt-1.5 text-xs text-red-600">{{ contactErrors.email }}</p>
            </div>
            <div>
              <label for="c-phone" class="block text-sm font-medium text-foreground mb-1.5">Téléphone</label>
              <input
                id="c-phone"
                type="tel"
                v-model="form.customer_phone"
                placeholder="+33 6 12 34 56 78"
                autocomplete="tel"
                required
                maxlength="17"
                pattern="^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$"
                @input="normalizePhone"
                @blur="touched.phone = true"
                class="w-full h-11 px-3 border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
                :class="contactErrors.phone ? 'border-red-500' : 'border-border'"
              />
              <p v-if="contactErrors.phone" class="mt-1.5 text-xs text-red-600">{{ contactErrors.phone }}</p>
              <p v-else class="mt-1.5 text-xs text-muted-foreground">Format français (0612345678 ou +33612345678).</p>
            </div>
          </div>

          <div class="space-y-3 border-t border-border pt-5">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.cgu_accepted"
                class="mt-0.5 w-4 h-4 rounded border-border text-foreground"
              />
              <span class="text-sm text-foreground leading-snug">
                J'accepte les <NuxtLink to="/legal/cgu" target="_blank" class="underline underline-offset-2 hover:opacity-70">CGU</NuxtLink> et la <NuxtLink to="/legal/confidentialite" target="_blank" class="underline underline-offset-2 hover:opacity-70">politique de confidentialité</NuxtLink>. <span class="text-red-600">*</span>
              </span>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.sms_opt_in"
                class="mt-0.5 w-4 h-4 rounded border-border text-foreground"
              />
              <span class="text-sm text-muted-foreground leading-snug">
                J'accepte de recevoir des SMS de suivi sur ce projet. Désinscription par réponse STOP.
              </span>
            </label>
          </div>

          <div v-if="submitError" role="alert" class="flex items-start gap-2.5 p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <span>{{ submitError }}</span>
          </div>
        </div>

        </Transition>

        <!-- ─── Navigation ───────────────────────────────────────────────── -->
        <div class="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <button
            type="button"
            @click="prevStep"
            :disabled="step === 1 || isSubmitting"
            class="inline-flex items-center gap-1.5 h-10 px-4 border border-border text-sm font-medium text-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Retour
          </button>

          <!-- Continue button (steps needing explicit validation: 2, 3, 5; steps 1 and 4 auto-advance) -->
          <button
            v-if="step < totalSteps && step !== 1 && step !== 4"
            type="button"
            @click="nextStep"
            :disabled="!isStepValid"
            class="inline-flex items-center gap-1.5 h-10 px-5 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-30 disabled:pointer-events-none"
          >
            {{ step === totalSteps - 1 ? 'Voir mon estimation' : 'Suivant' }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <!-- Steps 1 and 4 auto-advance on click — show passive indicator -->
          <span v-else-if="step < totalSteps" class="text-xs text-muted-foreground">Sélectionnez une option</span>

          <!-- Submit button (Lead Wall) -->
          <button
            v-if="step === totalSteps"
            type="button"
            @click="handleSubmit"
            :disabled="!isStepValid || isSubmitting"
            class="inline-flex items-center gap-2 h-10 px-5 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <span>{{ isSubmitting ? 'Envoi en cours…' : 'Recevoir mon estimation gratuite' }}</span>
          </button>
        </div>

      </template>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
