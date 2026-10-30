<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

useHead({
  title: 'Réinitialiser votre mot de passe — BÂTI-AXE',
  meta: [{ name: 'robots', content: 'noindex' }],
})

// Page publique : surtout PAS de useRequireAuth() ni de watchEffect sur user —
// ils éjecteraient le pro avant que le SDK ait échangé le lien contre une session de récupération.
const supabase = useSupabaseClient()
const route = useRoute()

// Même règle que claim.vue (72 = limite bcrypt)
const RE_PASSWORD = /^.{8,72}$/

const status = ref<'waiting' | 'ready' | 'expired' | 'success'>('waiting')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const formError = ref<string | null>(null)
const isLoading = ref(false)

let subscription: { unsubscribe(): void } | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  // GoTrue renvoie l'erreur (lien expiré / déjà utilisé) en query ou en hash selon le flux
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const errorCode = (route.query.error_code as string) || hashParams.get('error_code')
  if (errorCode) { status.value = 'expired'; return }

  // L'échange du lien peut émettre PASSWORD_RECOVERY ou SIGNED_IN selon le flux (PKCE / implicite)
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') status.value = 'ready'
  })
  subscription = data.subscription

  // Filet : l'échange est asynchrone, ne conclure « expiré » qu'après un délai
  fallbackTimer = setTimeout(async () => {
    if (status.value !== 'waiting') return
    const { data: { session } } = await supabase.auth.getSession()
    status.value = session ? 'ready' : 'expired'
  }, 2500)
})

onUnmounted(() => {
  subscription?.unsubscribe()
  if (fallbackTimer) clearTimeout(fallbackTimer)
})

async function submitNewPassword() {
  formError.value = null
  if (!RE_PASSWORD.test(password.value)) { formError.value = 'Le mot de passe doit contenir entre 8 et 72 caractères.'; return }
  if (password.value !== passwordConfirm.value) { formError.value = 'Les deux mots de passe ne correspondent pas.'; return }
  isLoading.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  isLoading.value = false
  if (error) { formError.value = 'Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré : demandez-en un nouveau.'; return }
  status.value = 'success'
  await supabase.auth.signOut()   // ne pas laisser traîner la session de récupération
  setTimeout(() => navigateTo('/pro/claim'), 2500)
}
</script>

<template>
  <div class="min-h-[70vh] flex items-start justify-center px-4 py-16">
    <div class="w-full max-w-md">
      <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">Espace artisan</p>

      <!-- En attente de l'échange du lien -->
      <div v-if="status === 'waiting'" class="flex items-center gap-3">
        <svg class="w-5 h-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <h1 class="text-2xl font-black tracking-tight text-foreground">Vérification du lien…</h1>
      </div>

      <!-- Saisie du nouveau mot de passe -->
      <form v-else-if="status === 'ready'" class="space-y-5" @submit.prevent="submitNewPassword">
        <h1 class="text-2xl font-black tracking-tight text-foreground">Choisissez un nouveau mot de passe</h1>

        <div>
          <label for="new-password" class="block text-sm font-medium text-foreground mb-1.5">Nouveau mot de passe</label>
          <div class="relative">
            <input
              id="new-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              minlength="8"
              maxlength="72"
              autocomplete="new-password"
              required
              class="w-full h-11 px-3 pr-10 border border-border rounded-sm text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Masquer' : 'Afficher' }}
            </button>
          </div>
          <p class="mt-1.5 text-xs text-muted-foreground">8 caractères minimum.</p>
        </div>

        <div>
          <label for="new-password-confirm" class="block text-sm font-medium text-foreground mb-1.5">Confirmation</label>
          <input
            id="new-password-confirm"
            v-model="passwordConfirm"
            :type="showPassword ? 'text' : 'password'"
            minlength="8"
            maxlength="72"
            autocomplete="new-password"
            required
            class="w-full h-11 px-3 border border-border rounded-sm text-sm bg-white text-text placeholder:text-gray-500 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div v-if="formError" role="alert" class="p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          {{ formError }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full h-12 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-50"
        >
          {{ isLoading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe' }}
        </button>
      </form>

      <!-- Lien expiré ou déjà utilisé -->
      <div v-else-if="status === 'expired'" class="space-y-4">
        <h1 class="text-2xl font-black tracking-tight text-foreground">Ce lien n'est plus valide</h1>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Les liens de réinitialisation expirent au bout d'une heure et ne peuvent servir qu'une seule fois.
          Demandez-en un nouveau depuis la page de connexion.
        </p>
        <NuxtLink to="/pro/claim" class="inline-flex items-center h-11 px-6 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
          Retour à la connexion
        </NuxtLink>
      </div>

      <!-- Succès -->
      <div v-else role="status" class="space-y-3">
        <h1 class="text-2xl font-black tracking-tight text-foreground">Mot de passe mis à jour.</h1>
        <p class="text-sm text-muted-foreground">Vous allez être redirigé vers la connexion.</p>
      </div>
    </div>
  </div>
</template>
