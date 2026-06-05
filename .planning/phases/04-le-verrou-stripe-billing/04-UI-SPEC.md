# UI-SPEC — Phase 4: Le Verrou & Stripe Billing

**Generated:** 2026-06-05 (v2 — corrigé après audit du code existant)
**Stack:** Nuxt 3 / Vue 3 / shadcn-vue / Tailwind CSS v4
**Référence codebase:** `app/pages/app/dashboard.vue`, `app/pages/index.vue`
**Status:** Ready for planning

---

## Design System — Tokens existants (ne pas inventer de couleurs)

Le site est **monochrome pur**. Tous les tokens sont des niveaux de gris OKLCH sans chroma.
Utiliser **uniquement** les variables CSS shadcn déjà définies dans `app/assets/css/tailwind.css`.

| Usage | Token Tailwind | CSS var | Exemple existant |
|-------|---------------|---------|-----------------|
| Fond de page | `bg-background` | `--background` oklch(1 0 0) | body, pages |
| Fond card | `bg-card` | `--card` oklch(1 0 0) | identique background |
| Fond muted | `bg-muted` | `--muted` oklch(0.97 0 0) | sections secondaires |
| Texte principal | `text-foreground` | `--foreground` oklch(0.145 0 0) | titres, labels |
| Texte secondaire | `text-muted-foreground` | `--muted-foreground` oklch(0.556 0 0) | descriptions, meta |
| Bordure | `border-border` | `--border` oklch(0.922 0 0) | toutes les cards |
| Bouton primaire | `bg-foreground text-background` | — | CTA principal, submit |
| Bouton ghost | `border border-border text-foreground hover:bg-muted` | — | actions secondaires |
| Destructive | `text-destructive` | `--destructive` oklch(0.577 0.245 27.325) | erreurs |

### Accent amber — uniquement pour Premium et états warning
Déjà établi dans `dashboard.vue` pour l'état "En attente" des documents :
```
text-amber-700 border-amber-300 bg-amber-50
```
Réutiliser **exactement** ce triplet pour l'état Premium / flouté. Pas d'autres teintes.

### Ce qu'il ne faut PAS utiliser
- ❌ Pas de `text-sky-*`, `text-emerald-*`, `text-slate-*` (inexistants dans le design system)
- ❌ Pas de `bg-emerald-50`, `bg-slate-100` pour les cards (ça casse la cohérence monochrome)
- ❌ Pas d'import de police — Geist est déjà chargé via `--font-sans` dans `tailwind.css`
- ❌ Pas de librairie d'icônes — SVG inline uniquement (voir section Icônes ci-dessous)

---

## Typographie

**Geist Variable** — déjà appliqué globalement via `font-sans` dans `tailwind.css`. Aucun import à faire.

| Élément | Classes | Exemple dans le code |
|---------|---------|---------------------|
| Titre de page | `text-3xl font-black tracking-tight text-foreground` | `dashboard.vue` ligne 107 |
| Section header | `text-xs font-medium text-muted-foreground tracking-widest uppercase` | `dashboard.vue` ligne 141 |
| Label card | `text-sm font-semibold text-foreground` | `dashboard.vue` ligne 125 |
| Texte corps | `text-sm text-muted-foreground` | partout |
| Meta / date | `text-xs text-muted-foreground` | `dashboard.vue` ligne 108 |

---

## Icônes — SVG inline uniquement

**Aucune librairie.** Tous les icônes existants sont des SVG écrits à la main dans les templates.
Pattern à respecter : `class="w-4 h-4"` (ou `w-3.5 h-3.5` pour les icônes dans les badges), `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `viewBox="0 0 24 24"`.

### Référentiel SVG Phase 4 (HeroIcons outline, cohérent avec l'existant)

```html
<!-- Verrou fermé (lead flouté) -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
</svg>

<!-- Verrou ouvert (lead débloqué) -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
</svg>

<!-- Coche (lead vérifié / débloqué) — même path que dashboard.vue -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
</svg>

<!-- Horloge (countdown / délai) — même path que dashboard.vue -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

<!-- Flèche droite (CTA) — même path que index.vue et dashboard.vue -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
</svg>

<!-- Étoile (Premium) -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
</svg>

<!-- Téléphone -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
</svg>

<!-- Email -->
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
</svg>
```

---

## Composants shadcn-vue existants

Réutiliser tels quels — ne pas recréer :
- `Badge` — avec `variant="outline"` et classes custom pour les états (voir section Badges)
- `Button` — variant `default` (bg-foreground) et `outline` (border-border)
- `Card` / `CardHeader` / `CardContent` — compound pattern
- Accordion shadcn-vue pour la FAQ Premium

---

## Page 1 — `/espace/leads` (Dashboard Leads)

### Layout global
```
max-w-2xl mx-auto px-6 py-16
```
(même conteneur que `dashboard.vue` — cohérence totale)

### En-tête de page
```html
<div class="mb-10">
  <h1 class="text-3xl font-black tracking-tight text-foreground">Mes leads</h1>
  <p class="text-sm text-muted-foreground mt-1">Leads qualifiés pour votre métier</p>
