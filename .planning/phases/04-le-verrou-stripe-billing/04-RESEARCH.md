# Phase 4: Le Verrou & Stripe Billing — Research

**Researched:** 2026-06-05
**Domain:** Stripe Checkout/Webhooks, Nitro API server-side masking, pg_cron, Supabase RLS
**Confidence:** HIGH (stack confirmé, patterns vérifiés sur sources officielles)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Filtre de matching = catégorie uniquement (pas zone géographique).
- **D-02:** Un pro a une seule catégorie en Phase 4.
- **D-03:** Leads créés via l'API admin `/api/v1/admin/qualify` au moment de la qualification : `projects.status = 'qualified'` + insert leads pour chaque pro `is_verified = true` de la même catégorie.
- **D-04:** Pas de trigger DB ni cron pour la création des leads — logique applicative Nitro.
- **D-05:** Lead flouté BASIC : catégorie + budget + délai visibles. Commune, nom, téléphone, email, adresse masqués (`*** *** ***`).
- **D-06:** Pro Premium (`subscription_status = 'active'`) → coordonnées complètes immédiatement sur tous les leads.
- **D-07:** Pro BASIC → coordonnées visibles uniquement si `leads.unlocked_at IS NOT NULL AND leads.unlocked_at <= NOW()`.
- **D-08:** `leads.unlocked_at` = `created_at + 72h` par pg_cron. Si un Premium `claimed` le lead, les BASIC voient "Déjà attribué" (pas les coordonnées).
- **D-09:** Floutage exclusivement côté serveur (ADR-004 — contrainte dure). Jamais côté client.
- **D-10:** Lead `claimed` → badge "Déjà attribué" pour les pros BASIC, pas de CTA.
- **D-11:** Modèle abonnement mensuel Stripe. Pas de crédit par lead.
- **D-12:** Prix 39€/mois via `STRIPE_PRICE_ID` env var (ajustable Stripe Dashboard sans déploiement).
- **D-13:** Checkout Stripe depuis page dédiée `/espace/premium` (pas un modal).
- **D-14:** Webhook Stripe : `checkout.session.completed` → `'active'`, `customer.subscription.deleted` → `'canceled'`, `invoice.payment_failed` → `'unpaid'`.
- **D-15:** `professionals.stripe_customer_id` stocké lors du premier checkout.
- **D-16:** Dashboard leads : page séparée `/espace/leads` (pas un onglet dashboard).
- **D-17:** Layout cards (pas tableau). Card : catégorie, budget, délai, badge statut, CTA contextuel.
- **D-18:** CTA contextuel : flouté → "Passer Premium" + compte à rebours ; débloqué → "Voir le contact" ; pris → badge "Déjà attribué".
- **D-19:** Page détail `/espace/leads/[id]` : infos complètes + coordonnées si débloqué.

### Claude's Discretion

- Structure précise de la page `/espace/premium` (copywriting, layout proposition de valeur)
- Pagination ou infinite scroll sur `/espace/leads`
- Gestion portail Stripe (annulation, mise à jour CB) via `customer.createPortalSession`
- Ordre de tri des leads (plus récent en premier par défaut)

### Deferred Ideas (OUT OF SCOPE)

- Multi-catégories par pro
- Filtre zone / rayon km
- Score de pertinence des leads
- Portail Stripe self-service
- Crédit par lead
- Lemon Squeezy / Paddle
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LCK-01 | Floutage serveur (Nitro API) des coordonnées du prospect | Pattern `readRawBody` / service role + logique de masquage dans handler Nitro documenté |
| LCK-02 | Accès immédiat non flouté pour les pros PREMIUM via abonnement Stripe | Stripe Checkout Session `mode: 'subscription'` + webhook `checkout.session.completed` documenté |
| LCK-03 | Déblocage automatique gratuit après 72h pour les pros BASIC (pg_cron) | `cron.schedule()` SQL vérifié sur pg_cron officiel ; UPDATE `leads.unlocked_at` |
</phase_requirements>

---

## Summary

La Phase 4 assemble trois blocs techniques distincts sur le socle Nuxt 3 / Nitro / Supabase existant.

**Bloc 1 — Le Verrou (LCK-01) :** L'API `/api/v1/leads` (à créer) lit les leads via le service role (bypass RLS), joint `projects` pour les données du projet, vérifie `professionals.subscription_status` et `leads.unlocked_at`, puis masque ou non les champs sensibles avant de retourner la réponse. Ce pattern est une extension directe de `queue.get.ts`. La contrainte ADR-004 est absolue : aucune coordonnée non masquée ne sort de Nitro vers un client non autorisé.

