<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()
const sidebarOpen = ref(false)

async function signOut() {
  await navigateTo('/')
  await supabase.auth.signOut()
}

const props = defineProps<{
  activeTab: string
  pendingCount?: number
}>()

const emit = defineEmits<{
  (e: 'navigate', tab: string): void
}>()

const navItems = computed(() => [
  {
    key: 'overview',
    label: 'Vue d\'ensemble',
    icon: 'grid',
    badge: null,
  },
  {
    key: 'pending',
    label: 'En attente',
    icon: 'clock',
    badge: props.pendingCount && props.pendingCount > 0 ? props.pendingCount : null,
  },
  {
    key: 'all',
    label: 'Tous les pros',
    icon: 'users',
    badge: null,
  },
  {
    key: 'projects',
    label: 'Projets',
    icon: 'folder',
    badge: null,
  },
  {
    key: 'realisations',
    label: 'Réalisations',
    icon: 'image',
    badge: null,
  },
  {
    key: 'audit',
    label: 'Journal',
    icon: 'history',
    badge: null,
  },
])

const currentLabel = computed(() =>
  navItems.value.find(n => n.key === props.activeTab)?.label || 'Console Admin'
)

function switchTab(key: string) {
  emit('navigate', key)
  sidebarOpen.value = false
}

const userInitial = computed(() => user.value?.email?.charAt(0).toUpperCase() || '?')
</script>

<template>
  <div class="h-screen bg-background flex flex-col overflow-hidden">
    <div class="flex-1 flex min-h-0">

      <!-- Mobile sidebar overlay -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <!-- Sidebar header -->
        <div class="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
          <div class="w-8 h-8 rounded-sm bg-safety flex items-center justify-center">
            <span class="text-white text-xs font-bold">BA</span>
          </div>
          <div>
            <p class="text-sm font-bold text-foreground leading-tight">Console Admin</p>
            <p class="text-[10px] text-muted-foreground">BÂTI-AXE</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="switchTab(item.key)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors"
            :class="activeTab === item.key
              ? 'bg-safety/10 text-safety'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            <!-- Icons inline -->
            <svg v-if="item.icon === 'grid'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>
            <svg v-else-if="item.icon === 'clock'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <svg v-else-if="item.icon === 'users'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
            <svg v-else-if="item.icon === 'folder'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
            <svg v-else-if="item.icon === 'history'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <svg v-else-if="item.icon === 'image'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>

            <span class="flex-1 text-left">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-safety text-white"
            >
              {{ item.badge }}
            </span>
          </button>
        </nav>

        <!-- Sidebar footer -->
        <div class="px-3 py-3 border-t border-border space-y-2">
          <div class="flex items-center gap-2.5 px-3 py-2">
            <span class="flex items-center justify-center w-7 h-7 rounded-full bg-safety text-white text-xs font-bold shrink-0">
              {{ userInitial }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-foreground truncate">{{ user?.email }}</p>
              <p class="text-[10px] text-muted-foreground">Administrateur</p>
            </div>
          </div>
          <button
            @click="signOut"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0">

        <!-- Top bar -->
        <header class="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 lg:px-6 gap-4">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          </button>

          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-foreground truncate">{{ currentLabel }}</h1>
          </div>


        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
