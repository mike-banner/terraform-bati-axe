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

// Entrées du menu (barre latérale desktop et barre du bas mobile). Icônes : tracés statiques.
const navItems = [
  { to: '/espace/dashboard', label: 'Accueil', short: 'Accueil', exact: true,
    icon: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { to: '/espace/leads', label: 'Leads particuliers', short: 'Leads', exact: false,
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { to: '/espace/appels-offres', label: 'Appels d\'offres', short: 'Appels', exact: false, flagKey: 'framework',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>' },
  { to: '/espace/projets', label: 'Projets en cours', short: 'Projets', exact: false,
    icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>' },
  { to: '/espace/messages', label: 'Messages', short: 'Messages', exact: false,
    icon: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' },
]
const isActive = (item: { to: string; exact: boolean }) => item.exact ? route.path === item.to : route.path.startsWith(item.to)

// Pastille rouge sur « Appels d'offres » tant que la convention cadre n'est pas signée.
// L'état est renseigné par la page des appels d'offres ; sinon on le lit une fois ici.
const frameworkSigned = useState<boolean | null>('proFrameworkSigned', () => null)
const needsFlag = (item: { flagKey?: string }) => item.flagKey === 'framework' && frameworkSigned.value === false
onMounted(async () => {
  if (isAdminRoute.value || frameworkSigned.value !== null) return
  try {
    const res = await $fetch<{ engagements: { type: string }[] }>('/api/v1/engagements/pro')
    frameworkSigned.value = res.engagements.some(e => e.type === 'framework_pro')
  } catch { /* pas un pro connecté : pas de pastille */ }
})

// Menu de l'avatar (mobile) : profil public et déconnexion.
const accountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const onDocClick = (e: MouseEvent) => {
  if (accountMenuOpen.value && accountMenuRef.value && !accountMenuRef.value.contains(e.target as Node)) accountMenuOpen.value = false
}
const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') accountMenuOpen.value = false }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKeydown) })
watch(() => route.path, () => { accountMenuOpen.value = false })

const headerPro = ref<{ company_name?: string; logo_url?: string | null } | null>(null)

const fetchHeaderPro = async () => {
  try {
    const sessionRes = await supabase.auth.getSession()
    const uid = sessionRes.data.session?.user?.id || user.value?.id
    if (uid) {
      const { data } = await supabase.from('professionals').select('company_name, logo_url').eq('id', uid).maybeSingle()
      if (data) headerPro.value = data
    }
  } catch (e) {
    console.error(e)
  }
}

const companyInitial = computed(() => headerPro.value?.company_name?.charAt(0).toUpperCase() ?? userInitial.value)

watch(() => user.value?.id, (uid: string | undefined) => {
  if (uid) fetchHeaderPro()
  else headerPro.value = null
}, { immediate: true })

onMounted(() => {
  fetchHeaderPro()
})

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
        <NuxtLink to="/" class="hover:opacity-80 transition-opacity">BÂTI-AXE</NuxtLink>
        <span v-if="isAdminRoute" class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500 border border-red-500/20">Admin</span>
        <span v-else class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Pro</span>
      </h1>
      <div v-if="!isAdminRoute" ref="accountMenuRef" class="relative">
        <button
          type="button"
          class="flex items-center gap-2 h-10 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          aria-haspopup="menu"
          :aria-expanded="accountMenuOpen"
          aria-label="Menu du compte"
          @click="accountMenuOpen = !accountMenuOpen"
        >
          <span v-if="headerPro?.company_name" class="text-[10px] font-semibold uppercase text-muted-foreground truncate max-w-[100px]">{{ headerPro.company_name }}</span>
          <img v-if="headerPro?.logo_url" :src="headerPro.logo_url" :alt="headerPro.company_name" class="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
          <span v-else class="flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background text-sm font-bold shrink-0">{{ companyInitial }}</span>
        </button>
        <div v-if="accountMenuOpen" role="menu" class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-page shadow-lg py-1 z-[70]">
          <NuxtLink to="/espace/profil" role="menuitem" class="flex items-center gap-3 px-4 h-12 text-sm font-semibold text-foreground hover:bg-muted/50">Profil public</NuxtLink>
          <button type="button" role="menuitem" class="w-full flex items-center gap-3 px-4 h-12 text-sm font-semibold text-red-600 hover:bg-red-500/10" @click="signOut">Déconnexion</button>
        </div>
      </div>
      <span v-else-if="headerPro?.company_name" class="text-[10px] font-semibold uppercase text-muted-foreground truncate max-w-[100px]">{{ headerPro.company_name }}</span>
    </header>

    <!-- ZONE CENTRALE (Sidebar + Main) -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      
      <!-- DESKTOP SIDEBAR -->
      <aside class="hidden md:flex w-72 flex-shrink-0 bg-page border-r border-border flex-col p-6 overflow-y-auto custom-scrollbar" :class="isAdminRoute ? 'border-slate-800' : ''">
        
        <div class="flex items-center gap-2 mb-8 px-2">
          <NuxtLink to="/" class="text-xl font-black tracking-tight hover:opacity-80 transition-opacity">BÂTI-AXE</NuxtLink>
          <span v-if="isAdminRoute" class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500 border border-red-500/20">Admin</span>
          <span v-else class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Pro</span>
        </div>

        <nav class="flex-1 space-y-2" aria-label="Navigation principale">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            :class="isActive(item) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" v-html="item.icon" />
            <span class="flex-1">{{ item.label }}</span>
            <span v-if="needsFlag(item)" class="w-2.5 h-2.5 rounded-full bg-red-500" role="img" aria-label="Convention à signer" />
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
      <main class="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50" :class="isAdminRoute ? 'bg-slate-900' : ''">
        
        <!-- DESKTOP HEADER -->
        <header class="hidden md:flex h-16 flex-shrink-0 items-center justify-between px-10 border-b border-border bg-page/98 z-20">
          <h2 class="text-xl font-black tracking-tight text-foreground uppercase">
            {{ route.meta.pageTitle || 'Espace Pro' }}
          </h2>
          <NuxtLink to="/espace/profil" class="flex items-center gap-2.5 group" title="Voir mon profil public">
            <span class="text-sm font-semibold uppercase text-muted-foreground group-hover:text-foreground transition-colors">
              {{ headerPro?.company_name || 'Mon entreprise' }}
            </span>
            <img v-if="headerPro?.logo_url" :src="headerPro.logo_url" :alt="headerPro.company_name"
              class="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
            <span v-else class="flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background text-sm font-bold shrink-0">
              {{ companyInitial }}
            </span>
          </NuxtLink>
        </header>

        <!-- SCROLLABLE SLOT -->
        <div class="flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar">
          <div class="w-full max-w-[1600px] pb-10">
            <slot />
          </div>
        </div>
      </main>

    </div>

    <!-- MOBILE BOTTOM BAR (VTC STYLE) -->
    <nav v-if="!isAdminRoute" aria-label="Navigation principale" class="md:hidden flex-shrink-0 z-50 flex justify-around items-stretch bg-page/90 backdrop-blur-xl border-t border-border" style="height: calc(4rem + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-0.5 transition-colors"
        :class="isActive(item) ? 'text-primary' : 'text-muted-foreground'"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <span class="relative">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" v-html="item.icon" />
          <span v-if="needsFlag(item)" class="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" role="img" aria-label="Convention à signer" />
        </span>
        <span class="text-[10px] font-semibold uppercase tracking-tight leading-none mt-1 truncate max-w-full">{{ item.short }}</span>
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
