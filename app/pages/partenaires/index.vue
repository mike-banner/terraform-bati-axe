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
  'Des devis qui mettent 3 semaines et des ventes qui se refroidissent.',
  'Des artisans qui ne respectent ni vos plans, ni vos délais, ni vos clients.',
  'Des soirées passées à relancer des entreprises qui ne rappellent jamais.',
]

const solutions = [
  'Un réseau audité en continu par API : INSEE, juridique, décennales — suspension automatique en cas d\'expiration.',
  'Des chiffrages réactifs : rappel garanti sous 4h, pré-chiffrage sous 48h pour aider vos acheteurs à se positionner.',
  'Un chargé d\'affaires dédié qui suit votre dossier jusqu\'à la livraison. Vous ne relancez plus personne.',
]

// ─── Services ─────────────────────────────────────────────────────────────────
const services = [
  {
    icon: 'clock',
    title: 'Chiffrage réactif',
    desc: 'Déposez plans, CCTP ou compromis : pré-chiffrage sous 48h pour vos acheteurs, chiffrage détaillé et rappel sous 4h ouvrées.',
  },
  {
    icon: 'shield',
    title: 'Artisans audités en continu',
    desc: 'Activité INSEE, situation juridique et assurances décennales vérifiées par API. Suspension automatique si un document expire.',
  },
  {
    icon: 'file',
    title: 'Respect strict des plans',
    desc: 'Lecture au millimètre de vos plans et notes de calcul. Matériaux conformes à vos choix, finitions à la hauteur de votre signature.',
  },
  {
    icon: 'user',
    title: 'Chargé d\'affaires dédié',
    desc: 'Un interlocuteur unique analyse vos pièces, sélectionne les entreprises et vous tient informé — du dépôt à la livraison.',
  },
  {
    icon: 'clipboard',
    title: 'Suivi de chantier transparent',
    desc: 'Rapports d\'avancement clairs, respect du règlement de copropriété, comptes rendus exploitables pour vos clients.',
  },
  {
    icon: 'link',
    title: 'Partenariat régulier',
    desc: 'Dossiers prioritaires, tarifs préférentiels et accès au réseau vérifié pour tous vos futurs chantiers.',
  },
]

// ─── Promesses (barre de confiance) ───────────────────────────────────────────
const promises = [
  'Rappel garanti sous 4h après dépôt du dossier',
  'Pré-chiffrage sous 48h pour vos acheteurs',
  'Décennales vérifiées par API',
  'Dépôt de dossier sécurisé 24/7',
]
</script>

<template>
  <div class="min-h-screen bg-page">
    <!-- ═══ 1. HERO ═══ -->
    <section class="bg-slate-900">
      <div class="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-300 mb-6">
          <span class="w-2 h-2 rounded-full bg-safety" />
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
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
          <a
            href="#comment-ca-marche"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-8 text-base font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Découvrir le processus
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ 2. PROMESSES ═══ -->
    <section class="border-b border-border bg-white">
      <div class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        <div v-for="p in promises" :key="p" class="flex items-start gap-2.5">
          <svg class="w-4 h-4 mt-0.5 text-safety shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-sm text-foreground leading-snug">{{ p }}</p>
        </div>
      </div>
    </section>

    <!-- ═══ 3. PROBLÈME → SOLUTION ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-2xl md:text-3xl font-bold text-foreground text-center max-w-2xl mx-auto">
        Le vrai coût d'un artisan non fiable, vous le connaissez.
      </h2>

      <div class="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="space-y-3">
          <p class="text-sm font-bold text-destructive mb-4">Ce que vous vivez aujourd'hui</p>
          <div
            v-for="(p, i) in pains"
            :key="i"
            class="flex items-start gap-3 p-4 rounded-sm border border-destructive/20 bg-destructive/5"
          >
            <svg class="w-5 h-5 mt-0.5 text-destructive shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
            <p class="text-sm text-foreground leading-relaxed">{{ p }}</p>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-sm font-bold text-emerald-600 mb-4">Ce que BÂTI-AXE change</p>
          <div
            v-for="(s, i) in solutions"
            :key="i"
            class="flex items-start gap-3 p-4 rounded-sm border border-emerald-500/20 bg-emerald-500/5"
          >
            <svg class="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-sm text-foreground leading-relaxed">{{ s }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 4. SERVICES DÉTAILLÉS ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl">
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
            class="bg-card border border-border rounded-sm p-6 hover:border-safety/30 transition-colors"
          >
            <svg v-if="s.icon === 'clock'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg>
            <svg v-else-if="s.icon === 'shield'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 2.5V11c0 4.5-3 7.5-7 9.5C8 18.5 5 15.5 5 11V5.5L12 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 11.5l2 2 4-4"/></svg>
            <svg v-else-if="s.icon === 'file'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7l-5-5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 2v5h5M9 13h6M9 17h4"/></svg>
            <svg v-else-if="s.icon === 'user'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 21c.5-3.5 3.5-5.5 7.5-5.5s7 2 7.5 5.5"/></svg>
            <svg v-else-if="s.icon === 'clipboard'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 4a1.5 1.5 0 013 0v1H9V4z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h4"/></svg>
            <svg v-else-if="s.icon === 'link'" class="w-6 h-6 text-safety" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07L12 4.93"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 10a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07L12 19.07"/></svg>
            <h3 class="mt-4 text-sm font-bold text-foreground">{{ s.title }}</h3>
            <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 5. COMMENT ÇA MARCHE ═══ -->
    <section id="comment-ca-marche" class="max-w-6xl mx-auto px-6 py-20">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-2xl md:text-3xl font-bold text-foreground">De votre dossier à la livraison, en 4 étapes.</h2>
      </div>

      <div class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="s in steps"
          :key="s.n"
          class="relative bg-card border border-border rounded-sm p-6 pt-8"
        >
          <span class="absolute -top-4 left-6 h-8 w-8 rounded-full bg-safety text-white text-sm font-black flex items-center justify-center">
            {{ s.n }}
          </span>
          <h3 class="text-sm font-bold text-foreground">{{ s.title }}</h3>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
        </div>
      </div>

      <div class="mt-10 text-center">
        <NuxtLink
          :to="TUNNEL_URL"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg hover:brightness-110 transition-all"
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
          <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 2.5V11c0 4.5-3 7.5-7 9.5C8 18.5 5 15.5 5 11V5.5L12 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 11.5l2 2 4-4"/></svg>
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
          class="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-safety/40 bg-safety/5 px-6 text-sm font-semibold text-safety hover:bg-safety/10 transition-colors"
        >
          Tester le réseau
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ 8. FAQ ═══ -->
    <section class="max-w-3xl mx-auto px-6 py-20">
      <div class="text-center">
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
    <section class="bg-slate-900">
      <div class="max-w-3xl mx-auto px-6 py-20 text-center">
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
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </NuxtLink>
          <a
            href="mailto:partenaires@batiaxe.fr"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-8 text-base font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Nous écrire
          </a>
        </div>
        <p class="mt-6 text-xs text-slate-500">Dépôt sécurisé · Réponse sous 4h ouvrées · Sans engagement</p>
      </div>
    </section>
  </div>
</template>