**Bloc 2 — Stripe Billing (LCK-02) :** L'intégration Stripe comprend deux endpoints Nitro : `checkout.post.ts` (crée une session Checkout, retourne l'URL) et `webhook.post.ts` (reçoit les événements Stripe, met à jour `subscription_status`). Le point critique pour ce stack est que Nitro sur Cloudflare Pages tourne dans un runtime V8/edge — `stripe.webhooks.constructEvent()` (synchrone) ne fonctionne pas ; il faut `stripe.webhooks.constructEventAsync()` avec `Stripe.createSubtleCryptoProvider()`. La lecture du corps brut se fait avec `readRawBody(event)` de Nitro.

**Bloc 3 — pg_cron (LCK-03) :** Un job pg_cron UPDATE positionne `leads.unlocked_at = created_at + INTERVAL '72 hours'` pour les leads où `unlocked_at IS NULL` et `created_at + 72h <= NOW()`. Ce job tourne toutes les heures via `cron.schedule()`. Il ne s'applique qu'aux leads dont `status != 'claimed'` pour respecter D-08.

**Recommandation principale :** Implémenter dans l'ordre — schéma migration → pg_cron job → API leads (Le Verrou) → Stripe Checkout → Webhook → Dashboard UI. Le webhook est le point de risque le plus élevé (raw body + Cloudflare edge runtime) : à implémenter et tester en premier avant toute UI.

---

## Architectural Responsibility Map

| Capability | Tier primaire | Tier secondaire | Rationale |
|------------|--------------|-----------------|-----------|
| Masquage des coordonnées | API / Nitro server | — | ADR-004 : contrainte dure serveur-only |
| Logique Premium vs BASIC | API / Nitro server | — | Vérification `subscription_status` côté serveur uniquement |
| Création des leads (qualify) | API / Nitro server | — | Logique applicative pure (D-04), service role required |
| Stripe Checkout Session | API / Nitro server | — | Clé secrète Stripe inaccessible côté client |
| Stripe Webhook handling | API / Nitro server | — | Signature verification nécessite raw body serveur |
| Mise à jour `unlocked_at` | Database / pg_cron | — | Job planifié autonome, pas de logique applicative |
| Dashboard leads UI | Frontend (Nuxt) | API Nitro | Affichage ; les données arrivent déjà masquées/démasquées |
| Page Premium `/espace/premium` | Frontend (Nuxt) | API Nitro | Présentation + redirection vers Stripe URL |
| Auth guard espace pro | Frontend (Nuxt) | — | Pattern `watchEffect + navigateTo` existant |

---

## Standard Stack

### Core

| Bibliothèque | Version | Rôle | Pourquoi c'est le standard |
|--------------|---------|------|---------------------------|
| `stripe` (npm) | 22.2.0 | SDK Stripe server-side | SDK officiel Stripe ; publié 2011 ; [OK] slopcheck [VERIFIED: npm registry] |
| `@nuxtjs/supabase` | 2.0.9 | Client Supabase + service role | Déjà installé — pattern `serverSupabaseServiceRole` établi |
| `zod` | 4.4.3 | Validation des payloads | Déjà installé — pattern établi dans tous les handlers |
| `pg_cron` | extension Supabase | Jobs planifiés PostgreSQL | Extension native PostgreSQL, activée par défaut sur Supabase cloud |

### Aucune dépendance supplémentaire requise

Le package `stripe` est la seule dépendance à installer. Tout le reste (Supabase, Zod, Nuxt, Nitro) est déjà en place.

**Installation :**
```bash
npm install stripe
```

### Alternatives écartées (décisions verrouillées)

| À la place de | Aurait pu utiliser | Pourquoi écarté |
|---------------|-------------------|-----------------|
| Stripe | Lemon Squeezy, Paddle | Déferré (CONTEXT.md) |
| pg_cron | Cron Cloudflare Worker, Edge Function | pg_cron est natif PostgreSQL — pas de round-trip réseau |

---

## Package Legitimacy Audit

| Package | Registry | Âge | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `stripe` | npm | 14 ans (2011) | github.com/stripe/stripe-node | [OK] | Approuvé |

**Packages retirés (verdict SLOP) :** aucun
**Packages suspects (SUS) :** aucun

---

## Architecture Patterns

### Diagramme de flux — Phase 4

