<script setup lang="ts">
import { APPORTEUR_LABELS } from '~/types/b2b'

useHead({ title: 'Partenaires — BÂTI-AXE' })
definePageMeta({ layout: 'default' })

const TUNNEL_URL = '/b2b/partenaires'

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'En combien de temps obtenez-vous un chiffrage ?',
    a: 'Dès le dépôt de votre dossier (plans, CCTP ou compromis), un chargé d\'affaires vous rappelle sous 4 heures ouvrées. Un pré-chiffrage peut vous être remis sous 48h pour aider vos clients à se positionner, puis le chiffrage détaillé suit avec les entreprises retenues.',
  },
  {
    q: 'Comment garantissez-vous la fiabilité des artisans ?',
    a: 'Chaque entreprise du réseau est auditée en continu par API : activité INSEE conforme, situation juridique saine et assurance décennale à jour. Si un document expire, la capacité sous-traitance de l\'artisan est suspendue automatiquement — aucun artisan non conforme ne peut être sélectionné.',
  },
  {
    q: 'Que devient la relation avec mon client ?',
    a: 'Elle reste entièrement vôtre. BÂTI-AXE intervient comme bras armé technique : nous sélectionnons, encadrons et suivons l\'exécution. Votre client vous voit comme l\'interlocuteur unique, et vous en sortez valorisé.',
  },
  {
    q: 'Travaillez-vous avec les syndics et les copropriétés ?',
    a: 'Oui. Nos entreprises sont habituées aux assemblées générales, respectent le règlement de copropriété et fournissent des rapports de chantier clairs — indispensables pour les gestionnaires.',
  },
  {
    q: 'Que proposez-vous pour un partenariat régulier ?',
    a: 'Un traitement prioritaire de vos dossiers, un chargé d\'affaires dédié, des tarifs préférentiels et la possibilité de déposer vos futurs chantiers en quelques clics. Sélectionnez « partenariat régulier » dans le formulaire, nous vous recontactons sous 4h.',
  },
]

const openFaq = ref<number | null>(0)

// ─── Étapes ───────────────────────────────────────────────────────────────────
const steps = [
  {
    n: '01',
    title: 'Déposez votre dossier',
    desc: 'Plans, CCTP, compromis de vente ou simple descriptif. En 2 minutes, via un dépôt sécurisé (jusqu\'à 10 fichiers, 50 Mo chacun).',
  },
  {
    n: '02',
    title: 'Analyse sous 4h',
    desc: 'Un chargé d\'affaires étudie vos pièces, valide le périmètre et vous rappelle avec un premier positionnement.',
  },
  {
    n: '03',
    title: 'Sélection des entreprises',
    desc: 'Nous retenons les artisans qualifiés de votre zone : compétence métier, capacité disponible et documents légaux à jour.',
  },
  {
    n: '04',
    title: 'Suivi jusqu\'au bout',
    desc: 'Vous gardez la relation client, nous nous assurons de la conformité : respect des plans, du calendrier et des engagements.',
  },
]

// ─── Problèmes / Solutions ────────────────────────────────────────────────────
const pains = [
  { icon: '⏳', text: 'Des devis qui mettent 3 semaines et des ventes qui se refroidissent.' },
  { icon: '🛠️', text: 'Des artisans qui ne respectent ni vos plans, ni vos délais, ni vos clients.' },
  { icon: '📞', text: 'Des soirées passées à relancer des entreprises qui ne rappellent jamais.' },
]

const solutions = [
  { icon: '🛡️', text: 'Un réseau audité en continu par API : INSEE, juridique, décennales — suspension automatique en cas d\'expiration.' },
  { icon: '⚡', text: 'Des chiffrages réactifs : rappel garanti sous 4h, pré-chiffrage sous 48h pour aider vos acheteurs à se positionner.' },
  { icon: '🤝', text: 'Un chargé d\'affaires dédié qui suit votre dossier jusqu\'à la livraison. Vous ne relancez plus personne.' },
]

