<script setup lang="ts">
import {
  PhArrowRight,
  PhBell,
  PhCheck,
  PhEyeSlash,
  PhFileText,
  PhIdentificationCard,
  PhLightning,
  PhMapPinLine,
  PhPlus,
  PhShieldCheck,
  PhUsersThree,
} from '@phosphor-icons/vue'

useHead({ title: 'Artisans — BÂTI-AXE' })
useSeoMeta({
  description: 'Recevez les projets de particuliers des Yvelines qui correspondent à vos métiers. Inscription gratuite, 3 leads offerts pour démarrer.',
})
definePageMeta({ layout: 'default' })

const SIGNUP_URL = '/pro/claim?mode=inscription'
const LOGIN_URL = '/pro/claim'

const promises = [
  'Inscription gratuite',
  '3 leads offerts pour démarrer',
  'Uniquement les projets de vos métiers',
  'Sans engagement en mensuel',
]

const steps = [
  { n: '01', icon: PhIdentificationCard, title: 'Créez votre compte', desc: 'Votre SIRET suffit : la raison sociale est récupérée automatiquement. Choisissez vos métiers.' },
  { n: '02', icon: PhFileText, title: 'Déposez vos justificatifs', desc: 'Kbis et attestation décennale à jour. L\'attestation RGE est facultative, elle ouvre les chantiers de rénovation énergétique.' },
  { n: '03', icon: PhBell, title: 'Recevez les projets', desc: 'Une alerte par e-mail dès qu\'un particulier dépose un projet dans vos métiers : type de travaux, budget, délai.' },
  { n: '04', icon: PhLightning, title: 'Débloquez et contactez', desc: 'Vous choisissez les projets qui vous intéressent et accédez aux coordonnées du particulier.' },
]

const requirements = [
  { icon: PhIdentificationCard, title: 'Un SIRET actif', desc: 'Vérifié auprès des registres officiels à l\'inscription.' },
  { icon: PhShieldCheck, title: 'Une décennale à jour', desc: 'Elle doit couvrir les métiers que vous déclarez. L\'accès aux leads est suspendu automatiquement à son expiration.' },
  { icon: PhFileText, title: 'Un Kbis', desc: 'Déposé depuis votre espace, au format PDF, JPG ou PNG.' },
  { icon: PhUsersThree, title: 'Spécialiste ou entreprise générale', desc: 'Un spécialiste déclare 1 ou 2 métiers. Une entreprise générale peut en déclarer plusieurs, après validation par notre équipe.' },
]

const faqs = [
  {
    q: 'Combien ça coûte ?',
    a: 'L\'inscription est gratuite et vos 3 premiers leads sont offerts dès que vos documents sont déposés. Ensuite, l\'abonnement Premium se prend par zone : à partir de 190 €/mois sans engagement pour une zone, 350 €/mois pour tout le département. En annuel, à partir de 150 €/mois.',
  },
  {
    q: 'Quels projets vais-je recevoir ?',
    a: 'Uniquement ceux qui correspondent aux métiers de votre profil. Les chantiers de rénovation énergétique (pompe à chaleur, isolation, solaire…) sont réservés aux entreprises RGE dont la décennale est valide.',
  },
  {
    q: 'Où se trouvent les chantiers ?',
    a: 'BÂTI-AXE démarre dans les Yvelines (78), découpées en 4 zones : Versailles, Saint-Germain-en-Laye, Mantes et Rambouillet. Avec Premium, vous choisissez les zones où vous intervenez.',
  },
  {
    q: 'Les coordonnées des particuliers sont-elles visibles tout de suite ?',
    a: 'Non. Avant déblocage, vous voyez le type de travaux, le budget et le délai, mais pas le nom ni le téléphone. Les coordonnées s\'affichent quand vous débloquez le projet, avec un lead offert ou l\'abonnement Premium.',
  },
  {
    q: 'Que se passe-t-il si ma décennale expire ?',
    a: 'L\'accès aux leads est suspendu automatiquement. Déposez votre nouvelle attestation depuis votre espace pour le retrouver.',
  },
  {
    q: 'Je reçois aussi des appels d\'offres de professionnels ?',
    a: 'Oui. Votre abonnement de zone donne aussi accès aux appels d\'offres déposés par nos partenaires (syndics, architectes, bureaux d\'études) dans vos métiers.',
  },
]

const openFaq = ref<number | null>(0)
</script>