```
[Admin] → POST /api/v1/admin/qualify
              │
              ├─ projects.status = 'qualified'
              └─ INSERT leads (1 par pro vérifié même catégorie)
                       │
                       ▼
              [leads.unlocked_at = NULL]
                       │
              ┌────────┴────────┐
              │   pg_cron       │  (toutes les heures)
              │  UPDATE leads   │
              │  SET unlocked_at │
              │  = created_at   │
              │  + 72h          │
              └────────┬────────┘
                       │
[Pro BASIC]  GET /api/v1/leads ──── vérif subscription_status
[Pro PREMIUM]        │               ET unlocked_at
                     │
              ┌──────┴──────────────────────────┐
              │ PREMIUM active                  │ BASIC + unlocked  │ BASIC + locked │ claimed
              │ → données complètes             │ → données complètes │ → *** masqué │ → "Déjà attribué"
              └─────────────────────────────────┘
                     │
             [/espace/leads] cards UI

[Pro] → GET /espace/premium → POST /api/v1/stripe/checkout
              │
              └─ Stripe Checkout Session (mode: subscription)
                       │
              [Stripe] ← paiement client
                       │
              POST /api/v1/stripe/webhook
                       │
              constructEventAsync() + SubtleCryptoProvider
                       │
              UPDATE professionals.subscription_status
              UPDATE professionals.stripe_customer_id
```

### Structure des fichiers recommandée

```
server/api/v1/
├── admin/
│   ├── qualify.post.ts          # Nouveau — qualifie projet + crée leads
│   └── queue.get.ts             # Existant
├── leads/
│   ├── index.get.ts             # Nouveau — liste leads du pro (avec masquage)
│   └── [id].get.ts              # Nouveau — détail lead (avec masquage)
└── stripe/
    ├── checkout.post.ts         # Nouveau — crée Checkout Session
    └── webhook.post.ts          # Nouveau — reçoit événements Stripe

app/pages/espace/
├── leads/
│   ├── index.vue                # Nouveau — dashboard leads (cards)
│   └── [id].vue                 # Nouveau — détail lead
└── premium.vue                  # Nouveau — page abonnement

supabase/migrations/
└── 20260606000000_phase4_unlock_cron.sql  # pg_cron job + index unlocked_at
```

### Pattern 1 : Logique de masquage côté serveur (Le Verrou)

```typescript
// server/api/v1/leads/index.get.ts
// Source: ADR-004 + pattern queue.get.ts existant
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // 1. Récupérer le profil pro (subscription_status)
  const { data: pro } = await supabase
    .from('professionals')
    .select('id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })

  const isPremium = pro.subscription_status === 'active'

  // 2. Récupérer les leads avec join projects
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      id, status, unlocked_at, created_at,
      projects (
        id, category, budget_range, description,
        customer_name, customer_email, customer_phone,
        postal_code
      )
    `)
    .eq('pro_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // 3. Masquer ou non les coordonnées (D-06/D-07/D-08/D-09)
  const now = new Date()
  const masked = (leads || []).map((lead: any) => {
    const project = lead.projects
    const isUnlocked = isPremium ||
      (lead.unlocked_at !== null && new Date(lead.unlocked_at) <= now)
    const isClaimed = lead.status === 'claimed'

    if (isClaimed && !isPremium) {
      // D-10 : BASIC voit la card marquée "Déjà attribué"
      return {
        id: lead.id,
        status: 'claimed',
        created_at: lead.created_at,
        category: project.category,
        budget_range: project.budget_range,
        // Pas de coordonnées, pas de description
      }
    }

    if (!isUnlocked) {
      // D-05 : masquage strict
      return {
        id: lead.id,
        status: 'locked',
        unlocked_at: lead.unlocked_at,
        created_at: lead.created_at,
        category: project.category,
        budget_range: project.budget_range,
        // description masquée délibérément (inclut commune potentiellement)
        customer_name: '*** *** ***',
        customer_phone: '*** *** ***',
        customer_email: 'contact@***.fr',
        postal_code: '***',
      }
    }

    // Débloqué : données complètes
    return {
      id: lead.id,
      status: 'unlocked',
      unlocked_at: lead.unlocked_at,
      created_at: lead.created_at,
      category: project.category,
      budget_range: project.budget_range,
      description: project.description,
      customer_name: project.customer_name,
      customer_phone: project.customer_phone,
      customer_email: project.customer_email,
      postal_code: project.postal_code,
    }
  })

  return { leads: masked }
})
```

### Pattern 2 : Stripe Checkout Session (Nitro, Cloudflare Pages)

```typescript
// server/api/v1/stripe/checkout.post.ts
// Source: [CITED: docs.stripe.com/checkout/quickstart] + [CITED: blog.cloudflare.com/announcing-stripe-support-in-workers/]
import Stripe from 'stripe'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const config = useRuntimeConfig(event)
  const stripe = new Stripe(config.stripeSecretKey as string, {
    httpClient: Stripe.createFetchHttpClient(), // OBLIGATOIRE pour Cloudflare Workers/Pages
  })

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: pro } = await supabase
    .from('professionals')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: config.stripePriceId as string, quantity: 1 }],
    success_url: `${config.public.siteUrl}/espace/leads?upgrade=success`,
    cancel_url: `${config.public.siteUrl}/espace/premium`,
    metadata: { pro_id: user.id },
  }

  // D-15 : réutiliser le stripe_customer_id existant si disponible
  if (pro?.stripe_customer_id) {
    sessionParams.customer = pro.stripe_customer_id
  } else {
    sessionParams.customer_email = pro?.email || user.email
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return { url: session.url }
})
```

### Pattern 3 : Webhook Stripe — constructEventAsync (CRITIQUE pour Cloudflare)

```typescript
// server/api/v1/stripe/webhook.post.ts
// Source: [CITED: blog.cloudflare.com/announcing-stripe-support-in-workers/]
// ATTENTION : constructEvent() SYNCHRONE ne fonctionne PAS sur Cloudflare Workers/Pages
// Il FAUT utiliser constructEventAsync() + SubtleCryptoProvider
import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const stripe = new Stripe(config.stripeSecretKey as string, {
    httpClient: Stripe.createFetchHttpClient(),
  })

  const webCrypto = Stripe.createSubtleCryptoProvider()

  // Lire le corps BRUT — obligatoire pour la vérification de signature
  const rawBody = await readRawBody(event) // Nitro helper — retourne string
  const signature = getHeader(event, 'stripe-signature')

  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Signature ou corps manquant.' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      config.stripeWebhookSecret as string,
      undefined,
      webCrypto  // Paramètre 5 — obligatoire pour Cloudflare V8
    )
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: `Webhook signature invalide: ${err.message}` })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  // D-14 : gestion des événements
  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const proId = session.metadata?.pro_id
      if (!proId) break
      await supabase
        .from('professionals')
        .update({
          subscription_status: 'active',
          stripe_customer_id: session.customer as string,
        })
        .eq('id', proId)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = stripeEvent.data.object as Stripe.Subscription
      await supabase
        .from('professionals')
        .update({ subscription_status: 'canceled' })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      await supabase
        .from('professionals')
        .update({ subscription_status: 'unpaid' })
        .eq('stripe_customer_id', invoice.customer as string)
      break
    }
    default:
      // Ignorer les autres événements
  }

  return { received: true }
})
```

### Pattern 4 : pg_cron — déblocage automatique à T+72h

```sql
-- supabase/migrations/20260606000000_phase4_unlock_cron.sql
-- Source: [CITED: github.com/citusdata/pg_cron]

