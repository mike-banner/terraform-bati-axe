<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

const userInitial = computed(() =>
  user.value?.email?.charAt(0).toUpperCase() ?? ''
)

const isAdmin = computed(() => (user.value as any)?.app_metadata?.role === 'admin')
const espaceLink = computed(() => isAdmin.value ? '/admin' : '/app/dashboard')
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
    <header class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-base font-bold tracking-tight text-foreground hover:opacity-70 transition-opacity">BÂTI-AXE</NuxtLink>
        <nav class="flex items-center gap-2">
          <template v-if="user">
            <NuxtLink :to="espaceLink" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Mon espace</NuxtLink>
            <button class="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors" @click="signOut">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">{{ userInitial }}</span>
              <span class="text-muted-foreground">Déconnexion</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/pro/claim" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Se connecter</NuxtLink>
            <NuxtLink to="/simulateur" class="text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity px-4 py-2 rounded-md">Déposer un projet</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="border-t border-border mt-auto">
      <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>&copy; 2026 BÂTI-AXE. Tous droits réservés. Conforme RGPD.</p>
        <nav class="flex items-center gap-5">
          <NuxtLink to="/legal/mentions-legales" class="hover:text-foreground transition-colors">Mentions légales</NuxtLink>
          <NuxtLink to="/legal/confidentialite" class="hover:text-foreground transition-colors">Confidentialité</NuxtLink>
          <NuxtLink to="/legal/cgu" class="hover:text-foreground transition-colors">CGU</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
