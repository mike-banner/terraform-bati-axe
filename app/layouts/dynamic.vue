<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isHeaderVisible = ref(true)
let lastScrollPosition = 0

const handleScroll = () => {
  const currentScrollPosition = window.scrollY
  
  if (currentScrollPosition < 0) {
    return
  }
  
  // Scrolled down
  if (Math.abs(currentScrollPosition - lastScrollPosition) < 60) {
    return
  }
  
  isHeaderVisible.value = currentScrollPosition < lastScrollPosition
  lastScrollPosition = currentScrollPosition
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.addEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-32 transition-colors duration-200">
    <!-- Header Dynamique (Sticky, se cache au scroll vers le bas) -->
    <header 
      class="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-transform duration-300"
      :class="isHeaderVisible ? 'translate-y-0' : '-translate-y-full'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <slot name="header">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span class="font-semibold text-lg tracking-tight">Bati Axe Pro</span>
          </div>
        </slot>
      </div>
    </header>

    <!-- Contenu Principal -->
    <main class="w-full max-w-7xl mx-auto">
      <slot />
    </main>

    <!-- Bottom Navigation "Pilule" Flottante -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
      <nav class="flex items-center justify-around px-6 py-4 bg-slate-900/85 dark:bg-black/60 backdrop-blur-xl rounded-full shadow-2xl shadow-blue-900/20 border border-white/10 text-slate-400">
        
        <!-- Profil (Gauche) -->
        <NuxtLink to="/app/dashboard" class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-white cursor-pointer" active-class="text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          <span class="text-[10px] font-medium">Profil</span>
        </NuxtLink>
        
        <!-- Leads (Milieu/Droite) -->
        <NuxtLink to="/app/leads" class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-white cursor-pointer" active-class="text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span class="text-[10px] font-medium">Leads</span>
        </NuxtLink>

        <!-- Messagerie (Extrême Droite) -->
        <NuxtLink to="/app/messages" class="flex flex-col items-center gap-1 transition-colors duration-200 hover:text-white cursor-pointer relative" active-class="text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
          <span class="text-[10px] font-medium">Messages</span>
        </NuxtLink>

      </nav>
    </div>
  </div>
</template>
