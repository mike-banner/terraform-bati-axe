<script setup lang="ts">
useHead({
  title: 'BÂTI-AXE — Artisans certifiés, projets sécurisés',
  meta: [
    { name: 'description', content: 'Mise en relation entre particuliers et artisans vérifiés (décennale + Kbis). Zone pilote Carrières-sous-Poissy (78).' }
  ]
})

// Image chantier vérifiée (résout 200). À remplacer à terme par un asset projet.
const heroPhoto = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'

const { data: showcased } = await useFetch('/api/v1/completed-projects')
const showcasedProjects = computed(() => showcased.value?.projects ?? [])
</script>

<template>
  <div>
    <!-- ───────────────── Hero Bento Grid (Variant C) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 pt-12 pb-24">
      <div class="reveal grid grid-cols-1 gap-6 md:grid-cols-12">
        <!-- Carte intro -->
        <div class="reveal-item bento-card md:col-span-8 flex min-h-[420px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
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
              Chaque professionnel partenaire est vérifié manuellement : décennale en cours de validité, Kbis à jour. Vos coordonnées restent masquées jusqu'au moment du contact.
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
        </div>

        <!-- Carte accent : mise en relation -->
        <div class="reveal-item bento-card md:col-span-4 flex flex-col justify-between rounded-3xl bg-industrial p-8 text-white">
          <div class="flex items-center gap-2 text-sm font-medium text-orange-200">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Mise en relation
          </div>
          <div>
            <div class="text-5xl font-bold">2 min</div>
            <p class="mt-2 text-sm text-white/80">Délai moyen avant qu'un artisan de votre zone reçoive l'alerte, budget et type de chantier inclus.</p>
          </div>
        </div>

        <!-- Carte bénéfices : critères contrôlés -->
        <div class="reveal-item bento-card md:col-span-4 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white">
          <div class="mb-4 text-sm text-slate-400">Contrôlés avant activation</div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Décennale valide</span>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Kbis &lt; 3 mois</span>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm">Zone confirmée</span>
          </div>
        </div>

        <!-- Carte visuelle : photo chantier -->
        <div class="reveal-item bento-card md:col-span-8 relative min-h-[280px] overflow-hidden rounded-3xl border border-slate-200">
          <img
            :src="heroPhoto"
            alt="Chantier de rénovation en cours, mur en briques apparentes"
            class="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchpriority="high"
          >
          <div class="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-safety px-3.5 py-2 text-white shadow-lg">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            <span class="text-sm font-semibold">Pro vérifié à la main</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── Bandeau béton plein écran (manifeste) ───────────────── -->
    <section class="w-full bg-slate-900 text-white">
      <div class="mx-auto w-full max-w-7xl px-6 py-[clamp(3rem,7vw,5.5rem)]">
        <p class="max-w-[24ch] text-4xl font-black tracking-tight leading-[1.1] sm:text-5xl" style="text-wrap: balance">
          La confiance, dans le bâtiment, ça se prouve. Pas ça s'annonce.
        </p>
        <p class="mt-5 max-w-[52ch] text-base leading-relaxed text-white/70">
          Un artisan non conforme n'accède jamais à vos coordonnées. Décennale expirée, Kbis manquant, zone hors secteur : c'est non. Vous parlez uniquement à des professionnels en règle.
        </p>
      </div>
    </section>

    <!-- ───────────────── Comment ça marche (process en 3 temps) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,6rem)]">
      <h2 class="text-4xl font-black tracking-tight text-slate-900" style="text-wrap: balance">Comment ça marche</h2>
      <div class="reveal mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="reveal-item bento-card rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <span class="text-5xl font-bold text-industrial select-none">01</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-slate-900">Décrivez votre projet</h3>
          <p class="text-sm leading-relaxed text-slate-500">
            Simulateur en 6 étapes : type de travaux, localisation, budget estimé, délai. Moins de 3 minutes.
          </p>
        </div>
        <div class="reveal-item bento-card rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <span class="text-5xl font-bold text-industrial select-none">02</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-slate-900">Mise en relation sous 2 min</h3>
          <p class="text-sm leading-relaxed text-slate-500">
            Les artisans partenaires de votre zone reçoivent une alerte avec le budget et le type de chantier. Pas vos coordonnées.
          </p>
        </div>
        <div class="reveal-item bento-card rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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
        <h2 class="text-4xl font-black tracking-tight text-slate-900" style="text-wrap: balance">Le résultat, pas la promesse</h2>
        <p class="mt-3 text-base leading-relaxed text-slate-500">
          Des chantiers menés par des artisans vérifiés de la plateforme. Glissez pour comparer.
        </p>
      </div>
      <BeforeAfterSlider
        before-src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80"
        after-src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1400&q=80"
        before-label="Avant travaux"
        after-label="Après travaux"
        before-alt="Chantier de rénovation en cours"
        after-alt="Rénovation terminée"
      />
    </section>

    <!-- ───────────────── Vérification (sceaux) ───────────────── -->
    <section class="mx-auto w-full max-w-7xl px-6 py-[clamp(3.5rem,7vw,6rem)]">
      <div class="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        <div>
          <h2 class="text-[clamp(1.75rem,3vw,2.5rem)] font-black tracking-tight text-slate-900" style="text-wrap: balance">
            Chaque professionnel est vérifié à la main.
          </h2>
          <p class="mt-4 max-w-[48ch] text-base leading-relaxed text-slate-500">
            Aucun algorithme. Un membre de notre équipe contrôle la décennale, le Kbis et la zone d'intervention avant toute activation. Un artisan non conforme ne peut pas accéder aux leads.
          </p>
        </div>
        <ul class="reveal space-y-3">
          <li
            v-for="item in [
              { t: 'Assurance décennale valide', d: 'Attestation contrôlée avec date d\'expiration vérifiée.' },
              { t: 'Kbis de moins de 3 mois', d: 'Extrait officiel attestant de l\'activité en cours.' },
              { t: 'Zone d\'intervention confirmée', d: 'L\'artisan intervient bien dans votre secteur géographique.' },
            ]"
            :key="item.t"
            class="reveal-item bento-card flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5"
          >
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-safety text-white">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </span>
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ item.t }}</p>
              <p class="mt-0.5 text-sm text-slate-500">{{ item.d }}</p>
            </div>
          </li>
        </ul>
      </div>
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