</div>
```

### Banner Premium (BASIC avec leads floutés)
Même pattern que le badge "Vérification en cours" dans `dashboard.vue` :
```html
<div class="flex items-center gap-3 p-4 border border-amber-300 bg-amber-50 rounded-lg mb-8">
  <!-- étoile SVG -->
  <p class="text-sm text-amber-700 flex-1">
    <span class="font-semibold">Passez Premium</span> pour voir les coordonnées immédiatement — 39€/mois, sans engagement.
  </p>
  <NuxtLink to="/espace/premium"
    class="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:opacity-70 transition-opacity">
    Voir l'offre
  </NuxtLink>
</div>
```

### Grid leads
```
grid grid-cols-1 sm:grid-cols-2 gap-4
```

### Card Lead — structure commune
```html
<div class="border border-border rounded-lg divide-y divide-border">
  <!-- En-tête card : catégorie + badge statut -->
  <div class="flex items-center justify-between px-5 py-4">
    <p class="text-sm font-semibold text-foreground">{{ catégorie }}</p>
    <!-- badge statut -->
  </div>
  <!-- Corps : infos visibles + champs masqués -->
  <div class="px-5 py-4 space-y-2">...</div>
  <!-- Footer : CTA -->
  <div class="px-5 py-4">...</div>
</div>
```
Pattern `border border-border rounded-lg divide-y divide-border` — identique à la checklist dans `dashboard.vue`.

### Badges statut — reprendre exactement les classes de `dashboard.vue`

```html
<!-- Flouté (même style que "En attente" document) -->
<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-amber-300 text-amber-700 bg-amber-50">
  <!-- svg verrou fermé -->
  Flouté
</span>

<!-- Débloqué (même style que "Validé" document) -->
<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-foreground/30 text-foreground">
  <!-- svg coche -->
  Débloqué
</span>

<!-- Attribué (même style que "Non envoyé" document) -->
<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-border text-muted-foreground">
  Déjà attribué
</span>
```

### Champs masqués
Le masquage est serveur — le client reçoit `*** *** ***` directement dans la réponse.
Afficher avec `text-muted-foreground font-mono` (pas de `blur` CSS qui rendrait le texte illisible sur mobile) :
```html
<span class="text-muted-foreground font-mono select-none">*** *** ***</span>
```

### Ligne d'info dans la card
```html
<!-- Ligne d'information (budget, délai, champ masqué) -->
<div class="flex items-center gap-2 text-sm">
  <!-- svg icône w-3.5 h-3.5 text-muted-foreground -->
  <span class="text-muted-foreground">{{ label }}</span>
  <span class="text-foreground font-medium">{{ valeur }}</span>
</div>
```

### Countdown (lead flouté BASIC)
```html
<div class="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
  <!-- svg horloge -->
  <span>Disponible dans <span class="font-semibold text-foreground">{{ hours }}h {{ minutes }}min</span></span>
</div>
```

### CTAs par statut

```html
<!-- Flouté → Passer Premium -->
<NuxtLink to="/espace/premium"
  class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity">
  <!-- svg étoile -->
  Passer Premium
</NuxtLink>

<!-- Débloqué → Voir le contact -->
<NuxtLink :to="`/espace/leads/${lead.id}`"
  class="inline-flex items-center justify-center gap-2 w-full h-9 px-4 border border-border text-foreground text-xs font-medium rounded-md hover:bg-muted transition-colors">
  Voir le contact
  <!-- svg flèche -->
</NuxtLink>

<!-- Attribué → aucun CTA, texte informatif -->
<p class="text-xs text-muted-foreground text-center py-1">Ce lead a déjà été attribué</p>
```

### État vide (0 leads)
```html
<div class="py-16 text-center">
  <p class="text-sm font-semibold text-foreground mb-1">Aucun lead pour l'instant</p>
  <p class="text-xs text-muted-foreground">Les leads qualifiés apparaîtront ici dès que l'équipe BÂTI-AXE les valide.</p>
</div>
```

### Skeleton loading
```html
<div v-for="i in 3" :key="i" class="border border-border rounded-lg h-[160px] bg-muted animate-pulse" />
```

---

## Page 2 — `/espace/leads/[id]` (Détail Lead)

### Layout
```
max-w-2xl mx-auto px-6 py-16
```

### Lien retour
```html
<NuxtLink to="/espace/leads"
  class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:opacity-70 transition-opacity mb-8">
  <!-- svg flèche gauche (inverser la flèche droite) -->
  Retour à mes leads
