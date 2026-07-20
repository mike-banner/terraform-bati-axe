<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

definePageMeta({ layout: false })

const currentUser = useSupabaseUser()
const backTarget = computed(() => (currentUser.value ? '/espace/dashboard' : '/'))

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
  categories?: string[]
  is_verified: boolean
  is_claimed: boolean
  decennal_status: string
  siret_status: string | null
  siret_legal_form: string | null
  member_since: string
}

interface Realisation {
  id: string
  title: string
  city: string
  image_urls: string[]
  likes?: { count: number }[]
}

interface ProfileResponse {
  status: string
  needsRedirect: boolean
  canonicalSlug: string
  isAdmin: boolean
  pro: ProProfile
  verifications: Verification[]
  realisations: Realisation[]
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

if (error.value) {
  throw createError({ 
    statusCode: error.value.statusCode || 404, 
    statusMessage: error.value.statusMessage || 'Profil introuvable.',
    fatal: true
  })
}

if (!data.value?.pro) {
  throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.', fatal: true })
}

const pro          = computed(() => data.value?.pro)
const isAdmin      = computed(() => data.value?.isAdmin ?? false)
const verifications = computed(() => data.value?.verifications ?? [])
const realisations  = computed(() => data.value?.realisations ?? [])
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
  if (status === 'approved') return 'text-slate-700 bg-slate-100 border-slate-300'
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
  <div>

    <!-- Bouton flottant retour accueil (layout: false → pas de navbar générique) -->
    <button
      type="button"
      :aria-label="currentUser ? 'Retour à mon espace pro' : 'Retour à l\'accueil'"
      class="fixed top-4 left-4 z-50 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:-translate-y-0.5 transition-transform"
      @click="navigateTo(backTarget)"
    >
      <ArrowLeft class="w-6 h-6 text-slate-700" />
    </button>

    <div v-if="!pro || isAdmin || isPending" class="max-w-2xl mx-auto px-6 py-12 md:py-20">

      <!-- ── SKELETON ─────────────────────────────────────────────────────────── -->
      <div v-if="!pro" class="animate-pulse space-y-4">
      <div class="h-5 w-32 bg-muted rounded" />
      <div class="h-12 w-2/3 bg-muted rounded" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

    <!-- ── ADMIN FICHE ───────────────────────────────────────────────────────── -->
    <template v-else-if="isAdmin">

      <!-- Back link -->
      <NuxtLink to="/admin" class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors mb-8 group">
        <svg class="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
        Console de modération
      </NuxtLink>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full border"
              :class="pro.is_verified ? 'text-slate-700 bg-slate-100 border-slate-300' : 'text-amber-700 bg-amber-50 border-amber-200'"
            >
              {{ pro.is_verified ? 'Approuvé' : 'En attente' }}
            </span>
            <span v-if="pro.category" class="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500">
              {{ CATEGORY_LABELS[pro.category] ?? pro.category }}
            </span>
          </div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900">{{ pro.company_name }}</h1>
          <p class="text-sm text-slate-500 mt-1">{{ pro.full_name }}</p>
        </div>
      </div>

      <!-- Identity grid -->
      <div class="grid grid-cols-2 gap-3 mb-8">
        <div v-if="pro.email" class="p-4 bg-white border border-slate-200 rounded-2xl">
          <p class="text-xs text-slate-500 mb-1">E-mail</p>
          <p class="text-sm font-medium text-slate-900 break-all">{{ pro.email }}</p>
        </div>
        <div v-if="pro.phone" class="p-4 bg-white border border-slate-200 rounded-2xl">
          <p class="text-xs text-slate-500 mb-1">Téléphone</p>
          <p class="text-sm font-medium text-slate-900">{{ pro.phone }}</p>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-2xl">
          <p class="text-xs text-slate-500 mb-1">Corps de métier</p>
          <p class="text-sm font-medium text-slate-900">
            {{ pro.category ? (CATEGORY_LABELS[pro.category] ?? pro.category) : 'Non renseigné' }}
          </p>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-2xl">
          <p class="text-xs text-slate-500 mb-1">Inscrit le</p>
          <p class="text-sm font-medium text-slate-900">{{ memberDate }}</p>
        </div>
      </div>

      <!-- Documents -->
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900 mb-4">Documents déposés</h2>

        <div v-for="docType in (['kbis', 'decennale'] as const)" :key="docType">
          <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <!-- Doc header -->
            <div class="flex items-center justify-between px-4 py-3 bg-slate-50">
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
      <div class="flex items-center justify-center w-12 h-12 rounded-full border border-amber-200 bg-amber-50 mx-auto mb-6">
        <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full text-amber-700 bg-amber-50 border-amber-200 mb-4">
        En attente
      </span>
      <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-3">Profil en cours de vérification</h1>
      <p class="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
        {{ pro.company_name }} a déposé son dossier. Notre équipe vérifie les documents (Kbis, décennale) sous 24 heures ouvrées. Le profil sera visible dès validation.
      </p>
    </div>
    </div>

    <!-- ── PUBLIC VERIFIED PROFILE ───────────────────────────────────────────── -->
    <div v-else class="min-h-screen bg-slate-50 pb-20">
      
      <!-- HERO BANNER -->
      <div class="relative w-full h-[45vh] min-h-[380px] bg-slate-900 overflow-hidden flex items-end pb-12">
        <!-- Abstract gradient background -->
        <div class="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800"></div>
        <div class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-safety/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        <div class="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          
          <!-- Logo Container -->
          <div class="w-24 h-24 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden bg-white shadow-2xl shrink-0 flex items-center justify-center border-[6px] border-slate-900/50 relative z-20">
             <img v-if="pro!.logo_url" :src="pro!.logo_url" :alt="'Logo ' + pro!.company_name" class="w-full h-full object-contain p-4" />
             <div v-else class="text-4xl sm:text-6xl font-black text-slate-300">{{ pro!.company_name.charAt(0) }}</div>
          </div>

