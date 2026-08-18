<script setup lang="ts">
useHead({
  title: 'BÂTI-AXE — Artisans certifiés, projets sécurisés',
  meta: [
    { name: 'description', content: 'Mise en relation entre particuliers et artisans vérifiés (décennale + Kbis). Zone pilote Carrières-sous-Poissy (78).' }
  ]
})

const heroPhoto = '/images/avant.jpg'

const { data: showcased } = await useFetch('/api/v1/completed-projects')
const showcasedProjects = computed(() => showcased.value?.projects ?? [])
</script>

<template>
  <div>
    <!-- ───────────────── Hero Bento Grid (Variant C) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 pt-12 pb-24">
      <div class="reveal grid grid-cols-1 gap-6 md:grid-cols-12">
        <!-- Carte intro -->
        <div class="reveal-item bento-card md:col-span-8 flex min-h-[420px] flex-col justify-between rounded-sm border border-slate-200 bg-white p-8 shadow-lg md:p-10">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm text-slate-600">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-safety" aria-hidden="true" />
              Zone pilote · Carrières-sous-Poissy (78)
            </div>

            <h1
              class="mt-6 text-5xl font-black tracking-tight text-slate-900 md:text-7xl"
              style="text-wrap: balance"
            >
              Trouvez l'artisan
              <span class="text-slate-400">certifié pour vos travaux.</span>
            </h1>

            <p class="mt-6 max-w-md text-lg text-slate-500" style="text-wrap: pretty">
              Décrivez votre projet et recevez des contacts d'artisans certifiés de votre zone. Vos coordonnées restent masquées jusqu'au contact.
            </p>
          </div>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/simulateur"
              class="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-safety px-8 text-lg font-bold text-white shadow-lg shadow-safety/20 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              Décrire mon projet
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </NuxtLink>
            <NuxtLink
              to="/pro/claim"
              class="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-lg font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              Je suis artisan
            </NuxtLink>
          </div>
          <p class="mt-4 text-sm text-slate-500">Gratuit pour les particuliers, sans engagement.</p>
        </div>

        <!-- Carte bénéfices : critères contrôlés -->
        <div class="reveal-item bento-card md:col-span-4 flex flex-col justify-center gap-5 rounded-sm bg-slate-900 p-8 text-white shadow-lg">
          <div>
            <p class="text-sm font-semibold text-slate-300">Contrôlés avant activation</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-400">Chaque artisan passe ces vérifications avant de pouvoir vous contacter.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Décennale valide</span>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Kbis &lt; 3 mois</span>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Zone confirmée</span>
          </div>
        </div>

        <!-- Carte visuelle : photo chantier -->
        <div class="reveal-item bento-card md:col-span-12 relative min-h-[280px] overflow-hidden rounded-sm border border-slate-200 shadow-lg">
          <img
            :src="heroPhoto"
            alt="Chantier de rénovation en cours, mur en briques apparentes"
            class="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchpriority="high"
          >
          <div class="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-safety px-3.5 py-2 text-white shadow-lg">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            <span class="text-sm font-semibold">Entreprise Vérifiée (API Gouv)</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── Teaser aides (Phase 05.9 — visuel, aucun calcul) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 pb-24">
      <div class="reveal-item bento-card rounded-sm bg-safety p-8 md:p-12 shadow-lg">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div class="max-w-2xl">
            <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white" style="text-wrap: balance">Estimez vos aides en 30 secondes</h2>
            <p class="mt-3 text-base font-semibold leading-relaxed text-white">MaPrimeRénov', CEE, Éco-PTZ : découvrez votre reste à charge réel avant de choisir votre artisan.</p>
          </div>
          <NuxtLink
            to="/calculateur-aides"
            class="inline-flex h-14 shrink-0 items-center gap-2 rounded-full bg-white px-8 text-lg font-bold text-safety shadow-lg transition-transform hover:scale-105"
          >
            Calculer mes aides
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ───────────────── Bandeau béton plein écran (manifeste) ───────────────── -->
    <section class="w-full bg-slate-900 text-white">
      <div class="mx-auto w-full max-w-7xl px-6 py-[clamp(3rem,7vw,5.5rem)]">
        <p class="max-w-[24ch] text-4xl font-black tracking-tight leading-[1.1] sm:text-5xl" style="text-wrap: balance">
          Vos coordonnées restent masquées jusqu'au contact.
        </p>
        <p class="mt-5 max-w-[52ch] text-base leading-relaxed text-white/70">
          L'artisan vous écrit via la plateforme, sans voir votre numéro. Vous décidez qui peut vous joindre, et quand.
        </p>
      </div>
    </section>

    <!-- ───────────────── Comment ça marche (process en 3 temps) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,6rem)]">
      <h2 class="text-4xl font-black tracking-tight text-slate-900" style="text-wrap: balance">Comment ça marche</h2>
      <div class="reveal mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="reveal-item bento-card rounded-sm border border-slate-200 bg-white p-8 shadow-lg">
          <span class="text-5xl font-bold text-industrial select-none">01</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-slate-900">Décrivez votre projet</h3>
          <p class="text-sm leading-relaxed text-slate-500">
            Simulateur en 6 étapes : type de travaux, localisation, budget estimé, délai. Moins de 3 minutes.
          </p>
        </div>
        <div class="reveal-item bento-card rounded-sm border border-slate-200 bg-white p-8 shadow-lg">
          <span class="text-5xl font-bold text-industrial select-none">02</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-slate-900">Mise en relation sous 2 min</h3>
          <p class="text-sm leading-relaxed text-slate-500">
            Les artisans partenaires de votre zone reçoivent une alerte avec le budget et le type de chantier. Pas vos coordonnées.
          </p>
        </div>
        <div class="reveal-item bento-card rounded-sm border border-slate-200 bg-white p-8 shadow-lg">
          <span class="text-5xl font-bold text-industrial select-none">03</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-slate-900">Contact débloqué</h3>
          <p class="text-sm leading-relaxed text-slate-500">
            Le premier artisan abonné peut vous appeler immédiatement. Pour les autres, vos coordonnées sont accessibles après 24h.
          </p>
        </div>
      </div>
    </section>

    <!-- ───────────────── Chantiers Réalisés (preuve sociale) ───────────────── -->
    <section v-if="showcasedProjects.length" class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,6rem)]">
      <div class="mb-10 max-w-[52ch]">
        <h2 class="text-4xl font-black tracking-tight text-slate-900" style="text-wrap: balance">Chantiers Réalisés</h2>
        <p class="mt-3 text-base leading-relaxed text-slate-500">
          Découvrez les derniers travaux menés par nos artisans certifiés près de chez vous.
        </p>
      </div>
      <div class="reveal flex gap-6 overflow-x-auto pb-4" style="scroll-snap-type: x mandatory;">
        <RealisationCard
          v-for="project in showcasedProjects"
          :key="project.id"
          :project="project"
          class="reveal-item shrink-0 w-[85%] sm:w-[45%] lg:w-[30%]"
          style="scroll-snap-align: start;"
        />
      </div>
    </section>

    <!-- ───────────────── Preuve : avant / après ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,6rem)]">
      <div class="mb-10 max-w-[52ch]">
        <h2 class="text-4xl font-black tracking-tight text-slate-900" style="text-wrap: balance">Avant et après, sur de vrais chantiers</h2>
        <p class="mt-3 text-base leading-relaxed text-slate-500">
          Glissez pour comparer des travaux menés par des artisans vérifiés.
        </p>
      </div>
      <BeforeAfterSlider
        before-src="/images/avant.jpg"
        after-src="/images/apres.jpg"
        before-label="Avant travaux"
        after-label="Après travaux"
        before-alt="Chantier de rénovation en cours"
        after-alt="Rénovation terminée"
      />
    </section>

    <!-- ───────────────── CTA final ───────────────── -->
    <section class="w-full border-t border-slate-200 bg-white">
      <div class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,5.5rem)] text-center">
        <h2 class="mx-auto max-w-[20ch] text-[clamp(1.75rem,3.5vw,3rem)] font-black tracking-tight text-slate-900" style="text-wrap: balance">
          Prêt à démarrer votre projet ?
        </h2>
        <p class="mx-auto mt-4 max-w-[44ch] text-base text-slate-500">
          Décrivez votre besoin en 3 minutes. Nous nous occupons de la mise en relation.
        </p>
        <NuxtLink
          to="/simulateur"
          class="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-safety px-8 text-lg font-bold text-white shadow-lg shadow-safety/20 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
        >
          Commencer la simulation
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
<!-- Animation .reveal-item / .bento-card mutualisée dans app/assets/css/tailwind.css (fondation plan 01) -->
