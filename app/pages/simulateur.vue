<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { 
  Wrench, 
  Home, 
  Bolt, 
  Droplet, 
  Paintbrush, 
  Shield, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2 
} from 'lucide-vue-next'

// Page Metadata for SEO & Layout
useHead({
  title: 'Simulateur de Travaux — BÂTI-AXE',
  meta: [
    { name: 'description', content: 'Estimez vos travaux et trouvez le professionnel idéal à Carrières-sous-Poissy.' }
  ]
})

// Categories definitions
const categories = [
  { id: 'maconnerie', label: 'Maçonnerie & Gros Œuvre', icon: Wrench, desc: 'Murs, dalles, extensions gros œuvre' },
  { id: 'toiture', label: 'Charpente & Toiture', icon: Home, desc: 'Couverture, tuiles, étanchéité' },
  { id: 'electricite', label: 'Électricité', icon: Bolt, desc: 'Mise aux normes, prises, tableau électrique' },
  { id: 'plomberie', label: 'Plomberie & Chauffage', icon: Droplet, desc: 'Tuyauterie, sanitaires, chaudières' },
  { id: 'peinture', label: 'Peinture & Finitions', icon: Paintbrush, desc: 'Murs, plafonds, revêtements' },
  { id: 'isolation', label: 'Isolation & Cloisons', icon: Shield, desc: 'Placo, isolation combles/murs' }
]

// Budget options
const budgetRanges = [
  { id: '< 5k', label: 'Moins de 5 000 €' },
  { id: '5k-15k', label: '5 000 € à 15 000 €' },
  { id: '15k-30k', label: '15 000 € à 30 000 €' },
  { id: '30k-75k', label: '30 000 € à 75 000 €' },
  { id: '> 75k', label: 'Plus de 75 000 €' }
]

// Simulator state
const step = ref(1)
const totalSteps = 6
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const createdProjectId = ref<string | null>(null)

// Form data
const form = reactive({
  category: '',
  description: '',
  budget_range: '',
  postal_code: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  cgu_accepted: false,
  sms_opt_in: false
})

// Validation per step
const isStepValid = computed(() => {
  switch (step.value) {
    case 1:
      return !!form.category
    case 2:
      return form.description.trim().length >= 20
    case 3:
      return !!form.budget_range
    case 4:
      return form.postal_code === '78955' // Phase 2: only pilot zone Carrières-sous-Poissy
    case 5:
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/
      return (
        form.customer_name.trim().length >= 2 &&
        emailRegex.test(form.customer_email) &&
        phoneRegex.test(form.customer_phone)
      )
    case 6:
      return form.cgu_accepted
    default:
      return false
  }
})

// Progress percentage
const progress = computed(() => Math.round(((step.value - 1) / totalSteps) * 100))

// Actions
const selectCategory = (catId: string) => {
  form.category = catId
  nextStep()
}

const selectBudget = (budget: string) => {
  form.budget_range = budget
  nextStep()
}

const nextStep = () => {
  if (step.value < totalSteps && isStepValid.value) {
    step.value++
    submitError.value = null
  }
}

const prevStep = () => {
  if (step.value > 1) {
    step.value--
    submitError.value = null
  }
}

