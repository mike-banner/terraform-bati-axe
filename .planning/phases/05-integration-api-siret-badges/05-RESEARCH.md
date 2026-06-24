# Phase 5 : Intégration API État (SIRET) & Badges de Confiance — Research

**Researched:** 2026-06-24
**Domain:** API publique française (Recherche Entreprises gouv.fr), DB schema evolution, composants Vue de badges
**Confidence:** HIGH

---

## Résumé

Cette phase ajoute deux couches de confiance distinctes au profil professionnel : (1) une vérification automatique de l'existence légale via API d'État au moment du Claim, et (2) des badges visuels qui reflètent l'état de cette vérification et de la validation manuelle décennale.

L'API Recherche Entreprises (`recherche-entreprises.api.gouv.fr`) est l'option correcte : sans authentification, gratuite, maintenue par l'État, compatible Cloudflare Workers (appel server-side Nitro, CORS non applicable). Elle retourne `nom_complet`, `adresse`, `etat_administratif` ("A"=actif / "F"=fermé) pour un SIRET donné.

Le schéma actuel possède déjà les hooks nécessaires : `labels JSONB DEFAULT '[]'` sur `professionals` (pour les badges) et `decennal_status ENUM` (pour le statut décennale). L'implémentation n'exige pas de nouvelle table — seulement de nouvelles colonnes et un nouvel endpoint Nitro.

**Recommandation primaire :** Appel à `recherche-entreprises.api.gouv.fr` côté serveur Nitro au moment du Claim POST. Stocker le résultat (raison sociale, adresse, statut) dans de nouvelles colonnes `siret_verified_at`, `siret_company_name`, `siret_address`, `siret_status` sur `professionals`. Afficher les badges depuis ces colonnes, jamais en appellant l'API à l'affichage.

---

## Carte des responsabilités architecturales

| Capacité | Tier primaire | Tier secondaire | Rationale |
|----------|--------------|-----------------|-----------|
| Appel API État (SIRET lookup) | API/Backend (Nitro) | — | Jamais côté client : clé/quota non exposés, CORS contourné |
| Stockage résultat SIRET | DB (Supabase) | — | Snapshot au moment de la vérification, pas recalculé à l'affichage |
| Affichage badges | Frontend (Vue) | Profil public server-side | Lecture de colonnes DB, logique d'état simple |
| Déclenchement badge décennale | API/Backend (admin approve-pro) | — | Déjà existant — modifier l'endpoint existant |
| Cache API État | Nitro (pas de cache) | — | SIRET vérifié une fois au Claim, pas besoin de KV |

---

## Stack standard

### Core (existant — rien à installer)

| Outil | Version actuelle | Rôle Phase 5 |
|-------|-----------------|--------------|
| Nitro (Cloudflare Pages) | via Nuxt | Endpoint `/api/v1/siret/lookup` + modification `claim.post.ts` |
| Supabase Postgres | local 54321 | Nouvelles colonnes `siret_*` sur `professionals` |
| Zod | déjà installé | Validation SIRET côté serveur |
| Vue 3 / Nuxt 4 | existant | Composants badge, mise à jour `claim.vue` |
| Tailwind CSS | existant (MASTER.md tokens) | Styling badges |

### Aucun package externe requis

L'API Recherche Entreprises est appelée via `$fetch` / `fetch` natif de Nitro. Pas de SDK officiel. Pas d'installation npm nécessaire pour cette phase.

## Audit de légitimité des paquets

Aucun paquet externe n'est installé dans cette phase. Section non applicable.

---

## L'API choisie : API Recherche Entreprises

### Pourquoi cette API et pas les autres

| API | Auth | Quota | Données | Éligibilité | Verdict |
|-----|------|-------|---------|-------------|---------|
| **Recherche Entreprises** (`recherche-entreprises.api.gouv.fr`) | Aucune | 7 req/s | Raison sociale, adresse, état admin, dirigeants | Tous | **RETENU** |
| API Entreprise (`entreprise.api.gouv.fr`) | Habilitation obligatoire | Variable | Données enrichies (CA, etc.) | Administrations uniquement | Hors périmètre |
| API Sirene INSEE (`api.insee.fr`) | Clé API requise (inscription) | Variable | Données Sirene complètes | Tous après inscription | Surdimensionné |
| Pappers.fr | Clé API payante | Selon plan | Données enrichies + documents | Tous (commercial) | Coût inutile |