          <div class="flex-1">
            <!-- Badges -->
            <div class="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
               <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white bg-safety shadow-lg shadow-safety/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                Vérifié BÂTI-AXE
              </span>
              <span v-if="pro!.category || (pro!.categories && pro!.categories.length)" class="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full text-slate-200 bg-white/10 backdrop-blur-md border border-white/10">
                <template v-if="pro!.categories && pro!.categories.length">
                  {{ pro!.categories.map(c => CATEGORY_LABELS[c] ?? c).join(' - ') }}
                </template>
                <template v-else>
                  {{ CATEGORY_LABELS[pro!.category!] ?? pro!.category }}
                </template>
              </span>
            </div>

          <h1 class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-3 drop-shadow-sm" style="text-wrap: balance">
            {{ pro!.company_name }}
          </h1>
          <p class="text-lg md:text-xl text-slate-300 font-medium flex items-center gap-2">
            Dirigé par {{ pro!.full_name }}
            <span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            Membre {{ memberYear ? 'depuis ' + memberYear : 'vérifié' }}
            <template v-if="legalFormLabel(pro!.siret_legal_form)">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              {{ legalFormLabel(pro!.siret_legal_form) }}
            </template>
          </p>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="relative z-20 w-full max-w-6xl mx-auto px-6 lg:px-8 mt-12 sm:mt-16 space-y-12">
        
        <!-- À PROPOS / BIO -->
        <div class="bento-card p-8 sm:p-12 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mt-8">
          <h2 class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-6">À propos de l'entreprise</h2>
          <p class="text-base sm:text-lg md:text-xl text-slate-700 leading-relaxed whitespace-pre-wrap font-medium" style="text-wrap: balance">
            {{ pro!.bio || "L'artisan n'a pas encore rédigé de description pour présenter son activité." }}
          </p>
        </div>

        <!-- DOMAINE D'EXPERTISE (Anti-slop, factual) -->
        <div v-if="pro!.category || (pro!.categories && pro!.categories.length)" class="pt-2">
          <div class="bento-card relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <!-- Subtle background accent -->
            <div class="absolute top-0 right-0 w-[400px] h-[400px] bg-slate-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            
            <div class="relative z-10 flex-1">
              <h2 class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Domaine d'expertise</h2>
              <p class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6" style="text-wrap: balance">
                <template v-if="pro!.categories && pro!.categories.length">
                  {{ pro!.categories.map(c => CATEGORY_LABELS[c] ?? c).join(' & ') }}
                </template>
                <template v-else>
                  {{ CATEGORY_LABELS[pro!.category!] ?? pro!.category }}
                </template>
              </p>
              
              <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-700">Artisan Spécialisé</span>
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-700">Devis Détaillé</span>
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-700">Intervention sur site</span>
              </div>
            </div>
            
            <div class="relative z-10 shrink-0 hidden sm:block">
               <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10 transition-transform duration-700 ease-out">
                 <svg class="w-12 h-12 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053c.241-.295.42-.64.516-1.011l.142-.544a4.125 4.125 0 00-3.327-5.06l-.544-.141a3.125 3.125 0 00-1.01-.516l-3.054 2.492m10.604 8.441a2.654 2.654 0 01-3.75-3.751m-1.408-1.408l-3.054 2.492m10.604 8.441a2.654 2.654 0 01-3.75-3.751m-1.408-1.408l-3.054 2.492m10.604 8.441a2.654 2.654 0 01-3.75-3.751m-1.408-1.408l-3.054 2.492" />
                 </svg>
               </div>
            </div>
          </div>
        </div>


        <!-- PORTFOLIO GRID -->
        <div class="pt-4">
          <div class="flex items-end justify-between mb-10">
            <div>
              <h2 class="text-3xl font-black tracking-tight text-slate-900">Portfolio</h2>
              <p class="text-base text-slate-500 mt-2">Découvrez les derniers chantiers réalisés par l'entreprise.</p>
            </div>
          </div>

          <div v-if="realisations.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <RealisationCard v-for="project in realisations" :key="project.id" :project="project" />
          </div>

          <div v-else class="bento-card flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-[2.5rem]">
            <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
            </div>
            <p class="text-xl font-bold text-slate-900 mb-2">Galerie en construction</p>
            <p class="text-base text-slate-500 max-w-sm text-center">
              L'artisan n'a pas encore publié de photos de ses chantiers.
            </p>
          </div>
        </div>

        <!-- CTA BOTTOM (Lead Magnet) -->
        <div class="mt-8 relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-20 sm:px-12 sm:py-24 text-center shadow-2xl">
          <!-- Animated Background Glow -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-safety/10 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div class="relative z-10">
            <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-safety bg-safety/10 mb-6 uppercase tracking-widest">
              Passer à l'action
            </span>
            <h3 class="text-3xl md:text-5xl font-black text-white tracking-tight mb-6" style="text-wrap: balance">
              Besoin d'un professionnel comme {{ pro!.company_name }} ?
            </h3>
            <p class="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed" style="text-wrap: balance">
              Décrivez votre projet en 3 minutes et recevez des propositions chiffrées d'artisans certifiés sur votre secteur.
            </p>
            <NuxtLink
              to="/simulateur"
              class="inline-flex items-center gap-3 h-14 px-8 bg-safety text-white text-base font-bold rounded-full shadow-safety/20 shadow-xl transition-all duration-300"
            >
              Démarrer mon projet
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
