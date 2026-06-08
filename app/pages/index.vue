<script setup lang="ts">
useHead({
  title: 'BÂTI-AXE — Artisans certifiés, projets sécurisés',
  meta: [
    { name: 'description', content: 'Mise en relation entre particuliers et artisans vérifiés (décennale + Kbis). Zone pilote Carrières-sous-Poissy (78).' }
  ]
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
      <div class="max-w-3xl">
        <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">
          Zone pilote · Carrières-sous-Poissy (78)
        </p>
        <h1
          class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-foreground mb-6"
          style="text-wrap: balance"
        >
          Trouvez l'artisan certifié pour vos travaux.
        </h1>
        <p class="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10" style="text-wrap: pretty">
          Chaque professionnel partenaire est vérifié manuellement : décennale en cours de validité, Kbis à jour. Vos coordonnées restent masquées jusqu'au moment du contact.
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <NuxtLink
            to="/simulateur"
            class="inline-flex items-center justify-center gap-2 h-12 px-7 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity"
          >
            Décrire mon projet
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
          <NuxtLink
            to="/pro/claim"
            class="inline-flex items-center justify-center h-12 px-7 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors"
          >
            Je suis artisan
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Before / After visual -->
    <section class="max-w-6xl mx-auto px-6 pb-20">
      <BeforeAfterSlider
        before-src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80"
        after-src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1400&q=80"
        before-label="Avant travaux"
        after-label="Après travaux"
        before-alt="Chantier de rénovation en cours"
        after-alt="Rénovation terminée"
      />
    </section>

    <!-- Divider -->
    <div class="border-t border-border" />

    <!-- How it works -->
    <section class="max-w-6xl mx-auto px-6 py-20 md:py-24">
      <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-12">
        Comment ça marche
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-border">
        <div class="md:pr-10 pb-10 md:pb-0">
          <span class="text-4xl font-black text-border select-none">01</span>
          <h3 class="text-lg font-bold text-foreground mt-4 mb-2">Décrivez votre projet</h3>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Simulateur en 6 étapes : type de travaux, localisation, budget estimé, délai. Moins de 3 minutes.
          </p>
        </div>
        <div class="md:px-10 pb-10 md:pb-0">
          <span class="text-4xl font-black text-border select-none">02</span>
          <h3 class="text-lg font-bold text-foreground mt-4 mb-2">Mise en relation sous 2 min</h3>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Les artisans partenaires de votre zone reçoivent une alerte SMS avec le budget et le type de chantier. Pas vos coordonnées.
          </p>
        </div>
        <div class="md:pl-10">
          <span class="text-4xl font-black text-border select-none">03</span>
          <h3 class="text-lg font-bold text-foreground mt-4 mb-2">Contact débloqué</h3>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Le premier artisan abonné peut vous appeler immédiatement. Pour les autres, vos coordonnées sont accessibles après 24h.
          </p>
        </div>
      </div>
    </section>

    <!-- Divider -->
    <div class="border-t border-border" />

    <!-- Trust anchor -->
    <section class="max-w-6xl mx-auto px-6 py-20 md:py-24">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">Vérification</p>
          <h2 class="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4" style="text-wrap: balance">
            Chaque professionnel est vérifié à la main.
          </h2>
          <p class="text-base text-muted-foreground leading-relaxed">
            Aucun algorithme. Un membre de notre équipe contrôle la décennale, le Kbis et la zone d'intervention avant toute activation. Un artisan non conforme ne peut pas accéder aux leads.
          </p>
        </div>
        <div class="space-y-4">
          <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">Assurance décennale valide</p>
              <p class="text-xs text-muted-foreground mt-0.5">Attestation contrôlée avec date d'expiration vérifiée.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">Kbis de moins de 3 mois</p>
              <p class="text-xs text-muted-foreground mt-0.5">Extrait officiel attestant de l'activité en cours.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-5 border border-border rounded-lg">
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-foreground text-background shrink-0 mt-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">Zone d'intervention confirmée</p>
              <p class="text-xs text-muted-foreground mt-0.5">L'artisan intervient bien dans votre secteur géographique.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA bottom -->
    <div class="border-t border-border" />
    <section class="max-w-6xl mx-auto px-6 py-20 text-center">
      <h2 class="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4" style="text-wrap: balance">
        Prêt à démarrer votre projet ?
      </h2>
      <p class="text-base text-muted-foreground mb-8">
        Décrivez votre besoin en 3 minutes. Nous nous occupons du reste.
      </p>
      <NuxtLink
        to="/simulateur"
        class="inline-flex items-center gap-2 h-12 px-8 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity"
      >
        Commencer la simulation
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
      </NuxtLink>
    </section>
  </div>
</template>
