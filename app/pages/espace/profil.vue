<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })
useHead({ title: 'Mon profil public — BÂTI-AXE' })

useRequireAuth()

const profile = reactive({
  bio: '',
  categories: [] as string[],
  zone: '',
  logo_url: '',
  canonical_slug: '',
  dept: '',
  company_name: '',
  phone: '',
})

const loading = ref(true)
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const logoError = ref('')
const logoUploading = ref(false)
const logoProgress = ref(0)
const logoStage = ref<'compress' | 'upload'>('compress')
const logoName = ref('')
const logoVersion = ref(0)
const logoFailed = ref(false)
// Affichage via le proxy serveur (bucket privé) ; ?v= force le rechargement après upload.
const logoSrc = computed(() =>
  profile.canonical_slug ? `/api/v1/pro/logo/${profile.canonical_slug}?v=${logoVersion.value}` : ''
)
const fetchError = ref(false)

const { refresh } = await useAsyncData('pro-profile-page', async () => {
  try {
    const data = await $fetch<{ profile: Record<string, unknown> }>('/api/v1/pro/profile/me')
    Object.assign(profile, {
      bio: data.profile.bio || '',
      categories: (data.profile.categories as string[]) || (data.profile.category ? [data.profile.category as string] : []),
      zone: data.profile.zone || '',
      logo_url: data.profile.logo_url || '',
      canonical_slug: data.profile.canonical_slug || '',
      dept: data.profile.dept || '',
      company_name: data.profile.company_name || '',
      phone: data.profile.phone || '',
    })
    fetchError.value = false
  } catch {
    fetchError.value = true
  } finally {
    loading.value = false
  }
  return null
}, { server: false })

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_SIZE = 5_242_880

// Compresse une image raster côté client : redimensionne à 512px max et
// réencode en WebP qualité 0.82. Un logo de plusieurs Mo tombe à ~20-50 Ko,
// l'upload devient quasi instantané. SVG (vectoriel) et GIF (animé) intacts.
async function compressImage(file: File): Promise<{ blob: Blob; type: string; name: string }> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return { blob: file, type: file.type, name: file.name }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Image invalide.'))
    i.src = dataUrl
  })
  const MAX_DIM = 512
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob: file, type: file.type, name: file.name }
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  // Si la compression échoue ou alourdit, on garde l'original.
  if (!blob || blob.size >= file.size) {
    return { blob: file, type: file.type, name: file.name }
  }
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return { blob, type: 'image/webp', name }
}

// PUT avec progression réelle : fetch n'expose pas la progression d'upload,
// XMLHttpRequest oui (xhr.upload.onprogress).
function putWithProgress(url: string, blob: Blob, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) logoProgress.value = Math.round((e.loaded / e.total) * 100)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(new Error('Échec du transfert.'))
    xhr.onerror = () => reject(new Error('Échec du transfert.'))
    xhr.send(blob)
  })
}

async function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  logoError.value = ''
  if (!ALLOWED_MIME.includes(file.type)) { logoError.value = 'Format non supporté.'; input.value = ''; return }
  if (file.size > MAX_SIZE) { logoError.value = 'Logo trop volumineux (5 Mo max).'; input.value = ''; return }

  logoUploading.value = true
  logoProgress.value = 0
  logoStage.value = 'compress'
  try {
    const { blob, type, name } = await compressImage(file)
    logoStage.value = 'upload'
    const presign = await $fetch<{ status: string; signedUrl: string; publicUrl: string }>(
      '/api/v1/pro/profile/logo-presign',
      { method: 'POST', body: { content_type: type, filename: name } }
    )
    await putWithProgress(presign.signedUrl, blob, type)
    logoName.value = file.name
    logoFailed.value = false
    logoVersion.value++ // cache-bust : recharge le logo via le proxy
    // L'affichage passe par le proxy serveur (logoSrc) qui sert le dernier logo
    // du bucket privé — indépendant de publicUrl. Si une URL publique existe, on la
    // stocke aussi dans logo_url (sinon on n'y touche pas pour éviter un 400).
    if (presign.publicUrl) {
      await $fetch('/api/v1/pro/profile/me', { method: 'PATCH', body: { logo_url: presign.publicUrl } })
      profile.logo_url = presign.publicUrl
    }
  } catch (e: any) {
    logoError.value = e?.message || 'Impossible de télécharger le logo. Réessayez.'
  } finally {
    logoUploading.value = false
    input.value = '' // permet de re-sélectionner le même fichier
  }
}

