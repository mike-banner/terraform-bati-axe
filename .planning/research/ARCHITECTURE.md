# Architecture Research — Diffusion Appels d'Offres B2B

**Domain:** Intégration broadcast B2B (tenders multi-lots) dans l'architecture BÂTI-AXE existante
**Researched:** 2026-09-04
**Confidence:** HIGH (lecture directe du code source, pas d'hypothèse externe)

## Constat clé : le matching `projects` actuel n'est PAS transposable tel quel

Deux découvertes changent la réponse à la question posée :

1. **`leads/index.get.ts` matche uniquement par catégorie**, pas par zone. La requête est `professionals.categories @> [category]` + `status = 'qualified'` — aucun filtre sur `zone_id` ni sur la table `pro_zones`. Le zonage 78 (Phase 05.16, `pro_zones`) est un système de **pricing dégressif par abonnement**, mais il n'est pas (encore) branché sur la visibilité des leads particuliers dans `/espace/leads`.
2. Le milestone demande explicitement que le tender soit **« claimable via l'abonnement zone existant »** — c'est-à-dire `pro_zones` (zone souscrite, `status = 'active'`), pas `professionals.subscription_status = 'active'` (le flag Premium historique utilisé par `leads/[id]/claim.patch.ts`). Ce sont **deux gates différents** dans le code actuel.

**Conséquence directe :** le matching B2B ne doit pas copier `leads/index.get.ts` (catégorie seule). Il doit être un **nouveau path** qui joint `pro_zones` (zone active) × `professionals.categories` (catégorie). C'est objectivement plus proche de ce que fait déjà `matchZone()` (résolution CP → zone) combiné à la logique de `notifyMatchedPros` (catégorie), mais aucun fichier existant ne fait aujourd'hui les deux ensemble. À écrire.

## Le cas multi-lot casse le modèle `projects` → `leads` à plat

`projects` a une seule colonne `category` (électricité OU plomberie OU ...). `leads` est donc "1 project = 1 file de candidats, tous compétents sur la même catégorie". Un appel d'offres syndic (ex: électricien + plombier + couvreur simultanément) ne rentre pas dans ce moule : trois pros de métiers différents doivent voir des **lots distincts**, chacun avec son propre statut de claim, pas un unique claim partagé sur `b2b_requests`.

`b2b_requests` a déjà `qualifications_requises TEXT[]` (posé par le DirCo en 06.x) et `recommended_pros UUID[]` (sélection manuelle 2-3 pros, tous confondus). Ce `TEXT[]` plat ne peut pas porter un statut de claim par métier — il faut une table enfant.

**Décision d'architecture : promouvoir le modèle d'un cran.**
- `projects` (1 catégorie) → `leads` (N claims) devient
- `b2b_requests` (1 tender) → `b2b_tender_lots` (N lots, 1 par métier) → `b2b_tender_claims` (N claims par lot)

C'est la même topologie que l'existant, juste avec un niveau supplémentaire pour porter le multi-métier. Pas de réinvention de pattern.

## Masquage : ADR-004 ne s'applique pas au B2B

`maskLead.ts` protège les coordonnées d'un **prospect particulier** (ADR-004). Le workflow DirCo actuel (`AdminB2bTab.vue` → email direct via `server/utils/email.ts`) envoie déjà les coordonnées complètes du partenaire aux 2-3 sous-traitants sélectionnés — aucun floutage, aucun état "locked/unlocked". Le partenaire B2B a donné son consentement pour être mis en relation avec des artisans (`consent_source: 'b2b-prescripteur'`), contrairement au particulier qui passe par un cycle unlock 48h/Premium.

**Ne pas réutiliser `maskLead.ts` pour les tenders.** Le pro voit les infos complètes du lot dès qu'il matche zone+catégorie — pas de nouvelle logique de floutage à inventer, pas de dette à porter.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  INTAKE (existant, inchangé)                                        │
│  POST /api/v1/b2b/requests → b2b_requests (status='nouveau')        │
│  Formulaire public anonyme, pas de zone/lot résolus à ce stade       │
├───────────────────────────────────────────────────────────────────── │
│  QUALIFICATION (existant, AdminB2bTab.vue — remplace la sélection    │
│  manuelle 'recommended_pros' par un déclenchement de broadcast)      │
│  DirCo saisit qualifications_requises[] + localisation + planning    │
│  → transition status 'nouveau' → 'qualifie' déclenche le broadcast   │
├───────────────────────────────────────────────────────────────────── │
│  MATCHING & BROADCAST (nouveau)                                     │
│  matchZone(project_location) [réutilisé de zoneMatcher.ts]           │
│  → pour chaque catégorie de qualifications_requises[] :              │
│      créer b2b_tender_lots(tender_id, category, zone_id)             │
│      → matcher pro_zones(zone_id, status=active) ×                  │
│        professionals.categories @> [category]                       │
│      → notifyMatchedTenderPros() [nouveau, miroir notifyProLead.ts]  │
├───────────────────────────────────────────────────────────────────── │
│  DASHBOARD PRO (extension de /espace/leads)                          │
│  GET /api/v1/b2b/lots → lots matchant zone+catégorie du pro           │
│  Nouvel onglet "Appels d'offres" dans espace/leads/index.vue          │
├───────────────────────────────────────────────────────────────────── │
│  CLAIM (nouveau, miroir leads/[id]/claim.patch.ts)                    │
│  PATCH /api/v1/b2b/lots/[id]/claim                                    │
│  Gate : pro_zones actif sur la zone du lot + decennal_status='valid'  │
│  (PAS subscription_status Premium — c'est le point de divergence      │
│  volontaire avec le flux particulier)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Nouveau / Modifié |
|-----------|-----------------|--------------------|
| `server/api/v1/b2b/requests.post.ts` | Intake public, écrit `b2b_requests` | Inchangé |
| `AdminB2bTab.vue` | Triage DirCo, saisie `qualifications_requises` + localisation | Modifié — remplacer le picker manuel `recommended_pros` par un bouton "Diffuser" |
| `server/api/v1/admin/b2b/[id]/broadcast.post.ts` | Résout la zone, crée les lots, matche les pros, déclenche l'email | Nouveau |
| `server/utils/zoneMatcher.ts` (`matchZone`) | CP → zone_id | Réutilisé tel quel, zéro modif |
| `server/utils/matchTenderPros.ts` | Jointure `pro_zones` (zone active) × `professionals.categories` (catégorie du lot) | Nouveau |
| `server/utils/notifyMatchedTenderPros.ts` | Email non-bloquant, idempotent via `b2b_tender_notifications` | Nouveau, miroir structurel de `notifyProLead.ts` |
| `server/api/v1/b2b/lots/index.get.ts` | Liste des lots visibles par le pro connecté (zone+catégorie), avec statut de claim | Nouveau, miroir de `leads/index.get.ts` mais SANS `maskLead` |
| `server/api/v1/b2b/lots/[id]/claim.patch.ts` | Claim d'un lot par un pro | Nouveau, miroir de `leads/[id]/claim.patch.ts` mais gate = `pro_zones`, pas `subscription_status` |
| `app/pages/espace/leads/index.vue` | Dashboard pro | Modifié — nouvel onglet "Appels d'offres" |

## Schéma proposé (nouvelles tables)

```sql
-- 1 ligne par métier requis sur un tender (résout le multi-lot)
CREATE TABLE b2b_tender_lots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES b2b_requests(id) ON DELETE CASCADE,
  category     text NOT NULL,              -- même vocabulaire que professionals.categories
  zone_id      uuid REFERENCES zones(id),  -- résolu via matchZone(project_location)
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed')),
  created_at   timestamptz DEFAULT clock_timestamp(),
  UNIQUE (request_id, category)
);

-- claims par lot (même cap logique que leads : ex. 3 pros max)
CREATE TABLE b2b_tender_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id     uuid NOT NULL REFERENCES b2b_tender_lots(id) ON DELETE CASCADE,
  pro_id     uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'claimed',
  claimed_at timestamptz DEFAULT clock_timestamp(),
  UNIQUE (lot_id, pro_id)
);

-- idempotence des notifications, même pattern que lead_notifications
CREATE TABLE b2b_tender_notifications (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id  uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  lot_id  uuid NOT NULL REFERENCES b2b_tender_lots(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  UNIQUE (pro_id, lot_id, channel)
);
```

`b2b_requests.project_location` reste du texte libre ("département ou CP, défaut 78/IDF") — il faut soit contraindre le champ à un CP 5 chiffres exploitable par `matchZone()` au moment de la diffusion, soit laisser le DirCo saisir/corriger un CP dédié à l'étape qualification. Recommandation : ajouter un champ `project_postal_code` structuré (5 chiffres) rempli par le DirCo à la qualification plutôt que parser `project_location` en texte libre — plus fiable, coût de code minimal (`matchZone` prend déjà un `postalCode` string).

## Pourquoi le broadcast se déclenche à la qualification, pas à l'intake

Le formulaire `b2b/requests.post.ts` est un intake anonyme public sans vérification — c'est exactement pour ça que le workflow DirCo existe (filtrer les demandes bidons/doublons avant de contacter des artisans). Déclencher le broadcast dès l'insert reviendrait à supprimer ce garde-fou et spammer les artisans avec du non-qualifié. Le milestone dit "remplace le tri manuel" — ça vise la **sélection des pros** (`recommended_pros` choisi à la main), pas la qualification elle-même. Le DirCo qualifie toujours (`qualifications_requises`, planning, CP) ; c'est le choix des destinataires qui devient automatique.

## Data Flow

### Broadcast flow (nouveau)

```
DirCo valide un b2b_request (AdminB2bTab.vue)
    ↓ saisit qualifications_requises[] + CP + planning
    ↓ POST /api/v1/admin/b2b/[id]/broadcast
matchZone(cp) → zone_id
    ↓
pour chaque catégorie dans qualifications_requises:
    INSERT b2b_tender_lots(request_id, category, zone_id)
        ↓
    matchTenderPros(zone_id, category)
        → SELECT professionals.id FROM pro_zones JOIN professionals
          WHERE pro_zones.zone_id = $zone_id AND pro_zones.status = 'active'
            AND professionals.categories @> ARRAY[$category]
            AND professionals.decennal_status = 'valid'
        ↓
    notifyMatchedTenderPros(lot, matched_pros) — email non-bloquant, idempotent
```

### Claim flow (nouveau, miroir du claim particulier)

```
Pro ouvre /espace/leads (onglet "Appels d'offres")
    ↓ GET /api/v1/b2b/lots → lots où pro_zones actif + catégorie matche
Pro clique "Répondre à cet appel d'offres"
    ↓ PATCH /api/v1/b2b/lots/[id]/claim
    vérifie pro_zones actif sur zone_id du lot (PAS subscription_status)
    vérifie decennal_status = 'valid'
    cap claimedCount < N (même garde-fou que leads/claim.patch.ts, seuil à confirmer produit)
    ↓ INSERT b2b_tender_claims
```

## Anti-Patterns à éviter ici

### Anti-Pattern 1 : réutiliser `leads/index.get.ts` tel quel pour les tenders

**Ce qu'on pourrait être tenté de faire :** ajouter un `type` discriminant sur `projects`/`leads` pour y faire rentrer les tenders B2B.
**Pourquoi c'est faux :** `projects` a une catégorie unique par design (le calculateur particulier ne produit qu'un seul corps de métier). Forcer le multi-lot dedans demanderait soit de dupliquer la ligne `projects` par métier (fausse le comptage/les KPIs admin existants sur `projects`), soit d'ajouter un array de catégories qui casserait `notifyMatchedPros`, `maskLead`, `leads/claim.patch.ts` (cap à 3, unlock 48h) — tous conçus autour d'1 catégorie = 1 file de claims.
**Faire à la place :** table `b2b_tender_lots` séparée, comme détaillé ci-dessus.

