<script setup lang="ts">
useHead({
  title: 'BÂTI-AXE — Artisans certifiés, projets sécurisés',
  meta: [
    { name: 'description', content: 'Mise en relation entre particuliers et artisans vérifiés (décennale + Kbis). Zone pilote Carrières-sous-Poissy (78).' }
  ]
})

// Image chantier vérifiée (résout 200). À remplacer à terme par un asset projet.
const heroPhoto = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
</script>

<template>
  <div>
    <!-- ───────────────── Hero split : texte crème / photo chantier ───────────────── -->
    <section class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] pt-[clamp(3rem,7vw,6rem)] pb-[clamp(3rem,6vw,5rem)]">
      <div class="grid items-center gap-[clamp(2rem,5vw,4.5rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <!-- Colonne texte -->
        <div class="reveal">
          <div class="reveal-item inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-sm text-foreground">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Zone pilote · Carrières-sous-Poissy (78)
          </div>

          <h1
            class="reveal-item mt-6 font-heading text-display text-foreground"
            style="text-wrap: balance"
          >
            Trouvez l'artisan certifié pour vos travaux.
          </h1>

          <p class="reveal-item mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground" style="text-wrap: pretty">
            Chaque professionnel partenaire est vérifié manuellement : décennale en cours de validité, Kbis à jour. Vos coordonnées restent masquées jusqu'au moment du contact.
          </p>

          <div class="reveal-item mt-9 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/simulateur"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-7 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Décrire mon projet
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </NuxtLink>
            <NuxtLink
              to="/pro/claim"
              class="inline-flex h-12 items-center justify-center rounded-md border border-border-strong px-7 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Je suis artisan
            </NuxtLink>
          </div>

          <p class="reveal-item mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <svg class="h-4 w-4 text-brand-ink" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Décennale et Kbis contrôlés à la main, jamais par un algorithme.
          </p>
        </div>

        <!-- Colonne photo chantier, encadrée façon « pièce vérifiée » -->
        <div class="reveal-item relative">
          <div class="relative overflow-hidden rounded-lg border border-border-strong bg-surface-sable">
            <img
              :src="heroPhoto"
              alt="Chantier de rénovation en cours, mur en briques apparentes"
              class="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              loading="eager"
              fetchpriority="high"
            >
            <!-- Sceau de vérification -->
            <div class="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-md bg-brand px-3.5 py-2 text-brand-foreground shadow-lg">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              <span class="text-sm font-semibold">Pro vérifié à la main</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── Bandeau béton plein écran (manifeste) ───────────────── -->
    <section class="w-full bg-brand text-brand-foreground">
      <div class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] py-[clamp(3rem,7vw,5.5rem)]">
        <p class="max-w-[24ch] font-heading text-[clamp(1.75rem,3.5vw,3rem)] font-medium leading-[1.1]" style="text-wrap: balance">
          La confiance, dans le bâtiment, ça se prouve. Pas ça s'annonce.
        </p>
        <p class="mt-5 max-w-[52ch] text-base leading-relaxed text-brand-foreground/85">
          Un artisan non conforme n'accède jamais à vos coordonnées. Décennale expirée, Kbis manquant, zone hors secteur : c'est non. Vous parlez uniquement à des professionnels en règle.
        </p>
      </div>
    </section>

    <!-- ───────────────── Comment ça marche (process en 3 temps) ───────────────── -->
    <section class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] py-[clamp(3.5rem,7vw,6rem)]">
      <h2 class="font-heading text-3xl font-medium text-foreground" style="text-wrap: balance">Comment ça marche</h2>
      <div class="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-3 md:divide-x md:divide-border">
        <div class="md:pr-10">
          <span class="font-heading text-5xl font-semibold text-brand-ink select-none">01</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-foreground">Décrivez votre projet</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Simulateur en 6 étapes : type de travaux, localisation, budget estimé, délai. Moins de 3 minutes.
          </p>
        </div>
        <div class="md:px-10">
          <span class="font-heading text-5xl font-semibold text-brand-ink select-none">02</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-foreground">Mise en relation sous 2 min</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Les artisans partenaires de votre zone reçoivent une alerte avec le budget et le type de chantier. Pas vos coordonnées.
          </p>
        </div>
        <div class="md:pl-10">
          <span class="font-heading text-5xl font-semibold text-brand-ink select-none">03</span>
          <h3 class="mt-4 mb-2 text-lg font-semibold text-foreground">Contact débloqué</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Le premier artisan abonné peut vous appeler immédiatement. Pour les autres, vos coordonnées sont accessibles après 24h.
          </p>
        </div>
      </div>
    </section>

    <div class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)]"><div class="border-t border-border" /></div>

    <!-- ───────────────── Preuve : avant / après ───────────────── -->
    <section class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="mb-10 max-w-[52ch]">
        <h2 class="font-heading text-3xl font-medium text-foreground" style="text-wrap: balance">Le résultat, pas la promesse</h2>
        <p class="mt-3 text-base leading-relaxed text-muted-foreground">
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

    <div class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)]"><div class="border-t border-border" /></div>

    <!-- ───────────────── Vérification (sceaux) ───────────────── -->
    <section class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="grid grid-cols-1 items-start gap-[clamp(2rem,5vw,4rem)] md:grid-cols-2">
        <div>
          <h2 class="font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-medium text-foreground" style="text-wrap: balance">
            Chaque professionnel est vérifié à la main.
          </h2>
          <p class="mt-4 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
            Aucun algorithme. Un membre de notre équipe contrôle la décennale, le Kbis et la zone d'intervention avant toute activation. Un artisan non conforme ne peut pas accéder aux leads.
          </p>
        </div>
        <ul class="space-y-3">
          <li
            v-for="item in [
              { t: 'Assurance décennale valide', d: 'Attestation contrôlée avec date d\'expiration vérifiée.' },
              { t: 'Kbis de moins de 3 mois', d: 'Extrait officiel attestant de l\'activité en cours.' },
              { t: 'Zone d\'intervention confirmée', d: 'L\'artisan intervient bien dans votre secteur géographique.' },
            ]"
            :key="item.t"
            class="flex items-start gap-4 rounded-md border border-border bg-surface p-5"
          >
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </span>
            <div>
              <p class="text-sm font-semibold text-foreground">{{ item.t }}</p>
              <p class="mt-0.5 text-sm text-muted-foreground">{{ item.d }}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- ───────────────── CTA final ───────────────── -->
    <section class="w-full border-t border-border-strong bg-surface-sable">
      <div class="mx-auto w-full max-w-[1400px] px-[clamp(1.25rem,5vw,4rem)] py-[clamp(3.5rem,7vw,5.5rem)] text-center">
        <h2 class="mx-auto max-w-[20ch] font-heading text-[clamp(1.75rem,3.5vw,3rem)] font-medium text-foreground" style="text-wrap: balance">
          Prêt à démarrer votre projet ?
        </h2>
        <p class="mx-auto mt-4 max-w-[44ch] text-base text-muted-foreground">
          Décrivez votre besoin en 3 minutes. Nous nous occupons de la mise en relation.
        </p>
        <NuxtLink
          to="/simulateur"
          class="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-brand px-8 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Commencer la simulation
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Entrée sobre du hero — n'enrichit qu'un contenu déjà visible. */
@media (prefers-reduced-motion: no-preference) {
  .reveal-item {
    animation: reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .reveal .reveal-item:nth-child(1) { animation-delay: 0.02s; }
  .reveal .reveal-item:nth-child(2) { animation-delay: 0.08s; }
  .reveal .reveal-item:nth-child(3) { animation-delay: 0.14s; }
  .reveal .reveal-item:nth-child(4) { animation-delay: 0.20s; }
  .reveal .reveal-item:nth-child(5) { animation-delay: 0.26s; }
}

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
