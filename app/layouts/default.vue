<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function signOut() {
  await navigateTo('/')
  await supabase.auth.signOut()
}

const userInitial = computed(() =>
  user.value?.email?.charAt(0).toUpperCase() ?? ''
)

const isAdmin = computed(() => (user.value as any)?.app_metadata?.role === 'admin')
const espaceLink = computed(() => isAdmin.value ? '/admin' : '/espace/dashboard')

const route = useRoute()
const isPartenairesPage = computed(() => ['/partenaires', '/b2b/partenaires'].includes(route.path))
const onPartenairesLanding = computed(() => route.path === '/partenaires')
const onSimulateur = computed(() => route.path === '/simulateur')
</script>

<template>
  <div class="min-h-screen bg-page text-foreground flex flex-col font-sans antialiased">
    <header class="sticky top-0 z-40 border-b border-border bg-page">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center shrink-0 hover:opacity-80 transition-opacity" aria-label="BÂTI-AXE — Accueil">
          <img src="/images/logo-transparent.png" alt="BÂTI-AXE" class="h-12 w-auto object-contain" />
        </NuxtLink>
        <nav class="flex items-center gap-2">
          <template v-if="user">
            <NuxtLink v-if="!isAdmin && !isPartenairesPage" to="/partenaires" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Partenaires</NuxtLink>
            <NuxtLink :to="espaceLink" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Mon espace</NuxtLink>
            <button class="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-sm border border-border hover:bg-muted transition-colors" @click="signOut">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">{{ userInitial }}</span>
              <span class="text-muted-foreground">Déconnexion</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink v-if="!isPartenairesPage" to="/partenaires" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Partenaires</NuxtLink>
            <NuxtLink to="/pro/claim" class="inline-flex items-center h-9 px-4 text-sm font-medium rounded-sm border border-border text-foreground hover:bg-muted transition-colors">Se connecter</NuxtLink>
            <NuxtLink
              v-if="!onSimulateur && !isPartenairesPage"
              to="/simulateur"
              class="inline-flex items-center h-9 px-4 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity rounded-sm"
            >Déposer un projet</NuxtLink>
            <NuxtLink
              v-if="onPartenairesLanding"
              to="/b2b/partenaires"
              class="inline-flex items-center h-9 px-4 text-sm font-semibold bg-safety text-white hover:brightness-110 transition-all rounded-sm"
            >Déposer un dossier</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="border-t border-white/10 bg-slate-800 mt-auto">
      <div class="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div class="flex items-center gap-3">
          <img src="/images/logo-light.png" alt="BÂTI-AXE" class="h-7 w-auto object-contain" />
          <p class="text-slate-400">&copy; 2026 BÂTI-AXE. Tous droits réservés. Conforme RGPD.</p>
        </div>
        <nav class="flex items-center gap-5">
          <NuxtLink to="/partenaires" class="text-slate-400 hover:text-white transition-colors">Partenaires</NuxtLink>
          <NuxtLink to="/legal/mentions-legales" class="text-slate-400 hover:text-white transition-colors">Mentions légales</NuxtLink>
          <NuxtLink to="/legal/confidentialite" class="text-slate-400 hover:text-white transition-colors">Confidentialité</NuxtLink>
          <NuxtLink to="/legal/cgu" class="text-slate-400 hover:text-white transition-colors">CGU</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
