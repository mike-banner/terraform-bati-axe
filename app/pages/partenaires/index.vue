<script setup lang="ts">
import { APPORTEUR_LABELS } from '~/types/b2b'
import type { Component } from 'vue'
import {
  PhArrowRight,
  PhBlueprint,
  PhBuildings,
  PhCheck,
  PhCheckCircle,
  PhClipboardText,
  PhClock,
  PhFileText,
  PhHeadset,
  PhHouseSimple,
  PhLinkSimple,
  PhMinus,
  PhPlus,
  PhRuler,
  PhShieldCheck,
  PhWarningCircle,
  PhWrench,
} from '@phosphor-icons/vue'

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
    a: 'Chaque entreprise du réseau est auditée en continu par API : activité INSEE conforme, situation juridique saine et assurance décennale à jour. Si un document expire, la capacité sous-traitance de l\'artisan est suspendue automatiquement : aucun artisan non conforme ne peut être sélectionné.',
  },
  {
    q: 'Que devient la relation avec mon client ?',
    a: 'Elle reste entièrement vôtre. BÂTI-AXE intervient comme bras armé technique : nous sélectionnons, encadrons et suivons l\'exécution. Votre client vous voit comme l\'interlocuteur unique, et vous en sortez valorisé.',
  },
  {
    q: 'Travaillez-vous avec les syndics et les copropriétés ?',
    a: 'Oui. Nos entreprises sont habituées aux assemblées générales, respectent le règlement de copropriété et fournissent des rapports de chantier clairs, indispensables pour les gestionnaires.',
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
  'Un réseau audité en continu par API : INSEE, juridique, décennales : suspension automatique en cas d\'expiration.',
  'Des chiffrages réactifs : rappel garanti sous 4h, pré-chiffrage sous 48h pour aider vos acheteurs à se positionner.',
  'Un chargé d\'affaires dédié qui suit votre dossier jusqu\'à la livraison. Vous ne relancez plus personne.',
]

// ─── Services ─────────────────────────────────────────────────────────────────
const services: { icon: Component; title: string; desc: string }[] = [
  {
    icon: PhClock,
    title: 'Chiffrage réactif',
    desc: 'Déposez plans, CCTP ou compromis : pré-chiffrage sous 48h pour vos acheteurs, chiffrage détaillé et rappel sous 4h ouvrées.',
  },
  {
    icon: PhShieldCheck,
    title: 'Artisans audités en continu',
    desc: 'Activité INSEE, situation juridique et assurances décennales vérifiées par API. Suspension automatique si un document expire.',
  },
  {
    icon: PhFileText,
    title: 'Respect strict des plans',
    desc: 'Lecture au millimètre de vos plans et notes de calcul. Matériaux conformes à vos choix, finitions à la hauteur de votre signature.',
  },
  {
    icon: PhHeadset,
    title: 'Chargé d\'affaires dédié',
    desc: 'Un interlocuteur unique analyse vos pièces, sélectionne les entreprises et vous tient informé, du dépôt à la livraison.',
  },
  {
    icon: PhClipboardText,
    title: 'Suivi de chantier transparent',
    desc: 'Rapports d\'avancement clairs, respect du règlement de copropriété, comptes rendus exploitables pour vos clients.',
  },
  {
    icon: PhLinkSimple,
    title: 'Partenariat régulier',
    desc: 'Dossiers prioritaires, tarifs préférentiels et accès au réseau vérifié pour tous vos futurs chantiers.',
  },
]