### Anti-Pattern 2 : gater le claim sur `subscription_status` (Premium) au lieu de `pro_zones`

**Ce qu'on pourrait être tenté de faire :** copier-coller la garde de `leads/[id]/claim.patch.ts` (`pro.subscription_status !== 'active'`).
**Pourquoi c'est faux :** le milestone dit explicitement "sur l'abonnement zone existant" — c'est `pro_zones`, le système 05.16, pas le flag Premium legacy. Les deux systèmes coexistent actuellement dans le code sans être unifiés ; copier la mauvaise garde ferait dépendre le B2B d'un abonnement différent de celui vendu comme argument commercial pour les tenders.
**Faire à la place :** vérifier `pro_zones.status = 'active'` pour le `zone_id` du lot.

### Anti-Pattern 3 : appliquer `maskLead()` aux tenders B2B

Voir section dédiée plus haut — ADR-004 protège les prospects particuliers, pas les partenaires B2B qui ont déjà consenti à être mis en relation.

## Ordre de build suggéré (pour le roadmapper)

1. **Fondations schéma + matching pur (backend, sans UI)**
   Migration `b2b_tender_lots` / `b2b_tender_claims` / `b2b_tender_notifications` + `b2b_requests.project_postal_code`. Écrire `matchTenderPros.ts` (jointure `pro_zones` × `categories`) — testable isolément, dépendance de tout le reste.