-- 1. Activer l'extension (déjà activée sur Supabase cloud par défaut)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Index pour optimiser la requête du cron
CREATE INDEX IF NOT EXISTS idx_leads_unlock_check
  ON leads (unlocked_at, created_at, status)
  WHERE unlocked_at IS NULL;

-- 3. Planifier le job — toutes les heures, à :00
SELECT cron.schedule(
  'auto-unlock-leads-72h',          -- nom du job (unique)
  '0 * * * *',                      -- cron : chaque heure à :00
  $$
    UPDATE leads
    SET unlocked_at = created_at + INTERVAL '72 hours'
    WHERE unlocked_at IS NULL
      AND status != 'claimed'
      AND created_at + INTERVAL '72 hours' <= NOW()
  $$
);
```

**Note sur le local dev :** pg_cron n'est pas activé dans Supabase CLI local par défaut. Tester le déblocage en local en exécutant manuellement le SQL UPDATE (pas le cron). [ASSUMED — vérifier si `supabase start` avec config locale active pg_cron]

### Pattern 5 : Admin qualify endpoint

```typescript
// server/api/v1/admin/qualify.post.ts
// Pattern : identique à approve-pro.post.ts (admin check + service role)
import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const qualifySchema = z.object({
  project_id: z.string().uuid()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401 })
  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403 })

  const { project_id } = qualifySchema.parse(await readBody(event))
  const supabase = await serverSupabaseServiceRole(event) as any

  // 1. Passer le projet en "qualified"
  const { data: project } = await supabase
    .from('projects')
    .update({ status: 'qualified' })
    .eq('id', project_id)
    .select('category')
    .single()

  // 2. Trouver tous les pros vérifiés de la même catégorie (D-01/D-03)
  const { data: pros } = await supabase
    .from('professionals')
    .select('id')
    .eq('category', project.category)
    .eq('is_verified', true)

  // 3. Insérer un lead par pro (UPSERT pour idempotence)
  if (pros?.length) {
    await supabase
      .from('leads')
      .upsert(
        pros.map((p: any) => ({
          project_id,
          pro_id: p.id,
          status: 'new',
          unlocked_at: null,
        })),
        { onConflict: 'project_id,pro_id' }
      )
  }

  return { qualified: true, leads_created: pros?.length ?? 0 }
})
```

### Anti-Patterns à éviter

- **Ne jamais retourner les coordonnées brutes depuis l'API** même si le client les réclame — vérification toujours côté serveur (ADR-004).
- **Ne jamais utiliser `readBody()` dans le webhook Stripe** — le parseur JSON de Nitro corrompt le corps brut et invalide la signature.
- **Ne jamais utiliser `constructEvent()` synchrone** sur Cloudflare Workers/Pages — crash garanti en runtime V8 (WebCrypto est async).
- **Ne pas exposer `STRIPE_SECRET_KEY` via `runtimeConfig.public`** — uniquement dans `runtimeConfig` (côté serveur).
- **Ne pas coder le price ID en dur** — utiliser `STRIPE_PRICE_ID` via runtimeConfig (D-12).

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser | Pourquoi |
|----------|------------------|----------|----------|
| Vérification signature webhook | Parsing HMAC manuel | `stripe.webhooks.constructEventAsync()` | Timing attacks, replay attacks, rotation automatique |
| Checkout hébergé | Formulaire carte custom | Stripe Checkout Session hosted | PCI DSS compliance — hors de portée si custom |
| Planification jobs DB | Cron Cloudflare / Edge Function | `pg_cron` (PostgreSQL natif) | Transactionnel, pas de round-trip réseau, rollback possible |
| Masquage côté client | CSS `filter: blur()` ou JS | Masquage Nitro avant envoi | ADR-004 — les données ne doivent jamais atteindre le navigateur |

---

## Schéma — Analyse des Gaps

### Gap 1 : Champ `timeline`/`délai` absent de `projects`

D-05 stipule que les pros BASIC voient "catégorie + budget + **délai**". La table `projects` n'a **pas** de colonne `timeline` ou `delay_range` — uniquement `budget_range`, `description`, `category`. [VERIFIED: grep sur le schéma initial et projects.post.ts]

**Action requise (migration) :**
```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS timeline_range TEXT;
  -- Valeurs attendues : '1_semaine', '1_mois', '3_mois', '6_mois', 'flexible'