// ─── Profils (Pour qui) ───────────────────────────────────────────────────────
const professionIcons: Record<string, Component> = {
  architecte: PhRuler,
  bet: PhBlueprint,
  agence_immo: PhHouseSimple,
  syndic: PhBuildings,
  autre: PhWrench,
}

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
      <div class="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-16 md:pb-28">
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-300 mb-6">
          <span class="w-2 h-2 rounded-full bg-copper" />
          Espace Professionnels &amp; Prescripteurs
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-3xl text-balance">
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
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-copper px-8 text-base font-bold text-white shadow-lg shadow-copper/20 hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <PhArrowRight :size="16" weight="bold" />
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
          <PhCheck :size="16" weight="bold" class="text-copper mt-0.5 shrink-0" />
          <p class="text-sm text-foreground leading-snug">{{ p }}</p>
        </div>
      </div>
    </section>

    <!-- ═══ 3. PROBLÈME → SOLUTION ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-2xl md:text-3xl font-bold text-foreground text-center max-w-2xl mx-auto text-balance">
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
            <PhWarningCircle :size="20" class="text-destructive mt-0.5 shrink-0" />
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
            <PhCheckCircle :size="20" class="text-emerald-600 mt-0.5 shrink-0" />
            <p class="text-sm text-foreground leading-relaxed">{{ s }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 4. SERVICES DÉTAILLÉS ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl">
          <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">
            Ce que nous vous proposons, concrètement.
          </h2>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Un service complet du chiffrage à la livraison, pensé pour les professionnels qui n'ont pas le temps
            de chasser les entreprises fiables.
          </p>
        </div>

        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="s in services"
            :key="s.title"
            class="bg-card border border-border rounded-sm p-6 hover:border-copper/30 transition-colors"
          >
            <component :is="s.icon" :size="28" weight="duotone" class="text-copper" />
            <h3 class="mt-4 text-sm font-bold text-foreground">{{ s.title }}</h3>
            <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 5. COMMENT ÇA MARCHE ═══ -->
    <section id="comment-ca-marche" class="max-w-6xl mx-auto px-6 py-20">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">De votre dossier à la livraison, en 4 étapes.</h2>
      </div>

      <div class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="s in steps"
          :key="s.n"
          class="relative bg-card border border-border rounded-sm p-6 pt-8"
        >
          <span class="absolute -top-4 left-6 h-8 w-8 rounded-full bg-copper text-white text-sm font-black flex items-center justify-center">
            {{ s.n }}
          </span>
          <h3 class="text-sm font-bold text-foreground">{{ s.title }}</h3>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ s.desc }}</p>
        </div>
      </div>

      <div class="mt-10 text-center">
        <NuxtLink
          :to="TUNNEL_URL"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-copper px-8 text-base font-bold text-white shadow-lg shadow-copper/20 hover:brightness-110 transition-all"
        >
          Lancer mon dossier
          <PhArrowRight :size="16" weight="bold" />
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ 6. POUR QUI ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">Pensé pour chaque professionnel du bâtiment et de l'immobilier.</h2>
        </div>

        <div class="mt-12 max-w-4xl mx-auto">
          <div
            v-for="(data, key) in APPORTEUR_LABELS"
            :key="key"
            class="flex items-start gap-5 py-6 border-b border-border last:border-0"
          >
            <div class="w-12 h-12 rounded-sm bg-copper/5 border border-copper/15 flex items-center justify-center shrink-0">
              <component :is="professionIcons[key]" :size="26" weight="duotone" class="text-copper" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-foreground">{{ data.label }}</h3>
              <p class="mt-1.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <PhWarningCircle :size="14" class="text-destructive mt-0.5 shrink-0" />
                {{ data.fear }}
              </p>
              <p class="mt-2 text-sm text-foreground font-medium leading-relaxed flex items-start gap-1.5">
                <PhCheck :size="15" weight="bold" class="text-copper mt-0.5 shrink-0" />
                {{ data.promise }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 7. CONFORMITÉ ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-16">
      <div class="bg-card border border-border rounded-sm p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <PhShieldCheck :size="28" class="text-emerald-600" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-foreground">Conformité automatisée, sans effort pour vous</h3>
          <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
            Les entreprises du réseau sont auditées par API : activité INSEE, situation juridique et assurances décennales à jour.
            Suspension automatique en cas d'expiration : un artisan non conforme ne peut jamais être sélectionné pour vos chantiers.
          </p>
        </div>
        <NuxtLink
          :to="TUNNEL_URL"
          class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-copper/40 bg-copper/5 px-6 text-sm font-semibold text-copper hover:bg-copper/10 transition-colors"
        >
          Tester le réseau
          <PhArrowRight :size="14" weight="bold" />
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ 8. FAQ ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-20">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">Vos questions, nos réponses.</h2>
          <p class="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            Un doute qui n'est pas couvert ici ? Écrivez-nous, un chargé d'affaires vous répond sous 4 heures ouvrées.
          </p>
          <a
            href="mailto:partenaires@bati-axe.com"
            class="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <PhArrowRight :size="14" class="rotate-180" />
            Écrire à partenaires@bati-axe.com
          </a>
        </div>

        <div class="border-t border-border">
          <div
            v-for="(f, i) in faqs"
            :key="i"
            class="border-b border-border"
          >
            <button
              class="w-full flex items-center justify-between gap-4 py-5 text-left group"
              @click="openFaq = openFaq === i ? null : i"
              :aria-expanded="openFaq === i"
            >
              <span
                class="text-base font-semibold text-foreground group-hover:text-copper transition-colors"
                :class="openFaq === i ? 'text-copper' : ''"
              >
                {{ f.q }}
              </span>
              <span
                class="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0 transition-all"
                :class="openFaq === i ? 'bg-copper border-copper text-white rotate-45' : 'text-muted-foreground group-hover:border-copper/40'"
              >
                <PhPlus :size="14" weight="bold" />
              </span>
            </button>
            <div v-if="openFaq === i" class="pb-6 pr-10">
              <p class="text-sm text-muted-foreground leading-relaxed max-w-prose">{{ f.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 9. CTA FINAL ═══ -->
    <section class="bg-slate-900">
      <div class="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 class="text-3xl md:text-4xl font-black text-white leading-tight text-balance">
          Un chantier à faire chiffrer, ou un partenariat à construire&nbsp;?
        </h2>
        <p class="mt-4 text-slate-400 leading-relaxed">
          Déposez votre dossier maintenant : un chargé d'affaires vous rappelle sous 4 heures ouvrées,
          avec les bonnes entreprises, déjà auditées.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            :to="TUNNEL_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-copper px-8 text-base font-bold text-white shadow-lg shadow-copper/20 hover:brightness-110 transition-all"
          >
            Déposer un dossier
            <PhArrowRight :size="16" weight="bold" />
          </NuxtLink>
          <a
            href="mailto:partenaires@bati-axe.com"
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
