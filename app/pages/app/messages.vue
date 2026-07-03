<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })
useHead({ title: 'Messagerie — BÂTI-AXE' })

useRequireAuth()
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <h1 class="text-3xl font-black tracking-tight text-foreground mb-8">Messagerie</h1>
    
    <div class="bento-card py-16 text-center border border-slate-200 rounded-3xl bg-white shadow-sm">
      <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-muted-foreground"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
      </div>
      <p class="text-sm font-medium text-foreground">Messagerie bientôt disponible.</p>
      <p class="text-xs text-muted-foreground mt-1">Vous pourrez bientôt discuter directement avec vos clients ici.</p>
    </div>
  </div>
</template>