```

**Et mettre à jour** :
- `server/api/v1/projects.post.ts` (Zod schema + INSERT)
- `app/pages/simulateur.vue` (étape de saisie du délai — à vérifier si déjà présente)

**Risque si ignoré :** Le dashboard leads BASIC ne peut pas afficher le "délai" comme prévu par D-05 et D-17.

### Gap 2 : `leads.status` n'a pas la valeur `'claimed'`

L'ENUM `lead_status` existant est `('new', 'contacted', 'won', 'lost')`. D-08/D-10 font référence à `status = 'claimed'`.

**Action requise :**
```sql
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'claimed';
```

Note : PostgreSQL ne permet pas de supprimer une valeur d'ENUM, seulement d'en ajouter. L'UPSERT dans `qualify.post.ts` insère avec `status: 'new'` — la valeur `'claimed'` est settée quand un Premium "prend" le lead (logique à définir, probablement `PATCH /api/v1/leads/[id]/claim`).

### Gap 3 : `projects.status` ne liste pas `'qualified'`

Le CHECK existant : `CHECK (status IN ('pending', 'qualified', 'closed'))`. La valeur `'qualified'` est déjà présente. Pas de migration nécessaire. [VERIFIED: ligne 97 du schéma initial]

---

## Common Pitfalls

### Pitfall 1 : `constructEvent()` synchrone crash sur Cloudflare Workers

**Ce qui se passe :** L'appel `stripe.webhooks.constructEvent(rawBody, sig, secret)` lève une erreur runtime car WebCrypto est asynchrone dans V8 (Cloudflare Workers).
**Pourquoi :** Le runtime Cloudflare Workers n'expose pas les APIs crypto synchrones de Node.js.
**Comment éviter :** Utiliser `constructEventAsync()` avec `Stripe.createSubtleCryptoProvider()` comme 5ème paramètre. [CITED: blog.cloudflare.com/announcing-stripe-support-in-workers/]
**Signes d'alerte :** Tests locaux (Node.js) passent, production (Cloudflare Pages) échoue avec erreur crypto.

### Pitfall 2 : `readBody()` invalide la signature webhook

**Ce qui se passe :** La signature Stripe échoue (`Webhook Error: No signatures found matching the expected signature`).
**Pourquoi :** `readBody()` de Nitro parse le JSON, modifiant la représentation du corps brut. Stripe signe le corps **exactement tel qu'envoyé** — toute transformation invalide la signature.
**Comment éviter :** Toujours `readRawBody(event)` dans le webhook handler. Ne pas appeler `readBody()` avant.
**Signes d'alerte :** `stripe.webhooks.constructEvent` retourne 400 en production uniquement.

### Pitfall 3 : `stripe_customer_id` NULL sur `customer.subscription.deleted`

**Ce qui se passe :** L'UPDATE via `stripe_customer_id` ne trouve aucune ligne si le premier checkout n'a pas correctement persisté le `customer_id`.
**Pourquoi :** Race condition ou erreur silencieuse dans `checkout.session.completed`.
**Comment éviter :** Dans `checkout.session.completed`, toujours persister `stripe_customer_id` même si déjà set (UPSERT ou UPDATE sans condition). Logguer si `session.customer` est null.
**Signes d'alerte :** Pro annule, statut reste `'active'` en DB.

### Pitfall 4 : pg_cron non disponible en local dev

**Ce qui se passe :** La migration `cron.schedule()` échoue en local avec `ERROR: schema "cron" does not exist`.
**Pourquoi :** Supabase CLI local (`supabase start`) n'active pas pg_cron par défaut dans tous les cas. [ASSUMED — à vérifier avec `supabase status`]
**Comment éviter :** Wrapper la migration avec `CREATE EXTENSION IF NOT EXISTS pg_cron` en première ligne. Pour tester le déblocage localement, exécuter l'UPDATE SQL directement via `supabase db execute`.
**Signes d'alerte :** Migration échoue localement mais pas en production Supabase.

### Pitfall 5 : ENUM PostgreSQL — pas de rollback de valeur

**Ce qui se passe :** On ajoute `'claimed'` à l'ENUM `lead_status` mais on veut revenir en arrière.
**Pourquoi :** PostgreSQL ne supporte pas `DROP VALUE` sur un ENUM.
**Comment éviter :** La migration `ALTER TYPE lead_status ADD VALUE 'claimed'` est irréversible. S'assurer que la valeur est définitivement nécessaire avant de l'appliquer. Pour revenir en arrière : recréer l'ENUM avec `ALTER TABLE ... USING`.

### Pitfall 6 : Stripe Price ID hardcodé

**Ce qui se passe :** Le prix change (business decision), nécessite un déploiement pour mettre à jour le code.
**Pourquoi :** `price_1234abc` hardcodé dans le source.
**Comment éviter :** `STRIPE_PRICE_ID` dans `.env` / Cloudflare Pages env vars. Via `useRuntimeConfig(event).stripePriceId` dans le handler. [D-12 verrouillé]

### Pitfall 7 : Données sensibles dans les logs Nitro

**Ce qui se passe :** `console.log(lead)` expose `customer_name`, `customer_email` dans les logs Cloudflare.
**Pourquoi :** Logs de debug non nettoyés.
**Comment éviter :** Ne jamais logger l'objet lead complet. Logger uniquement `lead.id`, `lead.status`. Supprimer tous les `console.log` de debug avant merge.

---

## Variables d'environnement requises

Les variables suivantes doivent être ajoutées à `.env.example`, `.env` local, et Cloudflare Pages env vars :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...           # Clé secrète Stripe (jamais publique)
STRIPE_PRICE_ID=price_...               # ID du prix mensuel 39€/mois
STRIPE_WEBHOOK_SECRET=whsec_...         # Secret de signature webhook

# URL publique (pour success_url / cancel_url dans Checkout)
NUXT_PUBLIC_SITE_URL=https://bati-axe.com
```

