<script setup lang="ts">
import { ArrowRight, ShieldCheck, Zap, Users, Lock } from 'lucide-vue-next'

useHead({
  title: 'BÂTI-AXE — Mise en relation bâtiment & travaux qualifiés',
  meta: [
    { name: 'description', content: 'Plateforme de mise en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
    <!-- Glow effects in background -->
    <div class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
    <div class="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl -z-10"></div>

    <!-- Navigation Header -->
    <header class="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl font-black tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">BÂTI-AXE</span>
        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">PILOTE</span>
      </div>
      <div class="flex items-center gap-4">
        <NuxtLink to="/simulateur" class="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg shadow-md shadow-indigo-500/20 transition-all">
          Simulation
        </NuxtLink>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-20 text-center space-y-12 relative">
      <!-- Active Phase Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-medium">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        <span>Phase 2 active : Data Foundation & Capture</span>
      </div>
      
      <!-- Headline -->
      <h1 class="text-5xl font-black tracking-tight sm:text-6xl max-w-4xl mx-auto text-white leading-tight">
        Trouvez l'artisan idéal pour vos travaux, <br class="hidden sm:inline" />
        <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">en toute confiance.</span>
      </h1>
      
      <!-- Subheadline -->
      <p class="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
        BÂTI-AXE valide manuellement les assurances décennales et Kbis de ses professionnels partenaires. Vos données personnelles restent floutées et protégées.
      </p>

      <!-- CTAs -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full max-w-md mx-auto">
        <NuxtLink 
          to="/simulateur"
          class="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:opacity-90 duration-200 gap-2 group"
        >
          Simulation de travaux
          <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
        
        <NuxtLink 
          to="/legal/mentions-legales"
          class="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 px-8 text-sm font-medium text-zinc-300 transition-colors duration-200"
        >
          Mentions Légales
        </NuxtLink>
      </div>

      <!-- Features grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 pt-16 w-full text-left">
        <div class="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-3">
          <div class="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg inline-block">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-white text-base">Assurances Validées</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">Attestations décennales et KBIS contrôlés individuellement pour chaque professionnel partenaire.</p>
        </div>

        <div class="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-3">
          <div class="p-3 bg-purple-500/10 text-purple-400 rounded-lg inline-block">
            <Lock class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-white text-base">Données Floutées</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">Vos coordonnées de contact restent masquées et sécurisées jusqu'au matching validé.</p>
        </div>

        <div class="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-3">
          <div class="p-3 bg-pink-500/10 text-pink-400 rounded-lg inline-block">
            <Zap class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-white text-base">Mise en Relation</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">Simulateur en 6 étapes optimisé pour qualifier précisément votre projet et son budget.</p>
        </div>

        <div class="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-3">
          <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg inline-block">
            <Users class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-white text-base">Zone Pilote</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">Lancement pilote ciblé sur la commune de Carrières-sous-Poissy (78955) pour un service de proximité.</p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-zinc-900 bg-zinc-950/80 px-6 py-6 text-center text-xs text-zinc-500">
      <div class="flex justify-center gap-6 mb-4">
        <NuxtLink to="/legal/mentions-legales" class="hover:text-zinc-300">Mentions Légales</NuxtLink>
        <NuxtLink to="/legal/confidentialite" class="hover:text-zinc-300">Politique de Confidentialité</NuxtLink>
        <NuxtLink to="/legal/cgu" class="hover:text-zinc-300">Conditions Générales d'Utilisation</NuxtLink>
      </div>
      <p>&copy; 2026 BÂTI-AXE. Tous droits réservés. Plateforme pilote conforme RGPD.</p>
    </footer>
  </div>
</template>
