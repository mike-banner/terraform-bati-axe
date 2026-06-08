<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

const userInitial = computed(() => user.value?.email?.charAt(0).toUpperCase() ?? '')

const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isProRoute = computed(() => route.path.startsWith('/app') || route.path.startsWith('/pro'))

const isHeaderVisible = ref(true)
let lastScrollPosition = 0

function handleScroll() {
  const current = window.scrollY
  if (current < 0 || Math.abs(current - lastScrollPosition) < 60) return
  isHeaderVisible.value = current < lastScrollPosition
  lastScrollPosition = current
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <div 
    class="min-h-screen text-foreground flex flex-col font-sans antialiased pb-24 transition-colors duration-500"
    :class="isAdminRoute ? 'bg-slate-950 text-slate-100' : 'bg-background'"
  >

    <!-- Header — identique au layout default, se cache au scroll vers le bas -->
    <header
      class="sticky top-0 z-40 border-b transition-transform duration-300"
      :class="[
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full',
        isAdminRoute ? 'border-slate-800 bg-slate-950/95 backdrop-blur-sm' : 'border-border bg-background/95 backdrop-blur-sm'
      ]"
    >
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-base font-bold tracking-tight hover:opacity-70 transition-opacity flex items-center gap-2">
          BÂTI-AXE
          <span v-if="isAdminRoute" class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500 border border-red-500/20">Admin</span>
          <span v-else-if="isProRoute" class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-foreground/10 text-foreground border border-foreground/20">Pro</span>
        </NuxtLink>
        <nav class="flex items-center gap-2">
          <template v-if="user">
            <button
              class="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              @click="signOut"
            >
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
                {{ userInitial }}
              </span>
              <span class="text-muted-foreground">Déconnexion</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/pro/claim" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Se connecter
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="flex-grow max-w-6xl w-full mx-auto">
      <slot />
    </main>

    <!-- Navigation basse flottante (mobile) -> Uniquement pour les Pros -->
    <div v-if="!isAdminRoute" class="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50">
      <nav class="flex items-center justify-around px-6 py-3.5 bg-foreground/95 backdrop-blur-xl rounded-full shadow-2xl border border-foreground/10 text-background/50">

        <NuxtLink
          to="/app/dashboard"
          class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-background cursor-pointer"
          active-class="text-background"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="5"/>
            <path d="M20 21a8 8 0 0 0-16 0"/>
          </svg>
          <span class="text-[10px] font-medium">Profil</span>
        </NuxtLink>

        <NuxtLink
          to="/app/leads"
          class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-background cursor-pointer"
          active-class="text-background"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span class="text-[10px] font-medium">Leads</span>
        </NuxtLink>

        <NuxtLink
          to="/app/messages"
          class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-background cursor-pointer relative"
          active-class="text-background"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
          </svg>
          <span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-foreground" />
          <span class="text-[10px] font-medium">Messages</span>
        </NuxtLink>

      </nav>
    </div>

  </div>
</template>