**Dans `nuxt.config.ts` — à ajouter :**
```typescript
runtimeConfig: {
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePriceId: process.env.STRIPE_PRICE_ID,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  public: {
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  }
}
```

---

## State of the Art

| Ancienne approche | Approche actuelle | Impact |
|-------------------|-------------------|--------|
| `constructEvent()` sync (Node.js) | `constructEventAsync()` + `SubtleCryptoProvider` (edge runtimes) | Obligatoire pour Cloudflare Workers/Pages depuis 2023 |
| `Stripe.createNodeHttpClient()` | `Stripe.createFetchHttpClient()` | Obligatoire pour runtimes sans `http` Node.js natif |
| RLS pour masquer les colonnes | Masquage applicatif dans l'API | ADR-004 — plus flexible (effet teasing) |
| Trigger DB pour créer les leads | Logique applicative Nitro | D-04 — plus testable, moins de magic |

---

## Assumptions Log

| # | Claim | Section | Risque si faux |
|---|-------|---------|----------------|
| A1 | pg_cron n'est pas activé par défaut dans Supabase CLI local | Pitfall 4 + Pattern 4 | Si activé, pas de problème — si absent, migration locale échoue |
| A2 | `readRawBody(event)` de Nitro sur Cloudflare Pages retourne le corps brut non modifié | Pattern 3 | Si Nitro modifie le corps, la signature Stripe échoue ; tester en staging avant prod |
| A3 | `projects` n'a pas de champ `timeline` (délai) | Gap 1 | Confirmé par grep du schéma et projects.post.ts — risque faible |
| A4 | L'ENUM `lead_status` ne contient pas `'claimed'` | Gap 2 | Confirmé par grep — migration nécessaire |