const handleSubmit = async () => {
  if (!isStepValid.value) return
  
  isSubmitting.value = true
  submitError.value = null
  
  try {
    const { data, error } = await useFetch('/api/v1/projects', {
      method: 'POST',
      body: {
        category: form.category,
        description: form.description,
        budget_range: form.budget_range,
        postal_code: form.postal_code,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        cgu_accepted: form.cgu_accepted,
        sms_opt_in: form.sms_opt_in
      }
    })

    if (error.value) {
      const errorMessage = error.value.data?.data?.message || error.value.statusMessage || "Une erreur est survenue lors de la soumission."
      throw new Error(errorMessage)
    }

    if (data.value && data.value.status === 'SUCCESS') {
      createdProjectId.value = data.value.projectId
      submitSuccess.value = true
      step.value = 7 // Success screen
    }
  } catch (err: any) {
    submitError.value = err.message || 'Une erreur serveur est survenue. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <!-- Glow effects in background -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

    <div class="w-full max-w-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative">
      <!-- Top animated progress line -->
      <div 
        class="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
        :style="{ width: `${progress}%` }"
      ></div>

      <!-- Main simulator content wrapper -->
      <div class="p-6 md:p-10">
        <!-- Header -->
        <div class="mb-8 flex justify-between items-center" v-if="step <= totalSteps">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-indigo-400">Étape {{ step }} sur {{ totalSteps }}</span>
            <h1 class="text-xl font-bold tracking-tight text-white mt-1">Estimez votre projet</h1>
          </div>
          <NuxtLink to="/" class="text-xs text-zinc-400 hover:text-white transition-colors">
            Annuler
          </NuxtLink>
        </div>

        <!-- Step 1: Work Category -->
        <div v-if="step === 1" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Quel est le type de travaux ?</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              @click="selectCategory(cat.id)"
              class="flex items-start gap-4 p-4 rounded-xl border bg-zinc-900/50 hover:bg-zinc-800/80 text-left transition-all group duration-200"
              :class="form.category === cat.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/20' : 'border-zinc-800 hover:border-zinc-700'"
            >
              <div class="p-3 rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200 shrink-0">
                <component :is="cat.icon" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">{{ cat.label }}</h3>
                <p class="text-xs text-zinc-400 mt-1 line-clamp-2">{{ cat.desc }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 2: Description -->
        <div v-if="step === 2" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Décrivez brièvement votre projet</h2>
          <p class="text-sm text-zinc-400">
            Détaillez le type de prestation, la surface approximative, et les contraintes éventuelles.
          </p>
          <div class="relative">
            <textarea 
              v-model="form.description"
              rows="6"
              maxlength="1000"
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Exemple: Je souhaite refaire entièrement l'électricité de mon appartement de 55m². Le tableau électrique est d'époque et à changer entièrement. Prévoir environ 15 prises et 8 points lumineux..."
            ></textarea>
            <div class="absolute bottom-3 right-3 text-xs" :class="form.description.length >= 20 ? 'text-zinc-500' : 'text-amber-500 font-medium'">
              {{ form.description.length }} / 20 caractères min
            </div>
          </div>
        </div>

        <!-- Step 3: Budget Range -->
        <div v-if="step === 3" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Quel est le budget estimé ?</h2>
          <div class="space-y-3">
            <button 
              v-for="b in budgetRanges" 
              :key="b.id"
              @click="selectBudget(b.id)"
              class="w-full flex items-center justify-between p-4 rounded-xl border bg-zinc-900/50 hover:bg-zinc-800/80 text-left transition-all duration-200"
              :class="form.budget_range === b.id ? 'border-indigo-500 bg-indigo-950/20 text-white font-medium' : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'"
            >
              <span>{{ b.label }}</span>
              <div 
                class="w-5 h-5 rounded-full border flex items-center justify-center transition-colors"
                :class="form.budget_range === b.id ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-700'"
              >
                <div class="w-2.5 h-2.5 rounded-full bg-white" v-if="form.budget_range === b.id"></div>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 4: Zip Code / Location -->
        <div v-if="step === 4" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Où se situent les travaux ?</h2>
          <p class="text-sm text-zinc-400">
            Pendant la phase de lancement pilote, le service est disponible uniquement sur la commune de <strong>Carrières-sous-Poissy (78955)</strong>.
          </p>
          <div class="space-y-4">
            <div class="relative">
              <input 
                type="text" 
                v-model="form.postal_code"
                placeholder="Ex: 78955"
                maxlength="5"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-lg font-semibold tracking-widest placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            
            <!-- Cover Alert -->
            <div 
              v-if="form.postal_code.length === 5"
              class="p-4 rounded-xl flex items-start gap-3 transition-all"
              :class="form.postal_code === '78955' ? 'bg-emerald-950/30 border border-emerald-900 text-emerald-300' : 'bg-amber-950/30 border border-amber-900 text-amber-300'"
            >
              <CheckCircle2 class="w-5 h-5 shrink-0 mt-0.5" v-if="form.postal_code === '78955'" />
              <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5" v-else />
              <div>
                <p class="font-semibold text-sm" v-if="form.postal_code === '78955'">Zone pilote éligible !</p>
                <p class="font-semibold text-sm" v-else>Zone non couverte</p>
                <p class="text-xs opacity-90 mt-0.5">
                  {{ form.postal_code === '78955' 
                    ? 'Le service est entièrement disponible à Carrières-sous-Poissy. Nos artisans partenaires locaux recevront votre demande.' 
                    : 'Le simulateur est restreint à la ville de Carrières-sous-Poissy (78955) pour l\'instant.' 
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5: Contact Identity -->
        <div v-if="step === 5" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Vos coordonnées</h2>
          <p class="text-sm text-zinc-400">
            Ces coordonnées permettront de vous contacter pour qualifier votre demande et vous mettre en relation avec l'artisan.
          </p>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nom Complet</label>
              <input 
                type="text" 
                v-model="form.customer_name"
                placeholder="Jean Dupont"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Adresse E-mail</label>
              <input 
                type="email" 
                v-model="form.customer_email"
                placeholder="jean.dupont@exemple.com"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Numéro de Téléphone</label>
              <input 
                type="tel" 
                v-model="form.customer_phone"
                placeholder="06 12 34 56 78"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span class="text-[10px] text-zinc-500 mt-1 block">Format français (ex: 0612345678 ou +33612345678)</span>
            </div>
          </div>
        </div>

        <!-- Step 6: Confirmation & Consentements -->
        <div v-if="step === 6" class="space-y-6">
          <h2 class="text-lg font-medium text-white">Dernière étape : validation</h2>
          <p class="text-sm text-zinc-400">
            En soumettant votre projet, vous acceptez nos conditions et autorisez la mise en relation.
          </p>

          <div class="space-y-4 border-t border-zinc-800 pt-6">
            <!-- Consent CGU -->
            <label class="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                v-model="form.cgu_accepted" 
                class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
              <span class="text-xs text-zinc-300 select-none group-hover:text-white transition-colors">
                J'accepte les <NuxtLink to="/legal/cgu" target="_blank" class="text-indigo-400 underline hover:text-indigo-300">Conditions Générales d'Utilisation</NuxtLink> et consens au traitement de mes données conformément à la <NuxtLink to="/legal/confidentialite" target="_blank" class="text-indigo-400 underline hover:text-indigo-300">Politique de Confidentialité</NuxtLink>. <span class="text-red-500">*</span>
              </span>
            </label>

            <!-- Consent SMS Opt-In -->
            <label class="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                v-model="form.sms_opt_in" 
                class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
              <span class="text-xs text-zinc-300 select-none group-hover:text-white transition-colors">
                J'accepte de recevoir des notifications et alertes de suivi de mon projet par SMS. (Désinscription possible à tout moment en répondant STOP).
              </span>
            </label>
          </div>

          <!-- Final Server Error Display -->
          <div v-if="submitError" class="p-4 rounded-xl bg-red-950/30 border border-red-900 text-red-300 flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
            <div class="text-sm font-medium">{{ submitError }}</div>
          </div>
        </div>

        <!-- Step 7: Success Page -->
        <div v-if="step === 7" class="text-center py-10 space-y-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-bounce">
            <CheckCircle2 class="w-10 h-10" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white tracking-tight">Projet enregistré avec succès !</h2>
            <p class="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
              Merci pour votre confiance. Votre projet a été qualifié pour la zone de <strong>Carrières-sous-Poissy</strong>. Nos artisans partenaires vont être notifiés.
            </p>
          </div>
          <div class="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl max-w-sm mx-auto text-xs text-zinc-400">
            Identifiant du projet : <code class="font-mono text-zinc-200 select-all">{{ createdProjectId }}</code>
          </div>
          <div class="pt-4">
            <NuxtLink to="/" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all duration-200">
              Retour à l'accueil
            </NuxtLink>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="mt-8 pt-6 border-t border-zinc-800/80 flex items-center justify-between" v-if="step <= totalSteps">
          <button 
            type="button"
            @click="prevStep"
            class="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            :disabled="step === 1 || isSubmitting"
          >
            <span class="flex items-center gap-1"><ArrowLeft class="w-4 h-4" /> Retour</span>
          </button>

          <button 
            v-if="step < totalSteps"
            type="button"
            @click="nextStep"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            :disabled="!isStepValid"
          >
            Continuer <ArrowRight class="w-4 h-4" />
          </button>

          <button 
            v-else
            type="button"
            @click="handleSubmit"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            :disabled="!isStepValid || isSubmitting"
          >
            <Loader2 class="w-4 h-4 animate-spin" v-if="isSubmitting" />
            <span v-else>Soumettre mon projet</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transition between steps styling */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