</NuxtLink>
```

### En-tête
```html
<div class="flex items-center gap-2 mb-3">
  <!-- badge statut (même composant que la liste) -->
</div>
<h1 class="text-3xl font-black tracking-tight text-foreground">{{ catégorie }}</h1>
<p class="text-xs text-muted-foreground mt-1">Reçu le {{ date }}</p>
```

### Section infos projet (toujours visible)
```html
<div class="border-t border-border pt-8 mb-8">
  <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Détails du projet</h2>
  <div class="border border-border rounded-lg divide-y divide-border">
    <div class="flex justify-between items-center px-5 py-3">
      <span class="text-sm text-muted-foreground">Budget</span>
      <span class="text-sm font-semibold text-foreground">{{ budget_range }}</span>
    </div>
    <div class="flex justify-between items-center px-5 py-3">
      <span class="text-sm text-muted-foreground">Délai</span>
      <span class="text-sm font-semibold text-foreground">{{ timeline_range }}</span>
    </div>
    <div class="px-5 py-3">
      <span class="text-sm text-muted-foreground block mb-1">Description</span>
      <!-- Débloqué : texte visible | Flouté : *** -->
      <span :class="isUnlocked ? 'text-sm text-foreground' : 'text-sm text-muted-foreground font-mono select-none'">
        {{ isUnlocked ? description : '*** *** ***' }}
      </span>
    </div>
  </div>
</div>
```

### Section contact (conditionnelle)

**Si débloqué :**
```html
<div class="border-t border-border pt-8">
  <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Contact prospect</h2>
  <div class="border border-border rounded-lg divide-y divide-border">
    <div class="flex items-center gap-3 px-5 py-3">
      <!-- svg téléphone text-muted-foreground -->
      <span class="text-sm font-semibold text-foreground">{{ customer_phone }}</span>
    </div>
    <div class="flex items-center gap-3 px-5 py-3">
      <!-- svg email text-muted-foreground -->
      <span class="text-sm font-semibold text-foreground">{{ customer_email }}</span>
    </div>
    <div class="flex items-center gap-3 px-5 py-3">
      <!-- svg localisation text-muted-foreground -->
      <span class="text-sm text-foreground">{{ postal_code }}</span>
    </div>
  </div>
  <div class="flex gap-3 mt-4">
    <a :href="`tel:${customer_phone}`"
      class="flex-1 inline-flex items-center justify-center gap-2 h-10 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors">
      <!-- svg téléphone -->
      Appeler
    </a>
    <a :href="`mailto:${customer_email}`"
      class="flex-1 inline-flex items-center justify-center gap-2 h-10 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors">
      <!-- svg email -->
      Envoyer un email
    </a>
  </div>
</div>
```

**Si flouté :**
```html
<div class="border-t border-border pt-8">
  <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Contact prospect</h2>
  <div class="p-5 border border-amber-300 bg-amber-50 rounded-lg">
    <p class="text-sm text-amber-700 font-semibold mb-1">Coordonnées non disponibles</p>
    <p class="text-xs text-amber-700 mb-4">
      Disponible dans <span class="font-semibold">{{ hours }}h {{ minutes }}min</span> — ou immédiatement avec Premium.
    </p>
    <NuxtLink to="/espace/premium"
      class="inline-flex items-center gap-2 h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity">
      <!-- svg étoile -->
      Passer Premium
    </NuxtLink>
  </div>
</div>
```

---

## Page 3 — `/espace/premium` (Abonnement)

### Layout
```
max-w-2xl mx-auto px-6 py-16
```

### Structure de page
```html
<!-- En-tête -->
<div class="mb-10">
  <p class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">Abonnement</p>
  <h1 class="text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">
    Débloquez vos leads instantanément.
  </h1>
  <p class="text-sm text-muted-foreground mt-2 leading-relaxed">
    Les pros Premium voient les coordonnées du prospect dès la qualification du projet — 72h avant les autres.
  </p>
</div>

