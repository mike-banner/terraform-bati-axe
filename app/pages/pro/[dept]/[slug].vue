<script setup lang="ts">
const route  = useRoute()
const dept   = route.params.dept as string
const slug   = route.params.slug as string

const { data, error } = await useFetch(`/api/v1/pro/profile/${slug}`)

// 301 redirect if canonical slug differs
if (data.value?.needsRedirect && data.value?.canonicalSlug) {
  await navigateTo(`/pro/${dept}/${data.value.canonicalSlug}`, { redirectCode: 301, replace: true })
}

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })
}

const pro = computed(() => data.value?.pro)

const memberYear = computed(() => {
  if (!pro.value?.member_since) return null
  return new Date(pro.value.member_since).getFullYear()
})

useHead(() => ({
  title: pro.value ? `${pro.value.company_name} — Artisan vérifié BÂTI-AXE` : 'Artisan vérifié — BÂTI-AXE',
  meta: [
    { name: 'description', content: pro.value ? `${pro.value.company_name} est un artisan vérifié par BÂTI-AXE : décennale valide et Kbis contrôlés.` : '' }
  ]
}))
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-16 md:py-24">

    <div v-if="pro">
      <!-- Verified badge -->
      <div class="mb-8">
        <span
          v-if="pro.is_verified"
          class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-border rounded-full text-foreground"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          Vérifié BÂTI-AXE
        </span>
        <span v-else class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-border rounded-full text-muted-foreground">
          Vérification en cours
        </span>
      </div>

      <!-- Company name -->
      <h1 class="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-3" style="text-wrap: balance">
        {{ pro.company_name }}
      </h1>
      <p class="text-base text-muted-foreground mb-10">
        {{ pro.full_name }}
        <template v-if="memberYear"> · Membre depuis {{ memberYear }}</template>
      </p>

      <div class="border-t border-border" />

      <!-- Verification details -->
      <div class="py-10 space-y-4">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">Documents vérifiés</h2>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div
            class="w-8 h-8 flex items-center justify-center rounded-full shrink-0 mt-0.5"
            :class="pro.is_verified ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path v-if="pro.is_verified" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Assurance décennale</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              <template v-if="pro.decennal_status === 'valid'">Attestation contrôlée, date d'expiration vérifiée.</template>
              <template v-else-if="pro.decennal_status === 'expired'">Attestation expirée — en cours de renouvellement.</template>
              <template v-else>En attente de vérification.</template>
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div
            class="w-8 h-8 flex items-center justify-center rounded-full shrink-0 mt-0.5"
            :class="pro.is_verified ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path v-if="pro.is_verified" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Kbis de moins de 3 mois</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              <template v-if="pro.is_verified">Extrait officiel attestant de l'activité en cours.</template>
              <template v-else>En attente de vérification.</template>
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Zone d'intervention</p>
            <p class="text-xs text-muted-foreground mt-0.5">Code postal {{ pro.postal_code }} — confirmé à l'inscription.</p>
          </div>
        </div>
      </div>

      <div class="border-t border-border pt-10">
        <p class="text-sm text-muted-foreground mb-6" style="text-wrap: pretty">
          Vous avez un projet de travaux dans cette zone ? Décrivez votre projet en 3 minutes.
        </p>
        <NuxtLink
          to="/simulateur"
          class="inline-flex items-center gap-2 h-11 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity"
        >
          Décrire mon projet
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading state (should rarely show with SSR) -->
    <div v-else class="animate-pulse space-y-4">
      <div class="h-5 w-32 bg-muted rounded" />
      <div class="h-12 w-2/3 bg-muted rounded" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

  </div>
</template>