async function saveProfile() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/v1/pro/profile/me', {
      method: 'PATCH',
      body: { bio: profile.bio, categories: profile.categories, zone: profile.zone, phone: profile.phone }
    })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch {
    saveError.value = "Impossible d'enregistrer les modifications. Réessayez dans quelques instants."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-16">

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="h-20 w-20 rounded-lg bg-muted animate-pulse" />
      <div class="h-[120px] border border-border rounded-lg bg-muted animate-pulse" />
      <div class="h-10 border border-border rounded-lg bg-muted animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="p-4 border border-border rounded-lg">
      <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger votre profil</p>
      <p class="text-xs text-muted-foreground mb-3">Réessayez dans quelques instants.</p>
      <button @click="() => refresh()" class="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
        Réessayer
      </button>
    </div>

    <template v-else>

      <!-- Page header -->
      <div class="mb-12">
        <h1 class="text-4xl font-heading font-bold tracking-tight text-text">Mon profil public</h1>
        <p class="text-sm text-muted-foreground mt-1">Ces informations sont visibles sur votre page publique BÂTI-AXE.</p>
      </div>

      <!-- View public profile link -->
      <NuxtLink v-if="profile.canonical_slug" :to="`/pro/${profile.dept}/${profile.canonical_slug}`" target="_blank"
        class="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:opacity-70 transition-opacity mb-8">
        Voir mon profil public
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
        </svg>
      </NuxtLink>

      <!-- Logo upload -->
      <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
        <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Logo d'entreprise</h2>
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 border border-border rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="logoSrc && !logoFailed" :src="logoSrc" alt="Logo" class="w-full h-full object-cover" @error="logoFailed = true" />
            <svg v-else class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>
            </svg>
          </div>
          <div>
            <label class="inline-flex items-center gap-2 h-9 px-4 border border-slate-200 bg-white text-foreground text-xs font-semibold rounded-full hover:bg-muted transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              {{ logoUploading ? 'Téléchargement…' : "Choisir un logo d'entreprise" }}
              <input type="file" accept="image/*" class="sr-only" @change="handleLogoUpload" :disabled="logoUploading" />
            </label>
            <p class="text-xs text-muted-foreground mt-2">5 Mo max. JPG, PNG, WebP, GIF, SVG. L'image est compressée automatiquement.</p>

            <!-- Fichier actif -->
            <p v-if="logoName && !logoUploading" class="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
              <svg class="w-3 h-3 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <span class="font-mono">{{ logoName }}</span>
            </p>

            <!-- Progression -->
            <UploadProgress v-if="logoUploading" :stage="logoStage" :progress="logoProgress" class="mt-3" />
          </div>
        </div>
        <p v-if="logoError" class="text-xs text-destructive mt-2">{{ logoError }}</p>
      </div>

      <!-- Profile form -->
      <form @submit.prevent="saveProfile" class="space-y-6">

        <!-- Bio -->
        <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Présentation</h2>
          <textarea
            v-model="profile.bio"
            rows="4"
            placeholder="Décrivez votre activité, votre expérience et ce qui vous différencie…"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-text placeholder:text-gray-500 bg-white resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxlength="500"
          />
          <p class="text-xs text-muted-foreground mt-1 text-right">{{ profile.bio?.length ?? 0 }}/500</p>
        </div>

        <!-- Categories -->
        <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Catégories</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="maconnerie" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Maçonnerie &amp; Gros Œuvre</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="toiture" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Charpente &amp; Toiture</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="electricite" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Électricité</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="plomberie" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Plomberie &amp; Chauffage</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="peinture" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Peinture &amp; Finitions</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" v-model="profile.categories" value="isolation" class="rounded border-border text-cta focus:ring-primary/20 cursor-pointer">
              <span class="text-sm font-medium">Isolation &amp; Cloisons</span>
            </label>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">Vos catégories doivent correspondre aux travaux couverts par votre assurance décennale. En cas de sinistre hors couverture, votre responsabilité personnelle est engagée.</p>
        </div>

        <!-- Téléphone -->
        <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Téléphone</h2>
          <input
            v-model="profile.phone"
            type="tel"
            placeholder="06 11 22 33 44"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <p class="text-xs text-muted-foreground mt-1">Votre numéro sera visible sur votre profil public.</p>
        </div>

        <!-- Zone -->
        <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Zone d'intervention</h2>
          <input
            v-model="profile.zone"
            type="text"
            placeholder="Ex: Carrières-sous-Poissy, Poissy, Les Mureaux…"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxlength="200"
          />
        </div>

        <!-- Submit -->
        <div class="flex items-center justify-between gap-4 pt-2">
          <p v-if="saveSuccess" class="text-xs text-foreground font-semibold">
            Profil mis à jour. Les changements sont visibles sur votre page publique.
          </p>
          <p v-if="saveError" class="text-xs text-destructive">{{ saveError }}</p>
          <div class="ml-auto">
            <NuxtLink to="/app/dashboard"
              class="inline-flex items-center justify-center gap-2 h-11 px-6 border border-slate-200 bg-white text-foreground text-sm font-semibold rounded-full hover:bg-muted transition-colors mr-3">
              Annuler
            </NuxtLink>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center justify-center gap-2 h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-50">
              <span v-if="!saving">Enregistrer les modifications</span>
              <span v-else>Enregistrement…</span>
            </button>
          </div>
        </div>

      </form>

    </template>
  </div>
</template>