---

## Open Questions

1. **Affichage du "délai" sur les cards leads (D-05/D-17)**
   - Ce qu'on sait : `projects` a `budget_range` mais pas de champ délai dédié.
   - Ce qui est flou : Est-ce que le simulateur capte déjà un délai quelque part ? Si non, faut-il une migration schema + mise à jour du simulateur, ou utiliser `description` comme proxy acceptable ?
   - Recommandation : Ajouter `timeline_range` à `projects` (migration légère) ET mettre à jour le simulateur. Valeur affichée sur les cards BASIC sans risque d'identification géographique.

2. **Endpoint `claim` pour qu'un Premium "prenne" un lead**
   - Ce qu'on sait : D-08/D-10 mentionnent `leads.status = 'claimed'` mais aucun endpoint n'est spécifié pour le déclencher.
   - Ce qui est flou : Le "claim" d'un lead Premium est-il dans le scope Phase 4 ou Phase 5 ?
   - Recommandation : Inclure un endpoint `PATCH /api/v1/leads/[id]/claim` minimaliste (set `status = 'claimed'`) pour que D-08/D-10 soient fonctionnels. Sans lui, `'claimed'` ne sera jamais settée et la logique "Déjà attribué" ne s'activera pas.

3. **Test local du webhook Stripe**
   - Ce qu'on sait : En local, Stripe CLI (`stripe listen --forward-to http://localhost:3000/api/v1/stripe/webhook`) forward les events.
   - Ce qui est flou : La vérification `constructEventAsync` fonctionne-t-elle en mode `nuxt dev` (Node.js) OU nécessite-t-elle le runtime Cloudflare (`wrangler pages dev`) ?
   - Recommandation : Implémenter le webhook avec `constructEventAsync` dès le départ (compatible Node.js ET Cloudflare). Tester en `nuxt dev` d'abord, puis en staging Cloudflare Pages.

---

## Environment Availability

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `stripe` (npm) | LCK-02 | A installer | 22.2.0 | — |
| Supabase CLI | pg_cron migration | ✓ | 2.75.0 | — |
| Stripe CLI | Test webhook local | A vérifier | — | Stripe Dashboard > webhooks test |
| `pg_cron` extension | LCK-03 | ✓ Supabase cloud | native | UPDATE manuel en local |

**Dépendances manquantes sans fallback :**
- `stripe` : à installer via `npm install stripe` avant toute implémentation.

**Dépendances manquantes avec fallback :**
- Stripe CLI pour test local : peut être remplacé par l'envoi d'events depuis le Dashboard Stripe > Webhooks > "Send test event".

---

## Validation Architecture

> `workflow.nyquist_validation` absent de config.json — traité comme activé.

### Test Framework

| Propriété | Valeur |
|-----------|--------|
| Framework | Aucun configuré à ce stade (pas de jest.config, vitest.config, pytest.ini détectés) |
| Config file | À créer en Wave 0 |
| Commande rapide | `vitest run --reporter=verbose` (si Vitest installé) |
| Suite complète | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Comportement | Type de test | Commande | Fichier existe ? |
|--------|-------------|-------------|----------|-----------------|
| LCK-01 | API retourne `***` pour BASIC + lead < 72h | Unit (handler logic) | À définir | ❌ Wave 0 |
| LCK-01 | API retourne données complètes pour Premium | Unit | À définir | ❌ Wave 0 |
| LCK-01 | API retourne données complètes pour BASIC + unlocked_at <= NOW() | Unit | À définir | ❌ Wave 0 |
| LCK-02 | Checkout Session crée une URL Stripe valide | Integration (Stripe test mode) | Manuel | ❌ Wave 0 |
| LCK-02 | Webhook `checkout.session.completed` → `subscription_status = 'active'` | Integration | Manuel (Stripe CLI) | ❌ Wave 0 |
| LCK-03 | pg_cron UPDATE positionne `unlocked_at` après 72h | Integration (SQL direct) | SQL manuel | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] Installer et configurer Vitest : `npm install -D vitest`
- [ ] Créer `vitest.config.ts` ou `vitest.config.js`
- [ ] Créer `tests/unit/leads-masking.test.ts` — couvre LCK-01 (logique de masquage pure, sans DB)
- [ ] Créer `tests/integration/stripe-webhook.test.ts` — couvre LCK-02 (mock Stripe events)

