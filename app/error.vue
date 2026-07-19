<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: '/' })

useHead({
  title: `${props.error?.statusCode || 404} — BÂTI-AXE`,
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    
    <div class="mb-6 text-slate-300">
       <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
       </svg>
    </div>

    <p class="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3">Erreur {{ error?.statusCode || 404 }}</p>
    
    <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4" style="text-wrap: balance">
      {{ error?.statusCode === 404 ? 'Page introuvable' : 'Une erreur est survenue' }}
    </h1>
    
    <p class="text-base text-slate-500 mb-10 max-w-md mx-auto leading-relaxed" style="text-wrap: balance">
      {{ error?.statusCode === 404 
          ? "La page que vous cherchez n'existe plus ou a été déplacée." 
          : (error?.statusMessage || "Un problème technique inattendu bloque l'accès à cette page.") }}
    </p>

    <button 
      @click="handleError"
      class="inline-flex items-center justify-center h-12 px-8 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-colors"
    >
      Retourner à l'accueil
    </button>
    
  </div>
</template>