// ─── Services ─────────────────────────────────────────────────────────────────
const services = [
  {
    icon: '📐',
    title: 'Chiffrage réactif',
    desc: 'Déposez plans, CCTP ou compromis : pré-chiffrage sous 48h pour vos acheteurs, chiffrage détaillé et rappel sous 4h ouvrées.',
  },
  {
    icon: '🛡️',
    title: 'Artisans audités en continu',
    desc: 'Activité INSEE, situation juridique et assurances décennales vérifiées par API. Suspension automatique si un document expire.',
  },
  {
    icon: '📋',
    title: 'Respect strict des plans',
    desc: 'Lecture au millimètre de vos plans et notes de calcul. Matériaux conformes à vos choix, finitions à la hauteur de votre signature.',
  },
  {
    icon: '👤',
    title: 'Chargé d\'affaires dédié',
    desc: 'Un interlocuteur unique analyse vos pièces, sélectionne les entreprises et vous tient informé — du dépôt à la livraison.',
  },
  {
    icon: '📦',
    title: 'Suivi de chantier transparent',
    desc: 'Rapports d\'avancement clairs, respect du règlement de copropriété, comptes rendus exploitables pour vos clients.',
  },
  {
    icon: '💼',
    title: 'Partenariat régulier',
    desc: 'Dossiers prioritaires, tarifs préférentiels et accès au réseau vérifié pour tous vos futurs chantiers.',
  },
]

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { value: '4h', label: 'Rappel garanti après dépôt du dossier' },
  { value: '48h', label: 'Pré-chiffrage pour vos acheteurs' },
  { value: '100%', label: 'Décennales vérifiées par API' },
  { value: '24/7', label: 'Dépôt de dossier en ligne sécurisé' },
]
</script>

