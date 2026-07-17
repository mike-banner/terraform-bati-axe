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
  <div class="w-full mx-auto px-6 py-8 md:py-12">

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
      <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-heading font-bold tracking-tight text-text">Mon profil public</h1>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
          <p class="text-sm text-muted-foreground">Ces informations sont visibles sur votre page publique BÂTI-AXE.</p>
          <NuxtLink v-if="profile.canonical_slug" :to="`/pro/${profile.dept}/${profile.canonical_slug}`" target="_blank"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
            Voir ma page publique
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
            </svg>
          </NuxtLink>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- COLONNE GAUCHE (Infos principales) -->
        <div class="lg:col-span-7 xl:col-span-8 space-y-6">

      <ProfileLogoUpload 
        :canonical-slug="profile.canonical_slug" 
        @update:logoUrl="profile.logo_url = $event" 
      />

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
        </div> <!-- Fin colonne gauche -->

        <!-- COLONNE DROITE (Réalisations portfolio) -->
        <div class="lg:col-span-5 xl:col-span-4 sticky top-6">
          <ProfileRealisations :zone="profile.zone" />
        </div>

      </div>

    </template>
  </div>
</template>
