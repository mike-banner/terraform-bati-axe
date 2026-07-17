<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

// Auto-logout après 30 min inactivité
useIdleLogout(30)

async function signOut() {
  await navigateTo('/')
  await supabase.auth.signOut()
}

const userInitial = computed(() => user.value?.email?.charAt(0).toUpperCase() ?? '')

const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const { data: headerPro } = await useAsyncData('header-pro', async () => {
  if (!user.value?.id) return null
  const { data } = await supabase.from('professionals').select('company_name').eq('id', user.value.id).maybeSingle()
  return data
}, { server: false })

// On client side, fix height for mobile iOS
onMounted(() => {
  const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
  }
  setAppHeight()
  window.addEventListener('resize', setAppHeight, { passive: true })
  window.addEventListener('orientationchange', setAppHeight, { passive: true })
})
</script>

<template>
  <div class="fixed inset-0 app-wrapper bg-page text-foreground font-sans flex flex-col" :class="isAdminRoute ? 'bg-slate-950 text-slate-100' : ''">
    
    <!-- MOBILE HEADER -->
    <header class="md:hidden flex-shrink-0 h-14 z-[60] bg-page/98 border-b border-border flex items-center justify-between px-5">
      <h1 class="text-sm font-black tracking-tight text-foreground flex items-center gap-2">
        BÂTI-AXE
        <span v-if="isAdminRoute" class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500 border border-red-500/20">Admin</span>
        <span v-else class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Pro</span>
      </h1>
      <span v-if="headerPro?.company_name" class="text-[10px] font-semibold uppercase text-muted-foreground truncate max-w-[100px]">{{ headerPro.company_name }}</span>
    </header>

    <!-- ZONE CENTRALE (Sidebar + Main) -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      
      <!-- DESKTOP SIDEBAR -->
      <aside class="hidden md:flex w-72 flex-shrink-0 bg-page border-r border-border flex-col p-6 overflow-y-auto custom-scrollbar" :class="isAdminRoute ? 'border-slate-800' : ''">
        
        <div class="flex items-center gap-2 mb-8 px-2">
          <span class="text-xl font-black tracking-tight">BÂTI-AXE</span>
          <span v-if="isAdminRoute" class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">Admin</span>
          <span v-else class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">Pro</span>
        </div>

        <nav class="flex-1 space-y-2">
          <NuxtLink to="/app/dashboard" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors" active-class="bg-primary/10 text-primary" :class="route.path === '/app/dashboard' ? '' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Accueil
          </NuxtLink>
          <NuxtLink to="/espace/leads" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors" active-class="bg-primary/10 text-primary" :class="route.path === '/espace/leads' ? '' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Leads & Chantiers
          </NuxtLink>
          <NuxtLink to="/espace/messages" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors" active-class="bg-primary/10 text-primary" :class="route.path === '/espace/messages' ? '' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            Messages
          </NuxtLink>
        </nav>

        <div class="pt-6 mt-6 border-t border-border space-y-2">
          <NuxtLink to="/espace/profil" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors" active-class="bg-foreground/5 text-foreground border border-foreground/10" :class="route.path === '/espace/profil' ? '' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'">
            <svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
            Profil Public
          </NuxtLink>
          <button @click="signOut" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-colors">
            <svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- MAIN AREA -->
      <main class="flex-1 min-h-0 flex flex-col bg-slate-50" :class="isAdminRoute ? 'bg-slate-900' : ''">
        
        <!-- DESKTOP HEADER -->
        <header class="hidden md:flex h-20 flex-shrink-0 items-center justify-between px-10 border-b border-border bg-page/98 z-20">
          <h2 class="text-xl font-black tracking-tight text-foreground">{{ headerPro?.company_name || 'Espace Pro' }}</h2>
          <div class="flex items-center gap-4">
            <button @click="signOut" class="flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background text-sm font-bold shadow-sm hover:opacity-80 transition-opacity">
              {{ userInitial }}
            </button>
          </div>
        </header>

        <!-- SCROLLABLE SLOT -->
        <div class="flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar">
          <div class="max-w-6xl w-full mx-auto pb-10">
            <slot />
          </div>
        </div>
      </main>

    </div>

    <!-- MOBILE BOTTOM BAR (VTC STYLE) -->
    <nav v-if="!isAdminRoute" class="md:hidden flex-shrink-0 z-50 flex justify-around items-stretch bg-page/90 backdrop-blur-xl border-t border-border" style="height: calc(4rem + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);">
      <NuxtLink to="/app/dashboard" class="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 transition-colors" active-class="text-primary" :class="route.path === '/app/dashboard' ? '' : 'text-muted-foreground'">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="text-[10px] font-semibold uppercase tracking-tight leading-none mt-1">Accueil</span>
      </NuxtLink>
      
      <NuxtLink to="/espace/leads" class="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 transition-colors" active-class="text-primary" :class="route.path === '/espace/leads' ? '' : 'text-muted-foreground'">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span class="text-[10px] font-semibold uppercase tracking-tight leading-none mt-1">Leads</span>
      </NuxtLink>

      <NuxtLink to="/espace/messages" class="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 transition-colors relative" active-class="text-primary" :class="route.path === '/espace/messages' ? '' : 'text-muted-foreground'">
        <div class="relative">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <!-- Pastille notif TODO -->
        </div>
        <span class="text-[10px] font-semibold uppercase tracking-tight leading-none mt-1">Messages</span>
      </NuxtLink>

      <NuxtLink to="/espace/profil" class="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 transition-colors" active-class="text-primary" :class="route.path === '/espace/profil' ? '' : 'text-muted-foreground'">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
        <span class="text-[10px] font-semibold uppercase tracking-tight leading-none mt-1">Profil</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style>
/* 
 * L'app-wrapper utilise fixed inset-0 pour prendre 100% de l'écran 
 * et gère son propre overflow.
 */
.app-wrapper {
  height: var(--app-h, 100vh);
  overflow: hidden;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.2);
  border-radius: 10px;
}
</style>
