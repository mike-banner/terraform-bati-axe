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
const onSimulateur = computed(() => route.path === '/simulateur')
</script>

<template>
  <div class="min-h-screen bg-page text-foreground flex flex-col font-sans antialiased">
    <header class="sticky top-0 z-40 border-b border-border bg-page/95 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-end self-end hover:opacity-80 transition-opacity" aria-label="BÂTI-AXE — Accueil">
          <img src="/images/logo.png" alt="BÂTI-AXE" class="h-16 w-auto object-contain" />
        </NuxtLink>
        <nav class="flex items-center gap-2">
          <template v-if="user">
            <NuxtLink :to="espaceLink" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Mon espace</NuxtLink>
            <button class="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-sm border border-border hover:bg-muted transition-colors" @click="signOut">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">{{ userInitial }}</span>
              <span class="text-muted-foreground">Déconnexion</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/pro/claim" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Se connecter</NuxtLink>
            <NuxtLink
              v-if="!onSimulateur"
              to="/simulateur"
              class="text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity px-4 py-2 rounded-sm"
            >Déposer un projet</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="border-t border-white/10 bg-slate-800 mt-auto">
      <div class="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p class="text-slate-400">&copy; 2026 BÂTI-AXE. Tous droits réservés. Conforme RGPD.</p>
        <nav class="flex items-center gap-5">
          <NuxtLink to="/legal/mentions-legales" class="text-slate-400 hover:text-white transition-colors">Mentions légales</NuxtLink>
          <NuxtLink to="/legal/confidentialite" class="text-slate-400 hover:text-white transition-colors">Confidentialité</NuxtLink>
          <NuxtLink to="/legal/cgu" class="text-slate-400 hover:text-white transition-colors">CGU</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