**Note :** La logique de masquage (Pattern 1) est testable en pur unit test sans DB car c'est une transformation de données. Extraire la fonction de masquage dans un helper testable isolément.

---

## Security Domain

### Applicable ASVS Categories

| Catégorie ASVS | Applicable | Contrôle standard |
|----------------|-----------|-------------------|
| V2 Authentication | Oui | Supabase Auth + `serverSupabaseUser()` sur toutes les routes `/espace/*` |
| V3 Session Management | Oui | Géré par Supabase Auth (JWT) |
| V4 Access Control | Oui | Vérification `subscription_status` côté serveur — jamais côté client |
| V5 Input Validation | Oui | Zod sur tous les endpoints (pattern établi) |
| V6 Cryptography | Oui | `stripe.webhooks.constructEventAsync()` — ne pas hand-roll |

### Threat Patterns connus pour ce stack

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Contournement du floutage via DevTools | Information Disclosure | Masquage côté serveur uniquement (ADR-004) — les données ne sortent jamais du serveur |
| Replay d'un webhook Stripe | Spoofing / Tampering | `constructEventAsync` vérifie le timestamp (tolérance 5 min) — gérée par le SDK |
| Stripe customer_id forgé dans metadata | Tampering | Lier `pro_id` à `user.id` depuis la session auth, pas depuis le body client |
| Accès direct à `/api/v1/leads` sans auth | Elevation of Privilege | `serverSupabaseUser` check en première ligne — throw 401 si absent |
| Pollution des leads par qualify répété | Tampering | UPSERT avec `onConflict: 'project_id,pro_id'` — idempotent |
| STRIPE_SECRET_KEY exposée en public | Information Disclosure | Uniquement dans `runtimeConfig` (server-side), jamais `runtimeConfig.public` |

---

## Sources

### Primary (HIGH confidence)
- [docs.stripe.com/checkout/quickstart](https://docs.stripe.com/checkout/quickstart) — paramètres Checkout Session, `mode: 'subscription'`, `customer`, `metadata`
- [docs.stripe.com/webhooks](https://docs.stripe.com/webhooks) — signature verification, raw body requirement, events lifecycle
- [blog.cloudflare.com/announcing-stripe-support-in-workers/](https://blog.cloudflare.com/announcing-stripe-support-in-workers/) — `constructEventAsync` + `SubtleCryptoProvider` + `createFetchHttpClient` pattern pour Cloudflare Workers
- [github.com/citusdata/pg_cron](https://github.com/citusdata/pg_cron) — `cron.schedule()` SQL syntax, `cron.unschedule()`
- Schema `supabase/migrations/20260603000000_schema_initial.sql` — état réel des colonnes `leads`, `professionals`, `projects`

### Secondary (MEDIUM confidence)
- [jross.me/verifying-stripe-webhook-signatures-cloudflare-workers/](https://jross.me/verifying-stripe-webhook-signatures-cloudflare-workers/) — confirmation `constructEventAsync` requis sur Cloudflare (article technique, non officiel Stripe)
- [github.com/stripe-samples/stripe-node-cloudflare-worker-template](https://github.com/stripe-samples/stripe-node-cloudflare-worker-template) — template officiel Stripe pour Cloudflare Workers

### Tertiary (LOW confidence)
- [community.cloudflare.com — Stripe webhook stopped working after migrating to Workers](https://community.cloudflare.com/t/stripe-webhook-stopped-working-after-migrating-from-pages-to-workers/884847) — confirmation community (non officiel) que `readRawBody` est la bonne approche sur Nitro/Cloudflare Pages

---

## Metadata

**Confidence breakdown :**
- Standard Stack : HIGH — `stripe` vérifié npm + slopcheck [OK] ; Supabase/Zod/Nitro déjà en production
- Architecture : HIGH — patterns dérivés du code existant + sources officielles Cloudflare/Stripe
- Pitfalls : HIGH (constructEvent/constructEventAsync) — confirmé par 3 sources indépendantes + article officiel Cloudflare ; MEDIUM (pg_cron local) — [ASSUMED]
- Gaps schéma : HIGH — vérifiés par grep du code source

**Research date :** 2026-06-05
**Valid until :** 2026-07-05 (stripe-node se met à jour fréquemment — vérifier avant implémentation si >30 jours)