2. **Déclenchement broadcast côté admin**
   `server/api/v1/admin/b2b/[id]/broadcast.post.ts` + modif `AdminB2bTab.vue` (remplace le picker `recommended_pros` par le bouton diffusion). Dépend de (1). Réutilise `matchZone()` existant sans modification.

3. **Notification email**
   `notifyMatchedTenderPros.ts`, miroir de `notifyProLead.ts` (idempotence + non-bloquant). Dépend de (1) et (2) — a besoin des lots et du matching pour savoir qui notifier.

4. **Lecture côté pro (dashboard)**
   `GET /api/v1/b2b/lots` + nouvel onglet dans `espace/leads/index.vue`. Peut démarrer dès que (1) existe (données de test), mais n'a de sens produit qu'après (2)/(3) en place.

5. **Claim**
   `PATCH /api/v1/b2b/lots/[id]/claim`. Dépend de (4) pour l'UI d'appel, de (1) pour le schéma. Décision produit à trancher avant cette étape : cap de claims par lot (3 comme les leads particuliers ? illimité ? exclusif à 1 seul pro puisque c'est un appel d'offres, pas un lead partageable ?).

6. **(Optionnel, hors scope immédiat)** Visibilité partenaire — voir qui a claim son tender, ou retour d'info à l'AdminB2bTab sur l'état de diffusion (nb pros notifiés/claimés par lot). Utile pour le suivi DirCo mais pas bloquant pour le MVP broadcast.