<template>
  <div class="min-h-screen bg-page">
    <!-- ═══ 1. HERO ═══ -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div class="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-safety/20 blur-3xl" />
      <div class="absolute -bottom-48 -left-32 w-[400px] h-[400px] rounded-full bg-safety/10 blur-3xl" />

      <div class="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300 mb-6">
          <span class="w-2 h-2 rounded-full bg-safety animate-pulse" />
          Espace Professionnels &amp; Prescripteurs
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-3xl">
          Vos chantiers méritent des artisans à la hauteur de vos engagements.
        </h1>
        <p class="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          BÂTI-AXE met à votre disposition un réseau d'artisans audités en continu : chiffrages réactifs,
          respect strict de vos plans et garanties décennales vérifiées par API.
          <strong class="text-slate-200 font-semibold">Vous gardez la relation client, nous sécurisons l'exécution.</strong>
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <NuxtLink
            :to="TUNNEL_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg shadow-safety/25 hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
          <a
            href="#comment-ca-marche"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 transition-all"
          >
            Découvrir le processus
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ 2. BARRE DE CONFIANCE ═══ -->
    <section class="border-b border-border bg-white">
      <div class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div v-for="s in stats" :key="s.label" class="text-center md:text-left">
          <p class="text-3xl font-black text-foreground">{{ s.value }}</p>
          <p class="text-xs text-muted-foreground mt-1 leading-snug">{{ s.label }}</p>
        </div>
      </div>
    </section>

    <!-- ═══ 3. PROBLÈME → SOLUTION ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-2xl md:text-3xl font-bold text-foreground text-center max-w-2xl mx-auto">
        Le vrai coût d'un artisan non fiable, vous le connaissez.
      </h2>

      <div class="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Pains -->
        <div class="space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-destructive mb-4">Ce que vous vivez aujourd'hui</p>
          <div
            v-for="(p, i) in pains"
            :key="i"
            class="flex items-start gap-3 p-4 rounded-sm border border-destructive/20 bg-destructive/5"
          >
            <span class="text-lg mt-0.5">{{ p.icon }}</span>
            <p class="text-sm text-foreground leading-relaxed">{{ p.text }}</p>
          </div>
        </div>

        <!-- Solutions -->
        <div class="space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-4">Ce que BÂTI-AXE change</p>
          <div
            v-for="(s, i) in solutions"
            :key="i"
            class="flex items-start gap-3 p-4 rounded-sm border border-emerald-500/20 bg-emerald-500/5"
          >
            <span class="text-lg mt-0.5">{{ s.icon }}</span>
            <p class="text-sm text-foreground leading-relaxed">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 4. SERVICES DÉTAILLÉS ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-wider text-safety mb-3">Nos services</p>
          <h2 class="text-2xl md:text-3xl font-bold text-foreground">
            Ce que nous vous proposons, concrètement.
          </h2>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Un service complet du chiffrage à la livraison — pensé pour les professionnels qui n'ont pas le temps
            de chasser les entreprises fiables.
          </p>
        </div>

        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="s in services"
            :key="s.title"
            class="bg-card border border-border rounded-sm p-6 hover:border-safety/30 hover:shadow-lg transition-all"
          >
            <span class="text-2xl">{{ s.icon }}</span>
            <h3 class="mt-3 text-sm font-bold text-foreground">{{ s.title }}</h3>
            <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 5. COMMENT ÇA MARCHE ═══ -->
    <section id="comment-ca-marche" class="max-w-6xl mx-auto px-6 py-20">
      <div class="max-w-2xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-wider text-safety mb-3">Comment ça marche</p>
        <h2 class="text-2xl md:text-3xl font-bold text-foreground">De votre dossier à la livraison, en 4 étapes.</h2>
      </div>

      <div class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="s in steps"
          :key="s.n"
          class="relative bg-card border border-border rounded-sm p-6 pt-8"
        >
          <span class="absolute -top-4 left-6 h-8 w-8 rounded-full bg-safety text-white text-sm font-black flex items-center justify-center shadow-md shadow-safety/30">
            {{ s.n }}
          </span>
          <h3 class="text-sm font-bold text-foreground">{{ s.title }}</h3>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
        </div>
      </div>

      <div class="mt-10 text-center">
        <NuxtLink
          :to="TUNNEL_URL"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg shadow-safety/25 hover:brightness-110 transition-all"
        >
          Lancer mon dossier
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ 6. POUR QUI ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl mx-auto text-center">
          <p class="text-xs font-bold uppercase tracking-wider text-safety mb-3">Pour qui ?</p>
          <h2 class="text-2xl md:text-3xl font-bold text-foreground">Pensé pour chaque professionnel du bâtiment et de l'immobilier.</h2>
        </div>

        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(data, key) in APPORTEUR_LABELS"
            :key="key"
            class="bg-card border border-border rounded-sm p-6 hover:border-safety/30 transition-colors"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">{{ data.icon }}</span>
              <div>
                <h3 class="text-sm font-bold text-foreground">{{ data.label }}</h3>
                <p class="text-xs text-muted-foreground mt-1 italic">{{ data.fear }}</p>
                <p class="text-sm text-foreground mt-2 font-medium">{{ data.promise }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 7. CONFORMITÉ ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-16">
      <div class="bg-card border border-border rounded-sm p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-foreground">Conformité automatisée, sans effort pour vous</h3>
          <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
            Les entreprises du réseau sont auditées par API : activité INSEE, situation juridique et assurances décennales à jour.
            Suspension automatique en cas d'expiration — un artisan non conforme ne peut jamais être sélectionné pour vos chantiers.
          </p>
        </div>
        <NuxtLink
          :to="TUNNEL_URL"
          class="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-safety/40 bg-safety/5 px-6 text-sm font-semibold text-safety hover:bg-safety/10 transition-all"
        >
          Tester le réseau
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ 8. FAQ ═══ -->
    <section class="max-w-3xl mx-auto px-6 py-20">
      <div class="text-center">
        <p class="text-xs font-bold uppercase tracking-wider text-safety mb-3">FAQ</p>
        <h2 class="text-2xl md:text-3xl font-bold text-foreground">Vos questions, nos réponses.</h2>
      </div>

      <div class="mt-10 space-y-3">
        <div
          v-for="(f, i) in faqs"
          :key="i"
          class="bg-card border border-border rounded-sm overflow-hidden"
        >
          <button
            class="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
            @click="openFaq = openFaq === i ? null : i"
          >
            <span class="text-sm font-semibold text-foreground">{{ f.q }}</span>
            <svg
              class="w-4 h-4 text-muted-foreground shrink-0 transition-transform"
              :class="openFaq === i ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            ><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-if="openFaq === i" class="px-6 pb-5">
            <p class="text-sm text-muted-foreground leading-relaxed">{{ f.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 9. CTA FINAL ═══ -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-safety/20 blur-3xl" />

      <div class="relative max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 class="text-3xl md:text-4xl font-black text-white leading-tight">
          Un chantier à faire chiffrer, ou un partenariat à construire&nbsp;?
        </h2>
        <p class="mt-4 text-slate-400 leading-relaxed">
          Déposez votre dossier maintenant — un chargé d'affaires vous rappelle sous 4 heures ouvrées,
          avec les bonnes entreprises, déjà auditées.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            :to="TUNNEL_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg shadow-safety/25 hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
          <a
            href="mailto:partenaires@batiaxe.fr"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 transition-all"
          >
            Nous écrire
          </a>
        </div>
        <p class="mt-6 text-xs text-slate-500">Dépôt sécurisé · Réponse sous 4h ouvrées · Sans engagement</p>
      </div>
    </section>
  </div>
</template>