[VERIFIED: test direct `https://recherche-entreprises.api.gouv.fr/search?q=44306184100047`]
[CITED: https://www.data.gouv.fr/dataservices/672cf684c3488a0c533f7094]

### Endpoint de lookup par SIRET

```
GET https://recherche-entreprises.api.gouv.fr/search?q={SIRET_14_CHIFFRES}&page=1&per_page=1
```

Pas d'endpoint `/etablissement/{siret}` direct dans cette API. La recherche par SIRET exact via `q=` retourne un résultat unique (correspondance exacte). [VERIFIED: test direct API]

### Champs retournés (vérifiés)

```json
{
  "results": [{
    "nom_complet": "GOOGLE FRANCE",
    "nom_raison_sociale": "GOOGLE FRANCE",
    "siren": "443061841",
    "siret": "44306184100047",
    "adresse": "8 RUE DE LONDRES 75009 PARIS",
    "code_postal": "75009",
    "libelle_commune": "PARIS",
    "etat_administratif": "A",
    "statut_diffusion": "O"
  }],
  "total_results": 1
}
```

`etat_administratif` : `"A"` = actif, `"F"` = fermé. [VERIFIED: test direct API]

### Contraintes importantes

**Entreprises non diffusibles :** Les auto-entrepreneurs et entreprises individuelles peuvent exercer leur droit d'opposition à la diffusion de données personnelles. Dans ce cas, `statut_diffusion` = `"P"` (partiellement diffusible) ou l'établissement n'apparaît pas dans les résultats. [CITED: https://entreprise.api.gouv.fr/blog/insee-non-diffusibles]

→ **Implication produit :** Si `total_results === 0` pour un SIRET valide (14 chiffres), l'entreprise peut être non diffusible. Ce n'est pas une fraude — il faut un message d'erreur différencié : "SIRET non trouvé dans l'annuaire public — vous pouvez continuer manuellement."

**Quota :** 7 req/s par IP. Cloudflare Workers sortent depuis des IPs Cloudflare mutualisées. Risque théorique de dépassement si trafic massif, mais pour la phase pilote (quelques dizaines d'inscriptions), ce n'est pas un problème.

**Compatibilité Cloudflare Workers :** `fetch()` global disponible dans Workers. L'appel se fait côté Nitro (server-side), pas depuis le browser. Le CSP actuel (`connect-src`) ne s'applique pas aux requêtes serveur. [CITED: https://developers.cloudflare.com/workers/runtime-apis/fetch/]

---

## Analyse du schéma DB existant

### Ce qui existe déjà sur `professionals`

```sql
-- Existant (schema_initial.sql)
siret       TEXT UNIQUE NOT NULL   -- le SIRET brut saisi
decennal_status decennal_status DEFAULT 'none'  -- ENUM: pending/valid/expired/none
labels      JSONB DEFAULT '[]'     -- hook badges (non utilisé à ce jour)
is_verified BOOLEAN DEFAULT false
```

Le champ `labels JSONB` est déjà prévu pour les badges. Il n'a jamais été utilisé. [VERIFIED: grep migrations]

### Nouvelles colonnes nécessaires

```sql
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS siret_verified_at   TIMESTAMPTZ,         -- null = pas encore vérifié
  ADD COLUMN IF NOT EXISTS siret_company_name  TEXT,                 -- raison sociale retournée par l'API
  ADD COLUMN IF NOT EXISTS siret_address       TEXT,                 -- adresse complète retournée
  ADD COLUMN IF NOT EXISTS siret_status        TEXT CHECK (siret_status IN ('active', 'closed', 'not_found', 'error'));
```

**Choix de design :** Colonnes dédiées plutôt que JSONB pour faciliter les requêtes et la migration future. `siret_status` en TEXT avec CHECK constraint (pas d'ENUM) pour éviter une migration ALTER TYPE si de nouveaux statuts émergent.

### Stratégie labels JSONB pour les badges

Le champ `labels` existant stocke un tableau de chaînes. Convention recommandée :

```json
["siret_verified", "decennale_certified"]
```

L'endpoint admin `approve-pro.post.ts` existant met à jour `is_verified`. Il faudra le modifier pour ajouter `"decennale_certified"` dans `labels` quand `approved: true`.

---

## Patterns d'architecture

### Diagramme de flux

```
[claim.vue Step 2]
  SIRET saisi (14 digits, normalisé)
       │
       ▼
[POST /api/v1/pro/claim]  ← existant, à modifier
  ├── Validation Zod SIRET (existant)
  ├── [NEW] fetch recherche-entreprises.api.gouv.fr
  │     ├── total_results === 0 → siret_status = 'not_found', warn (non bloquant)
  │     ├── etat_administratif === 'F' → siret_status = 'closed', BLOQUE inscription
  │     ├── etat_administratif === 'A' → siret_status = 'active', pré-rempli nom+adresse
  │     └── fetch error → siret_status = 'error', non bloquant (dégradé)
  └── INSERT/UPSERT professionals (avec colonnes siret_*)
       │
       ▼
[DB: professionals row]
  siret_status: 'active' | 'not_found' | 'error'
  siret_verified_at: NOW()
  siret_company_name: "DUPONT PLOMBERIE SARL"
  siret_address: "12 RUE DE LA PAIX 78955 CARRIERES-SOUS-POISSY"

[Dashboard / Profil public]
  ├── siret_status === 'active' → badge "Entreprise Vérifiée (API Gouv)"
  ├── decennal_status === 'valid' → badge "Décennale Certifiée BÂTI-AXE"
  └── sinon → pas de badge (ou badge "En attente")

[Admin approve-pro.post.ts] ← à modifier
  approved: true
  └── UPDATE professionals SET decennal_status = 'valid', labels = labels || '["decennale_certified"]'
```

### Structure recommandée des nouveaux fichiers

```
server/api/v1/siret/
└── lookup.get.ts        # Endpoint de test/admin (optionnel — peut être inline dans claim)

app/components/ui/
├── BadgeEntrepriseVerifiee.vue   # "Entreprise Vérifiée (API Gouv)" — cyan
└── BadgeDecennaleCertifiee.vue   # "Décennale Certifiée BÂTI-AXE" — green/shield
```

**Remarque :** Le `PremiumBadge.vue` existant utilise déjà le système de shimmer et les tokens cyan. Les nouveaux badges doivent réutiliser le même pattern de composant.

### Pattern 1 : Lookup SIRET dans le claim endpoint (inline)

```typescript
// server/api/v1/pro/claim.post.ts — ajout après validation Zod
// Source: test direct API + [CITED: recherche-entreprises.api.gouv.fr/docs/]

interface SiretLookupResult {
  status: 'active' | 'closed' | 'not_found' | 'error'
  company_name?: string
  address?: string
  verified_at: string
}

async function lookupSiret(siret: string): Promise<SiretLookupResult> {
  const now = new Date().toISOString()
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`,
      { signal: AbortSignal.timeout(5000) } // 5s timeout — ne jamais bloquer indéfiniment
    )
    if (!res.ok) return { status: 'error', verified_at: now }

    const data = await res.json() as any
    const result = data.results?.[0]

    if (!result || data.total_results === 0) {
      return { status: 'not_found', verified_at: now }
    }

    const etat = result.etat_administratif // 'A' ou 'F'
    return {
      status: etat === 'A' ? 'active' : 'closed',
      company_name: result.nom_complet || result.nom_raison_sociale,
      address: result.adresse,
      verified_at: now
    }
  } catch {
    // Timeout ou réseau — dégradé gracieux
    return { status: 'error', verified_at: now }
  }
}
```

### Pattern 2 : Badge Vue (réutilisation du PremiumBadge pattern)

```vue
<!-- app/components/ui/BadgeEntrepriseVerifiee.vue -->
<!-- Source: pattern existant PremiumBadge.vue -->
<template>
  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
               bg-cyan-100/80 border border-cyan-200 text-sm font-bold text-cyan-800 shadow-sm">
    <svg class="w-4 h-4 text-cyan-600" .../>
    <slot>Entreprise Vérifiée (API Gouv)</slot>
  </span>
</template>
```

```vue
<!-- app/components/ui/BadgeDecennaleCertifiee.vue -->
<template>
  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
               bg-green-100/80 border border-green-200 text-sm font-bold text-green-800 shadow-sm">
    <!-- Shield SVG icon -->
    <slot>Décennale Certifiée BÂTI-AXE</slot>
  </span>
</template>
```

### Pattern 3 : UX Claim — pré-remplissage automatique

Quand l'API retourne un nom (`siret_company_name`) différent de ce que l'artisan a saisi, l'UX correcte est de **proposer** le remplacement, pas de l'imposer silencieusement (l'artisan peut opérer sous un nom commercial distinct de la raison sociale).

```
[SIRET saisi] ──lookup──▶ [raison sociale API trouvée]
                                    │
                    ┌──────────────────────────────────┐
                    │  "Nous avons trouvé : DUPONT PLOMBERIE SARL" │
                    │  [Utiliser ce nom] [Garder mon nom]          │
                    └──────────────────────────────────┘
```

**Alternative plus simple (recommandée pour v1) :** Lookup silencieux, stockage de `siret_company_name` en DB sans modifier le champ UI. L'admin voit la correspondance dans la console. Moins de friction, validé par les success criteria (le badge suffit — pas de pré-remplissage obligatoire).

### Anti-patterns à éviter

- **Ne jamais appeler l'API à l'affichage** : coût, latence, quota. Stocker le résultat en DB à la vérification.
- **Ne jamais bloquer l'inscription sur `error`** : l'API peut être momentanément indisponible. `'error'` = dégradé gracieux, pas de blocage.
- **Ne jamais bloquer sur `not_found`** : les entreprises individuelles non diffusibles ont un SIRET valide qui ne remonte pas dans l'API publique. Afficher un avertissement, pas une erreur bloquante.
- **Ne jamais bloquer sur `closed`** : bloquer est correct — une entreprise fermée ne devrait pas prendre des chantiers. Mais le message d'erreur doit être précis et non technique.
- **Ne pas mettre le lookup côté client** : évident (CORS, exposure, quota).

---

## Ce qu'il ne faut pas construire soi-même

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|------------------|-----------------|----------|
| Annuaire SIRET | Scraper ou parser CSV Sirene | `recherche-entreprises.api.gouv.fr` | Maintenu par l'État, temps réel |
| Validation SIRET checksum | Algorithme de Luhn SIRET maison | Zod regex `\d{14}` + lookup API | L'API confirme l'existence réelle |
| Cache résultat API | KV Cloudflare ou Redis | Pas de cache — stocker en DB | Vérifié une fois au Claim, lookup unique |
| Badge système | Système de feature flags custom | `labels JSONB` déjà en DB | La colonne existe déjà |

---

## Pièges courants

### Piège 1 : SIRET non diffusible ≠ SIRET invalide

**Ce qui se passe :** Un auto-entrepreneur ou EI ayant exercé son droit d'opposition renvoie `total_results: 0` même si son SIRET est valide et l'entreprise active.

**Pourquoi :** Depuis 2023, le statut `statut_diffusion: "N"` a été remplacé par `"P"` (partiellement diffusible). Ces entreprises n'apparaissent pas dans l'API Recherche Entreprises publique.

**Comment éviter :** Mapper `total_results === 0` sur `siret_status = 'not_found'`, ne pas bloquer l'inscription. Afficher : "SIRET non trouvé dans l'annuaire — votre dossier sera vérifié manuellement."

**Signal d'alarme :** Artisans qui signalent "SIRET invalide" alors qu'ils ont un Kbis valide.

### Piège 2 : Timeout API gouv en production

**Ce qui se passe :** L'API d'État peut être lente ou indisponible pendant des maintenances.

**Comment éviter :** `AbortSignal.timeout(5000)` sur le fetch. Mapper l'exception sur `siret_status = 'error'`. Ne jamais awaiter sans timeout dans un Worker Cloudflare.

### Piège 3 : Confusion SIREN / SIRET dans la recherche

**Ce qui se passe :** Le champ `siren` en base est 9 chiffres, `siret` est 14 chiffres. L'API `q=` accepte les deux, mais pour une correspondance exacte d'établissement, utiliser le SIRET 14 chiffres.

**Comment éviter :** Toujours passer le SIRET 14 chiffres (déjà nettoyé dans `claim.post.ts` via `.replace(/\s/g, '')`).

### Piège 4 : Modifier `approve-pro.post.ts` sans mettre à jour `decennal_status`

**Ce qui se passe :** L'endpoint admin existant met à jour `is_verified` mais ne touche pas `decennal_status`. Le badge décennale doit se baser sur `decennal_status`, pas sur `is_verified`.

**Comment éviter :** Modifier `approve-pro.post.ts` pour aussi mettre à jour `decennal_status = 'valid'` et ajouter `"decennale_certified"` dans `labels` lors d'une approbation.

### Piège 5 : CSP bloque l'appel API (fausse piste)

**Ce qui se passe :** Le `connect-src` actuel dans `nuxt.config.ts` ne contient pas `recherche-entreprises.api.gouv.fr`.

**Pourquoi ce n'est pas un problème ici :** La CSP restreint les requêtes **navigateur**. L'appel SIRET se fait côté **Nitro/server** — hors portée de la CSP. Aucune modification CSP nécessaire.

**Mais attention :** Si un jour on veut un lookup live depuis le client (auto-complete en temps réel pendant la frappe), la CSP devra être mise à jour.

---

## Décisions de design (à confirmer avec l'utilisateur si besoin)

### Q1 : L'entreprise fermée bloque-t-elle l'inscription ?

Recommandation : **oui, bloquer** (`siret_status === 'closed'`). Une entreprise radiée ne peut pas prendre des chantiers légalement. Message : "Votre entreprise apparaît comme fermée dans l'annuaire officiel. Contactez-nous si c'est une erreur."

### Q2 : Pré-remplissage de la raison sociale depuis l'API ?

Recommandation : **silencieux pour v1** — stocker `siret_company_name` en DB uniquement, pas de substitution UI. Moins de friction, badges suffisants pour les success criteria.

### Q3 : Le badge décennale se base sur `decennal_status` ou `labels` ?

Recommandation : **`decennal_status === 'valid'`** comme source de vérité, `labels` comme cache d'affichage. Garder la cohérence avec l'ENUM existant.

---

## Architecture de validation (Nyquist)

### Framework de test existant

| Propriété | Valeur |
|-----------|--------|
| Framework | Vitest (détecté via package.json — Phase 4.2 setup) |
| Config | `vitest.config.ts` (si existant) ou inline |
| Commande rapide | `npx vitest run --reporter=verbose` |
| Suite complète | `npx vitest run` |

### Carte requirements → tests

| Req ID | Comportement | Type de test | Commande automatisée |
|--------|-------------|-------------|---------------------|
| API-01 | SIRET actif → `siret_status: 'active'` + nom/adresse stockés | Unit (mock fetch) | `npx vitest run tests/siret-lookup.test.ts` |
| API-01 | SIRET fermé → rejet inscription avec message clair | Unit (mock fetch) | `npx vitest run tests/siret-lookup.test.ts` |
| API-01 | API down → dégradé gracieux, inscription continue | Unit (mock fetch throw) | `npx vitest run tests/siret-lookup.test.ts` |
| API-01 | SIRET non diffusible → `not_found`, avertissement non bloquant | Unit (mock total_results=0) | `npx vitest run tests/siret-lookup.test.ts` |
| API-02 | Badge "Entreprise Vérifiée" affiché si `siret_status === 'active'` | Unit (Vue component) | `npx vitest run tests/badges.test.ts` |
| TRST-01 | Admin approve → `decennal_status = 'valid'` → badge décennale | Unit + API (mock Supabase) | `npx vitest run tests/admin-approve.test.ts` |

### Wave 0 — fichiers de test manquants

- [ ] `tests/siret-lookup.test.ts` — couvre API-01 (mock `fetch`, 4 cas)
- [ ] `tests/badges.test.ts` — couvre API-02 (composants Vue avec @vue/test-utils)
- [ ] `tests/admin-approve.test.ts` — couvre TRST-01 (mock Supabase service role)

---

## Domaine sécurité

### Catégories ASVS applicables

| Catégorie ASVS | Applicable | Contrôle standard |
|----------------|-----------|-------------------|
| V5 Input Validation | oui | Zod `z.string().regex(/^\d{14}$/)` — déjà en place |
| V4 Access Control | oui | lookup SIRET = server-side uniquement, jamais exposé en route publique |
| V2 Authentication | partiel | endpoint claim déjà protégé par `serverSupabaseUser` |
| V6 Cryptography | non | pas de secret impliqué (API sans auth) |

### Menaces spécifiques à ce domaine

| Menace | STRIDE | Mitigation |
|--------|--------|-----------|
| Artisan saisit un SIRET d'un concurrent pour usurper sa raison sociale | Spoofing | Unicité SIRET déjà enforced en DB (`UNIQUE` constraint) ; lookup API ajoute la vérification d'état |
| Appel API d'État en boucle depuis le client | DoS (quota 7 req/s) | Appel uniquement server-side Nitro ; rate limit implicite par l'unicité du claim |
| Injection dans `siret_company_name` venant de l'API | Tampering | Escape HTML au rendu Vue (auto par défaut) ; valider longueur max avant INSERT |
| Entreprise fermée qui contourne le blocage via retry | Tampering | Check sur `siret_status` au re-claim si `is_claimed: false` |

---

## Disponibilité de l'environnement

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|-------------|------------|---------|----------|
| `recherche-entreprises.api.gouv.fr` | API-01 | ✓ (testé) | — | Dégradé `siret_status: 'error'` |
| Supabase local | Migrations | ✓ | 54321 | — |
| Nitro `fetch` global | Cloudflare Workers | ✓ | nodejs_compat | — |
| `AbortSignal.timeout` | Timeout fetch | ✓ | nodejs_compat flag déjà actif | `Promise.race` |

**Dépendances manquantes sans fallback :** aucune.

---

## État de l'art

| Ancienne approche | Approche actuelle | Impact |
|-------------------|------------------|--------|
| Vérification manuelle SIRET par l'admin | Lookup automatique API d'État au Claim | Libère l'admin des vérifications routinières |
| `labels JSONB` inutilisé | `labels` peuplé par les endpoints claim + approve-pro | Activation d'une colonne déjà migrée |
| `decennal_status` mis à jour implicitement via `is_verified` | `decennal_status` géré explicitement dans `approve-pro.post.ts` | Séparation claire vérification légale / certification décennale |

---

## Journal des hypothèses

| # | Hypothèse | Section | Risque si faux |
|---|-----------|---------|---------------|
| A1 | `research-entreprises.api.gouv.fr` accepte un SIRET de 14 chiffres via `q=` et retourne un résultat exact | Standard Stack | Faible — vérifié par test direct avec un vrai SIRET |
| A2 | Les entreprises non diffusibles retournent `total_results: 0` (pas une erreur HTTP) | Pièges | Moyen — si elles retournent une erreur HTTP, le mapping doit être ajusté |
| A3 | `AbortSignal.timeout(5000)` est disponible dans nodejs_compat Cloudflare Workers | Architecture | Faible — déjà utilisé dans la stack ; sinon `Promise.race` avec `setTimeout` |
| A4 | Le champ `labels JSONB` n'est actuellement lu nulle part dans le frontend | DB Schema | Faible — grep confirme aucune lecture dans les composants |

---

## Questions ouvertes (RESOLVED)

1. **Pré-remplissage ou silencieux ?**
   - Ce qu'on sait : le lookup retourne `nom_complet` qui peut différer du nom commercial saisi
   - RESOLVED: silencieux v1 — lookup stocké en DB uniquement, badge affiché. Pas de modification du champ `company_name` saisi par l'utilisateur.

2. **Entreprise fermée : blocage dur ou avertissement ?**
   - Ce qu'on sait : `etat_administratif: "F"` = entreprise radiée
   - RESOLVED: blocage dur — `createError(422)` avec message explicite. Entreprise fermée ≠ artisan légitime actif.

3. **Badge sur le profil public `/pro/[dept]/[slug]` ?**
   - Les success criteria mentionnent "badge de profil" sans préciser public ou privé uniquement.
   - RESOLVED: affiché sur les deux — dashboard privé `/app/dashboard` ET profil public `/pro/[dept]/[slug]`. Point fort B2B de crédibilité côté particuliers.

---

## Sources

### Primaires (HIGH confidence)

- Test direct `https://recherche-entreprises.api.gouv.fr/search?q=44306184100047` — structure JSON vérifiée, `etat_administratif`, `nom_complet`, `adresse`
- [API Recherche d'Entreprises — data.gouv.fr](https://www.data.gouv.fr/dataservices/672cf684c3488a0c533f7094) — taux limite 7 req/s, accès totalement ouvert, gratuit
- `supabase/migrations/20260603000000_schema_initial.sql` — colonnes `labels JSONB`, `decennal_status`, `siret TEXT UNIQUE`
- `server/api/v1/admin/approve-pro.post.ts` — endpoint existant à modifier
- `nuxt.config.ts` — `preset: 'cloudflare-pages'`, `nodejs_compat` actif

### Secondaires (MEDIUM confidence)

- [Cloudflare Workers Fetch API](https://developers.cloudflare.com/workers/runtime-apis/fetch/) — fetch global disponible côté Workers
- [Entreprises non diffusibles — API Entreprise blog](https://entreprise.api.gouv.fr/blog/insee-non-diffusibles) — statut P depuis 2023, non retournées par l'API publique

### Tertiaires (LOW confidence)

- Aucune

---

## Métadonnées

**Ventilation de la confiance :**
- Stack standard : HIGH — API testée directement, stack existante connue
- Architecture : HIGH — basée sur code existant inspecté, pas d'inconnues
- Pièges : HIGH (non diffusibles, timeout) / MEDIUM (cas edge entreprise fermée + reprise)

**Date de recherche :** 2026-06-24
**Valide jusqu'à :** 2026-07-24 (API d'État stable, peu de changements)