**Rationale de l'ordre :** le matching (1) est la brique commune à tout le reste — le construire en isolation permet de la tester sans dépendre du reste. Le trigger admin (2) et l'email (3) sont couplés (le broadcast n'a de sens que s'il notifie). La UI pro (4) peut être développée en parallèle de (2)/(3) une fois (1) posé, mais son intérêt produit dépend du broadcast fonctionnel. Le claim (5) ferme la boucle et est le seul point nécessitant une décision produit non tranchée par le code existant (le cap).

## Question ouverte à trancher avant la phase 5 (claim)

Le cap de claims par lot : `leads/[id]/claim.patch.ts` plafonne à 3 pros par projet particulier (partage du lead entre concurrents). Pour un appel d'offres B2B porté par un partenaire professionnel (syndic, architecte...), le produit veut-il la même logique concurrentielle (jusqu'à 3 pros répondent, le partenaire choisit), ou un claim exclusif (1 seul pro, premier arrivé)? Le workflow DirCo historique sélectionnait "2-3 sous-traitants" à la main — ça penche pour garder le cap à 3, mais c'est une décision produit, pas une déduction du code.

## Sources

- Lecture directe du code : `server/utils/zoneMatcher.ts`, `server/utils/maskLead.ts`, `server/utils/notifyProLead.ts`, `server/api/v1/b2b/requests.post.ts`, `server/api/v1/leads/index.get.ts`, `server/api/v1/leads/[id]/claim.patch.ts`, `server/api/v1/projects.post.ts`
- Migrations : `supabase/migrations/20260822000002_b2b_requests.sql`, `20260822000003_b2b_dirco.sql`, `20260828000002_zones_78_packs.sql`, `20260603000000_schema_initial.sql`
- `.planning/PROJECT.md` (contexte milestone v2.0)
- ADR-004 (masquage serveur) — référencé dans `CLAUDE.md` du projet

---
*Architecture research for: diffusion appels d'offres B2B (BÂTI-AXE v2.0)*
*Researched: 2026-09-04*
