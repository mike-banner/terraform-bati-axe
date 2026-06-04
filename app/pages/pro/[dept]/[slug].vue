<script setup lang="ts">
interface ProProfile {
  id: string
  company_name: string
  full_name: string
  category: string | null
  is_verified: boolean
  is_claimed: boolean
  decennal_status: string
  member_since: string
}

interface ProfileResponse {
  status: string
  needsRedirect: boolean
  canonicalSlug: string
  pro: ProProfile
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:  'Maçonnerie & Gros Œuvre',
  toiture:     'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie:   'Plomberie & Chauffage',
  peinture:    'Peinture & Finitions',
  isolation:   'Isolation & Cloisons',
}

const route = useRoute()
const dept  = route.params.dept as string
const slug  = route.params.slug as string

const { data, error } = await useFetch<ProfileResponse>(`/api/v1/pro/profile/${slug}`)

if (data.value?.needsRedirect && data.value?.canonicalSlug) {
  await navigateTo(`/pro/${dept}/${data.value.canonicalSlug}`, { redirectCode: 301, replace: true })
}

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })
}

const pro = computed(() => data.value?.pro)
const isPending = computed(() => !!pro.value && !pro.value.is_verified)

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

    <!-- Pending state -->
    <div v-if="isPending" class="py-8 text-center">
      <div class="flex items-center justify-center w-12 h-12 rounded-full border border-border mx-auto mb-6">
        <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h1 class="text-2xl font-black tracking-tight text-foreground mb-3">Profil en cours de vérification</h1>
      <p class="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {{ pro!.company_name }} a déposé son dossier. Notre équipe vérifie les documents (Kbis, décennale) sous 24 heures ouvrées. Le profil sera visible dès validation.
      </p>
    </div>

    <!-- Verified profile -->
    <div v-else-if="pro">

      <!-- Badge -->
      <div class="mb-8">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-border rounded-full text-foreground">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          Vérifié BÂTI-AXE
        </span>
        <span v-if="pro.category" class="ml-2 inline-flex items-center text-xs px-3 py-1.5 border border-border rounded-full text-muted-foreground">
          {{ CATEGORY_LABELS[pro.category] ?? pro.category }}
        </span>
      </div>

      <!-- Identity -->
      <h1 class="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-3" style="text-wrap: balance">
        {{ pro.company_name }}
      </h1>
      <p class="text-base text-muted-foreground mb-10">
        {{ pro.full_name }}
        <template v-if="memberYear"> · Membre depuis {{ memberYear }}</template>
      </p>

      <div class="border-t border-border" />

      <!-- Verified documents -->
      <div class="py-10 space-y-4">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">Documents vérifiés</h2>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Assurance décennale</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              <template v-if="pro.decennal_status === 'valid'">Attestation contrôlée, date d'expiration vérifiée.</template>
              <template v-else-if="pro.decennal_status === 'expired'">Attestation expirée — en cours de renouvellement.</template>
              <template v-else>Vérifiée à l'inscription.</template>
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
            <p class="text-sm font-semibold text-foreground">Kbis de moins de 3 mois</p>
            <p class="text-xs text-muted-foreground mt-0.5">Extrait officiel attestant de l'activité en cours.</p>
          </div>
        </div>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Zone d'intervention confirmée</p>
            <p class="text-xs text-muted-foreground mt-0.5">Secteur géographique vérifié à l'inscription.</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
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

    <!-- Skeleton -->
    <div v-else class="animate-pulse space-y-4">
      <div class="h-5 w-32 bg-muted rounded" />
      <div class="h-12 w-2/3 bg-muted rounded" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

  </div>
</template>
