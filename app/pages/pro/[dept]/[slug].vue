<script setup lang="ts">
interface Verification {
  id: string
  document_type: 'kbis' | 'decennale'
  file_key: string
  status: 'pending' | 'approved' | 'rejected'
  expiry_date: string | null
  reviewed_at: string | null
  created_at: string
}

interface ProProfile {
  id: string
  company_name: string
  full_name: string
  email: string | null
  phone: string | null
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
  isAdmin: boolean
  pro: ProProfile
  verifications: Verification[]
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:  'Maçonnerie & Gros Œuvre',
  toiture:     'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie:   'Plomberie & Chauffage',
  peinture:    'Peinture & Finitions',
  isolation:   'Isolation & Cloisons',
}

const DOC_LABELS: Record<string, string> = {
  kbis:      'Extrait KBIS',
  decennale: 'Assurance décennale',
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

const pro          = computed(() => data.value?.pro)
const isAdmin      = computed(() => data.value?.isAdmin ?? false)
const verifications = computed(() => data.value?.verifications ?? [])
const isPending    = computed(() => !!pro.value && !pro.value.is_verified)

const memberYear = computed(() => {
  if (!pro.value?.member_since) return null
  return new Date(pro.value.member_since).getFullYear()
})

const memberDate = computed(() => {
  if (!pro.value?.member_since) return null
  return new Date(pro.value.member_since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
})

function docFor(type: 'kbis' | 'decennale') {
  return verifications.value.find(v => v.document_type === type) ?? null
}

const docViewLoading = ref<string | null>(null)
const docViewError   = ref<string | null>(null)

async function openDocument(fileKey: string) {
  docViewLoading.value = fileKey
  docViewError.value   = null
  try {
    const data = await $fetch<{ signedUrl: string }>('/api/v1/pro/documents/view', {
      method: 'POST', body: { file_key: fileKey }
    })
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else throw new Error('Lien indisponible.')
  } catch (err: any) {
    docViewError.value = err.data?.statusMessage || err.message
  } finally {
    docViewLoading.value = null
  }
}

function statusColor(status: string) {
  if (status === 'approved') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (status === 'rejected') return 'text-red-700 bg-red-50 border-red-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}

function statusLabel(status: string) {
  if (status === 'approved') return 'Validé'
  if (status === 'rejected') return 'Rejeté'
  return 'En attente'
}

useHead(() => ({
  title: pro.value
    ? isAdmin.value
      ? `Dossier — ${pro.value.company_name} · Admin BÂTI-AXE`
      : `${pro.value.company_name} — Artisan vérifié BÂTI-AXE`
    : 'Artisan vérifié — BÂTI-AXE',
  meta: [
    { name: 'robots', content: isAdmin.value ? 'noindex' : 'index, follow' },
    { name: 'description', content: pro.value && !isAdmin.value
        ? `${pro.value.company_name} est un artisan vérifié par BÂTI-AXE : décennale valide et Kbis contrôlés.`
        : '' }
  ]
}))
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-12 md:py-20">

    <!-- ── SKELETON ─────────────────────────────────────────────────────────── -->
    <div v-if="!pro" class="animate-pulse space-y-4">
      <div class="h-5 w-32 bg-muted rounded" />
      <div class="h-12 w-2/3 bg-muted rounded" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

    <!-- ── ADMIN FICHE ───────────────────────────────────────────────────────── -->
    <template v-else-if="isAdmin">

      <!-- Back link -->
      <NuxtLink to="/admin" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8 group">
        <svg class="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
        Console de modération
      </NuxtLink>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full border"
              :class="pro.is_verified ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'"
            >
              {{ pro.is_verified ? 'Approuvé' : 'En attente' }}
            </span>
            <span v-if="pro.category" class="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {{ CATEGORY_LABELS[pro.category] ?? pro.category }}
            </span>
          </div>
          <h1 class="text-2xl font-black tracking-tight text-foreground">{{ pro.company_name }}</h1>
          <p class="text-sm text-muted-foreground mt-1">{{ pro.full_name }}</p>
        </div>
      </div>

      <!-- Identity grid -->
      <div class="grid grid-cols-2 gap-3 mb-8">
        <div v-if="pro.email" class="p-4 border border-border rounded-lg">
          <p class="text-xs text-muted-foreground mb-1">E-mail</p>
          <p class="text-sm font-medium text-foreground break-all">{{ pro.email }}</p>
        </div>
        <div v-if="pro.phone" class="p-4 border border-border rounded-lg">
          <p class="text-xs text-muted-foreground mb-1">Téléphone</p>
          <p class="text-sm font-medium text-foreground">{{ pro.phone }}</p>
        </div>
        <div class="p-4 border border-border rounded-lg">
          <p class="text-xs text-muted-foreground mb-1">Corps de métier</p>
          <p class="text-sm font-medium text-foreground">
            {{ pro.category ? (CATEGORY_LABELS[pro.category] ?? pro.category) : 'Non renseigné' }}
          </p>
        </div>
        <div class="p-4 border border-border rounded-lg">
          <p class="text-xs text-muted-foreground mb-1">Inscrit le</p>
          <p class="text-sm font-medium text-foreground">{{ memberDate }}</p>
        </div>
      </div>

      <!-- Documents -->
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-foreground mb-4">Documents déposés</h2>

        <div v-for="docType in (['kbis', 'decennale'] as const)" :key="docType">
          <div class="border border-border rounded-lg overflow-hidden">

            <!-- Doc header -->
            <div class="flex items-center justify-between px-4 py-3 bg-muted/40">
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                <span class="text-sm font-semibold text-foreground">{{ DOC_LABELS[docType] }}</span>
              </div>
              <span
                v-if="docFor(docType)"
                class="text-xs font-medium px-2.5 py-0.5 rounded-full border"
                :class="statusColor(docFor(docType)!.status)"
              >
                {{ statusLabel(docFor(docType)!.status) }}
              </span>
              <span v-else class="text-xs text-muted-foreground">Non déposé</span>
            </div>

            <!-- Doc body -->
            <div v-if="docFor(docType)" class="px-4 py-3 space-y-2">
              <!-- Expiry date (décennale only) -->
              <div v-if="docType === 'decennale' && docFor(docType)?.expiry_date" class="flex items-center gap-2 text-xs text-muted-foreground">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/></svg>
                Expire le {{ new Date(docFor(docType)!.expiry_date!).toLocaleDateString('fr-FR') }}
              </div>

              <!-- Reviewed at -->
              <div v-if="docFor(docType)?.reviewed_at" class="flex items-center gap-2 text-xs text-muted-foreground">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Vérifié le {{ new Date(docFor(docType)!.reviewed_at!).toLocaleDateString('fr-FR') }}
              </div>

              <!-- Open doc button -->
              <div v-if="docFor(docType)?.file_key && !docFor(docType)?.file_key.startsWith('manual')" class="pt-1">
                <button
                  @click="openDocument(docFor(docType)!.file_key)"
                  :disabled="docViewLoading === docFor(docType)!.file_key"
                  class="inline-flex items-center gap-1.5 h-8 px-3 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <svg v-if="docViewLoading === docFor(docType)!.file_key" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                  Ouvrir le document
                </button>
              </div>
            </div>

            <!-- Not submitted -->
            <div v-else class="px-4 py-3">
              <p class="text-xs text-muted-foreground">Aucun document déposé pour cette catégorie.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <p v-if="docViewError" class="mt-4 text-xs text-red-600">{{ docViewError }}</p>

    </template>

    <!-- ── PENDING (public) ──────────────────────────────────────────────────── -->
    <div v-else-if="isPending" class="py-8 text-center">
      <div class="flex items-center justify-center w-12 h-12 rounded-full border border-border mx-auto mb-6">
        <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h1 class="text-2xl font-black tracking-tight text-foreground mb-3">Profil en cours de vérification</h1>
      <p class="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {{ pro.company_name }} a déposé son dossier. Notre équipe vérifie les documents (Kbis, décennale) sous 24 heures ouvrées. Le profil sera visible dès validation.
      </p>
    </div>

    <!-- ── PUBLIC VERIFIED PROFILE ───────────────────────────────────────────── -->
    <div v-else>

      <!-- Badge -->
      <div class="mb-8">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-border rounded-full text-foreground">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          Vérifié BÂTI-AXE
        </span>
        <span v-if="pro!.category" class="ml-2 inline-flex items-center text-xs px-3 py-1.5 border border-border rounded-full text-muted-foreground">
          {{ CATEGORY_LABELS[pro!.category] ?? pro!.category }}
        </span>
      </div>

      <!-- Identity -->
      <h1 class="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-3" style="text-wrap: balance">
        {{ pro!.company_name }}
      </h1>
      <p class="text-base text-muted-foreground mb-10">
        {{ pro!.full_name }}
        <template v-if="memberYear"> · Membre depuis {{ memberYear }}</template>
      </p>

      <div class="border-t border-border" />

      <!-- Verified documents -->
      <div class="py-10 space-y-4">
        <h2 class="text-sm font-semibold text-foreground mb-6">Documents vérifiés</h2>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Assurance décennale</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              <template v-if="pro!.decennal_status === 'valid'">Attestation contrôlée, date d'expiration vérifiée.</template>
              <template v-else-if="pro!.decennal_status === 'expired'">Attestation expirée, en cours de renouvellement.</template>
              <template v-else>Vérifiée à l'inscription.</template>
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">Kbis de moins de 3 mois</p>
            <p class="text-xs text-muted-foreground mt-0.5">Extrait officiel attestant de l'activité en cours.</p>
          </div>
        </div>

        <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
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
          Projet de travaux dans cette zone ? Décrivez-le en 3 minutes et recevez des devis d'artisans vérifiés.
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

  </div>
</template>