<template>
  <div class="min-h-screen bg-page">
    <!-- ═══ 1. HERO ═══ -->
    <section class="bg-slate-900">
      <div class="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-16 md:pb-28">
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-300 mb-6">
          <span class="w-2 h-2 rounded-full bg-safety" />
          Espace Artisans · Yvelines (78)
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-3xl text-balance">
          Des projets de particuliers près de chez vous, sans démarchage.
        </h1>
        <p class="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Les particuliers décrivent leurs travaux sur BÂTI-AXE. Vous recevez ceux qui correspondent à vos métiers,
          avec le budget et le délai, et vous choisissez lesquels débloquer.
          <strong class="text-slate-200 font-semibold">Pas de devis à l'aveugle, pas de prospection.</strong>
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <NuxtLink
            :to="SIGNUP_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg shadow-safety/20 hover:brightness-110 transition-all"
          >
            Créer mon compte artisan
            <PhArrowRight :size="16" weight="bold" />
          </NuxtLink>
          <NuxtLink
            :to="LOGIN_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-8 text-base font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            J'ai déjà un compte
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══ 2. PROMESSES ═══ -->
    <section class="border-b border-border bg-white">
      <div class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        <div v-for="p in promises" :key="p" class="flex items-start gap-2.5">
          <PhCheck :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />
          <p class="text-sm text-foreground leading-snug">{{ p }}</p>
        </div>
      </div>
    </section>

    <!-- ═══ 3. COMMENT ÇA MARCHE ═══ -->
    <section id="comment-ca-marche" class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-2xl md:text-3xl font-bold text-foreground max-w-2xl text-balance">
        De l'inscription au premier chantier, en 4 étapes.
      </h2>
      <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="s in steps"
          :key="s.n"
          class="bg-card border border-border rounded-sm p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <component :is="s.icon" :size="28" weight="duotone" class="text-safety" />
            <span class="text-xs font-mono text-muted-foreground">{{ s.n }}</span>
          </div>
          <h3 class="text-base font-bold text-foreground">{{ s.title }}</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">{{ s.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ═══ 4. CE QU'ON VOUS DEMANDE ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20">
        <div class="max-w-2xl">
          <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">
            Ce qu'on vous demande.
          </h2>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Les particuliers viennent chercher des artisans assurés. Ces conditions protègent leur confiance, et donc la vôtre.
          </p>
        </div>
        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="r in requirements"
            :key="r.title"
            class="flex items-start gap-4 p-6 rounded-sm border border-border bg-card"
          >
            <component :is="r.icon" :size="24" weight="duotone" class="text-safety shrink-0 mt-0.5" />
            <div>
              <h3 class="text-base font-bold text-foreground">{{ r.title }}</h3>
              <p class="mt-1 text-sm text-muted-foreground leading-relaxed">{{ r.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 5. TARIFS ═══ -->
    <section class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-2xl md:text-3xl font-bold text-foreground max-w-2xl text-balance">
        Commencez gratuitement, passez Premium quand vous voulez.
      </h2>
      <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-8 rounded-sm border border-border bg-card">
          <p class="text-sm font-semibold text-muted-foreground">Découverte</p>
          <p class="mt-2 text-4xl font-black text-foreground">0 €</p>
          <ul class="mt-6 space-y-3 text-sm text-foreground">
            <li class="flex items-start gap-2.5"><PhCheck :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />Profil public et alertes e-mail</li>
            <li class="flex items-start gap-2.5"><PhCheck :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />3 leads offerts, documents déposés</li>
            <li class="flex items-start gap-2.5"><PhEyeSlash :size="16" weight="bold" class="text-muted-foreground mt-0.5 shrink-0" />Ensuite, coordonnées masquées</li>
          </ul>
        </div>
        <div class="p-8 rounded-sm border-2 border-safety bg-card">
          <p class="text-sm font-semibold text-safety">Premium, par zone</p>
          <p class="mt-2 text-4xl font-black text-foreground">dès 190 €<span class="text-base font-semibold text-muted-foreground">/mois</span></p>
          <p class="mt-1 text-sm text-muted-foreground">Sans engagement · 350 €/mois pour tout le 78 · dès 150 €/mois en annuel</p>
          <ul class="mt-6 space-y-3 text-sm text-foreground">
            <li class="flex items-start gap-2.5"><PhCheck :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />Coordonnées accessibles sans limite</li>
            <li class="flex items-start gap-2.5"><PhMapPinLine :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />Vous choisissez vos zones</li>
            <li class="flex items-start gap-2.5"><PhCheck :size="16" weight="bold" class="text-safety mt-0.5 shrink-0" />Appels d'offres des partenaires professionnels</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ═══ 6. FAQ ═══ -->
    <section class="bg-white border-y border-border">
      <div class="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <h2 class="text-2xl md:text-3xl font-bold text-foreground text-balance">Vos questions, nos réponses.</h2>
        </div>
        <div class="border-t border-border">
          <div v-for="(f, i) in faqs" :key="i" class="border-b border-border">
            <button
              class="w-full flex items-center justify-between gap-4 py-5 text-left group"
              :aria-expanded="openFaq === i"
              @click="openFaq = openFaq === i ? null : i"
            >
              <span
                class="text-base font-semibold text-foreground group-hover:text-safety transition-colors"
                :class="openFaq === i ? 'text-safety' : ''"
              >
                {{ f.q }}
              </span>
              <span
                class="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0 transition-all"
                :class="openFaq === i ? 'bg-safety border-safety text-white rotate-45' : 'text-muted-foreground group-hover:border-safety/40'"
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

    <!-- ═══ 7. CTA FINAL ═══ -->
    <section class="bg-slate-900">
      <div class="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 class="text-3xl md:text-4xl font-black text-white leading-tight text-balance">
          Prêt à recevoir vos premiers projets&nbsp;?
        </h2>
        <p class="mt-4 text-slate-400 leading-relaxed">
          Créez votre compte avec votre SIRET, déposez vos justificatifs, et vos 3 premiers leads sont offerts.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            :to="SIGNUP_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-safety px-8 text-base font-bold text-white shadow-lg shadow-safety/20 hover:brightness-110 transition-all"
          >
            Créer mon compte artisan
            <PhArrowRight :size="16" weight="bold" />
          </NuxtLink>
          <NuxtLink
            :to="LOGIN_URL"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-8 text-base font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            J'ai déjà un compte
          </NuxtLink>
        </div>
        <p class="mt-6 text-xs text-slate-500">Inscription gratuite · Sans engagement en mensuel</p>
      </div>
    </section>
  </div>
</template>
