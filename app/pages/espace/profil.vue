<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })
useHead({ title: 'Mon profil public — BÂTI-AXE' })

const user = useSupabaseUser()

watchEffect(() => { if (user.value === null) navigateTo('/pro/claim') })

const profile = reactive({
  bio: '',
  category: '',
  zone: '',
  logo_url: '',
  canonical_slug: '',
  dept: '',
  company_name: '',
})

const loading = ref(true)
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const logoError = ref('')
const logoUploading = ref(false)
const fetchError = ref(false)

const { refresh } = await useAsyncData('pro-profile', async () => {
  try {
    const data = await $fetch<{ profile: Record<string, unknown> }>('/api/v1/pro/profile/me')
    Object.assign(profile, data.profile)
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

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoError.value = ''
  if (file.size > MAX_SIZE) { logoError.value = 'Logo trop volumineux (5 Mo max).'; return }
  if (!ALLOWED_MIME.includes(file.type)) { logoError.value = 'Format non supporté.'; return }
  logoUploading.value = true
  try {
    const presign = await $fetch<{ status: string; signedUrl: string; publicUrl: string }>(
      '/api/v1/pro/profile/logo-presign',
      { method: 'POST', body: { content_type: file.type, filename: file.name } }
    )
    const res = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error('Échec du transfert.')
    await $fetch('/api/v1/pro/profile/me', { method: 'PATCH', body: { logo_url: presign.publicUrl } })
    profile.logo_url = presign.publicUrl
  } catch {
    logoError.value = 'Impossible de télécharger le logo. Réessayez.'
  } finally {
    logoUploading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/v1/pro/profile/me', {
      method: 'PATCH',
      body: { bio: profile.bio, category: profile.category, zone: profile.zone }
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
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">Mon profil public</h1>
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
      <div class="border-t border-border pt-8 mb-8">
        <h2 class="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">Logo d'entreprise</h2>
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 border border-border rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="w-full h-full object-cover" />
            <svg v-else class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>
            </svg>
          </div>
          <div>
            <label class="inline-flex items-center gap-2 h-9 px-4 border border-border text-foreground text-xs font-semibold rounded-md hover:bg-muted transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              {{ logoUploading ? 'Téléchargement…' : "Choisir un logo d'entreprise" }}
              <input type="file" accept="image/*" class="sr-only" @change="handleLogoUpload" :disabled="logoUploading" />
            </label>
            <p class="text-xs text-muted-foreground mt-2">5 Mo max. JPG, PNG, WebP, GIF, SVG.</p>
          </div>
        </div>
        <p v-if="logoError" class="text-xs text-destructive mt-2">{{ logoError }}</p>
      </div>

      <!-- Profile form -->
      <form @submit.prevent="saveProfile" class="space-y-6">

        <!-- Bio -->
        <div class="border-t border-border pt-8">
          <h2 class="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">Présentation</h2>
          <textarea
            v-model="profile.bio"
            rows="4"
            placeholder="Décrivez votre activité, votre expérience et ce qui vous différencie…"
            class="w-full px-4 py-3 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground bg-background resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxlength="500"
          />
          <p class="text-xs text-muted-foreground mt-1 text-right">{{ profile.bio?.length ?? 0 }}/500</p>
        </div>

        <!-- Category -->
        <div class="border-t border-border pt-8">
          <h2 class="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">Catégorie principale</h2>
          <select v-model="profile.category"
            class="w-full px-4 py-3 border border-border rounded-md text-sm text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none">
            <option value="maconnerie">Maçonnerie &amp; Gros Œuvre</option>
            <option value="toiture">Charpente &amp; Toiture</option>
            <option value="electricite">Électricité</option>
            <option value="plomberie">Plomberie &amp; Chauffage</option>
            <option value="peinture">Peinture &amp; Finitions</option>
            <option value="isolation">Isolation &amp; Cloisons</option>
          </select>
        </div>

        <!-- Zone -->
        <div class="border-t border-border pt-8">
          <h2 class="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">Zone d'intervention</h2>
          <input
            v-model="profile.zone"
            type="text"
            placeholder="Ex: Carrières-sous-Poissy, Poissy, Les Mureaux…"
            class="w-full px-4 py-3 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxlength="200"
          />
        </div>

        <!-- Slug (read-only) -->
        <div class="border-t border-border pt-8">
          <h2 class="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">URL de votre profil</h2>
          <input
            :value="`batixe.fr/pro/${profile.dept}/${profile.canonical_slug}`"
            type="text"
            readonly
            class="w-full px-4 py-3 border border-border rounded-md text-sm text-muted-foreground bg-muted cursor-not-allowed"
          />
          <p class="text-xs text-muted-foreground mt-2">L'URL de votre profil est fixe et ne peut pas être modifiée.</p>
        </div>

        <!-- Submit -->
        <div class="border-t border-border pt-8 flex items-center justify-between gap-4">
          <p v-if="saveSuccess" class="text-xs text-foreground font-semibold">
            Profil mis à jour. Les changements sont visibles sur votre page publique.
          </p>
          <p v-if="saveError" class="text-xs text-destructive">{{ saveError }}</p>
          <div class="ml-auto">
            <button type="submit" :disabled="saving"
              class="inline-flex items-center justify-center gap-2 h-10 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity disabled:opacity-50">
              <span v-if="!saving">Enregistrer les modifications</span>
              <span v-else>Enregistrement…</span>
            </button>
          </div>
        </div>

      </form>

    </template>
  </div>
</template>