<!-- Card prix — seul élément avec amber pour signaler l'importance -->
<div class="border border-amber-300 bg-amber-50 rounded-lg p-6 mb-8">
  <div class="flex items-center justify-between mb-4">
    <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-amber-300 text-amber-700">
      <!-- svg étoile -->
      Premium
    </span>
  </div>
  <p class="text-4xl font-black tracking-tight text-foreground mb-1">39 €<span class="text-lg font-medium text-muted-foreground">/mois</span></p>
  <p class="text-xs text-muted-foreground mb-6">Sans engagement · Annulable à tout moment</p>

  <!-- Features list -->
  <div class="space-y-3 mb-6">
    <div class="flex items-start gap-3">
      <!-- svg coche -->
      <span class="text-sm text-foreground">Accès immédiat aux coordonnées du prospect</span>
    </div>
    <div class="flex items-start gap-3">
      <!-- svg coche -->
      <span class="text-sm text-foreground">Exclusivité 72h avant les pros BASIC</span>
    </div>
    <div class="flex items-start gap-3">
      <!-- svg coche -->
      <span class="text-sm text-foreground">Leads illimités dans votre catégorie</span>
    </div>
  </div>

  <button
    @click="startCheckout"
    :disabled="loading"
    class="inline-flex items-center justify-center gap-2 w-full h-11 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
  >
    <span v-if="!loading">Démarrer Premium — 39€/mois</span>
    <span v-else class="flex items-center gap-2">
      <!-- svg spinner (circle avec arc) ou simple texte -->
      Redirection...
    </span>
  </button>
  <p class="text-xs text-muted-foreground text-center mt-3">Paiement sécurisé par Stripe</p>
</div>

<!-- Comparatif BASIC vs Premium — même style que la checklist dashboard -->
<div class="border-t border-border pt-8 mb-8">
  <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">BASIC vs Premium</h2>
  <div class="border border-border rounded-lg divide-y divide-border">
    <div class="grid grid-cols-3 px-5 py-3 text-xs font-medium text-muted-foreground">
      <span></span>
      <span class="text-center">BASIC</span>
      <span class="text-center">Premium</span>
    </div>
    <!-- Ligne : Voir les leads -->
    <div class="grid grid-cols-3 items-center px-5 py-3">
      <span class="text-sm text-foreground">Voir les leads</span>
      <span class="text-center"><!-- svg coche --></span>
      <span class="text-center"><!-- svg coche --></span>
    </div>
    <!-- Ligne : Coordonnées immédiates -->
    <div class="grid grid-cols-3 items-center px-5 py-3">
      <span class="text-sm text-foreground">Coordonnées immédiates</span>
      <span class="text-center text-muted-foreground">—</span>
      <span class="text-center"><!-- svg coche --></span>
    </div>
    <!-- Ligne : Accès après 72h -->
    <div class="grid grid-cols-3 items-center px-5 py-3">
      <span class="text-sm text-foreground">Accès après 72h</span>
      <span class="text-center"><!-- svg coche --></span>
      <span class="text-center"><!-- svg coche --></span>
    </div>
  </div>
</div>

<!-- FAQ — Accordion shadcn-vue -->
<div class="border-t border-border pt-8">
  <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Questions fréquentes</h2>
  <!-- Accordion items : annulation, post-annulation, sécurité paiement -->
</div>
```

### Bannière succès post-abonnement (`?upgrade=success`)
```html
<div class="flex items-start gap-3 p-4 border border-foreground/30 rounded-lg mb-8">
  <!-- svg coche -->
  <div>
    <p class="text-sm font-semibold text-foreground">Bienvenue dans BÂTI-AXE Premium !</p>
    <p class="text-xs text-muted-foreground mt-0.5">Vos leads sont maintenant accessibles sans délai.</p>
  </div>
</div>
```
Auto-dismiss après 6s. Même style que le badge "Vérifié BÂTI-AXE" dans `dashboard.vue`.

---

## Règles de cohérence globales

1. **Conteneur** : `max-w-2xl mx-auto px-6 py-16` — identique à `dashboard.vue`
2. **Cards** : `border border-border rounded-lg divide-y divide-border` — identique à la checklist steps
3. **Section headers** : `text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4` — identique à "Documents", "Votre profil public"
4. **Liens texte** : `text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity` — identique aux actions dans la checklist
5. **Bouton primaire** : `bg-foreground text-background font-semibold rounded-md hover:opacity-80 transition-opacity`
6. **Bouton secondaire** : `border border-border text-foreground font-medium rounded-md hover:bg-muted transition-colors`
7. **Amber** : uniquement pour l'état Premium/flouté (`border-amber-300 text-amber-700 bg-amber-50`) — déjà présent dans le design system

---

## Skeleton loading
```html
<div class="border border-border rounded-lg h-[160px] bg-muted animate-pulse" />
```

## Gestion d'erreur API
```html
<div class="p-4 border border-border rounded-lg">
  <p class="text-sm font-semibold text-foreground mb-1">Impossible de charger les leads</p>
  <p class="text-xs text-muted-foreground mb-3">Réessayez dans quelques instants.</p>
  <button @click="refresh" class="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
    Réessayer
  </button>
</div>
```

---

*Phase: 04-le-verrou-stripe-billing*
*UI-SPEC v2 — corrigé pour respecter le design system existant (Geist, tokens shadcn monochrome, SVG inline)*
*Generated: 2026-06-05*
