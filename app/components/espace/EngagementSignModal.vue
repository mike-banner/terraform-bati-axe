<script setup lang="ts">
// Modale de signature électronique (convention cadre / avenant) : texte + case + code OTP.
// Aucun appel réseau : elle émet, la page orchestre.
const props = defineProps<{
  title: string
  contractHtml: string
  emailHint: string
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  sign: [code: string]
  resend: []
  cancel: []
}>()

const accepted = ref(false)
const code = ref('')
const canSign = computed(() => accepted.value && /^\d{6}$/.test(code.value) && !props.submitting)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="$emit('cancel')"
    @keydown="onKeydown"
  >
    <form
      class="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      @submit.prevent="canSign && emit('sign', code)"
    >
      <h2 class="text-base font-bold text-foreground">{{ title }}</h2>

      <!-- v-html sûr : HTML généré par le serveur (server/utils/contracts.ts), paramètres échappés -->
      <div class="max-h-[50vh] overflow-y-auto border border-border rounded-sm p-4 text-sm prose-sm" v-html="contractHtml" />

      <label class="flex items-start gap-2 text-sm text-foreground" for="engagement-accept">
        <input id="engagement-accept" v-model="accepted" type="checkbox" required class="mt-1">
        J'ai lu le document et j'accepte de le signer électroniquement
      </label>

      <p class="text-sm text-slate-600">Un code à 6 chiffres a été envoyé à {{ emailHint }}. Il est valable 10 minutes.</p>
      <div class="flex items-center gap-3">
        <input
          id="engagement-otp"
          v-model="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          pattern="\d{6}"
          required
          aria-label="Code de signature"
          class="h-11 w-40 px-3 border border-border rounded-sm text-center font-mono tracking-widest"
        >
        <button type="button" class="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground" @click="$emit('resend')">
          Renvoyer un code
        </button>
      </div>

      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          class="flex-1 h-11 px-4 border border-border rounded-full text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button
          type="submit"
          class="flex-1 h-11 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!canSign"
        >
          {{ submitting ? 'Signature…' : 'Signer' }}
        </button>
      </div>
    </form>
  </div>
</template>
