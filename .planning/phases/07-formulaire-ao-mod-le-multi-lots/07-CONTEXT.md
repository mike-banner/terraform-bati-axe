# Phase 7: Formulaire AO & Modèle Multi-Lots - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Source:** Conversation de cadrage milestone v2.0 (`/gsd-new-milestone`) — décisions actées avec l'utilisateur avant écriture du roadmap, pas de session `/gsd-discuss-phase` séparée nécessaire.

<domain>
## Phase Boundary

Cette phase pose le **formulaire et le modèle de données** pour les appels
d'offres (AO) partenaires B2B — elle ne touche PAS encore au matching/
diffusion automatique aux artisans (ça, c'est Phase 8) ni au dashboard/claim
côté artisan (Phase 9).

Ce que cette phase livre concrètement :
1. Le tunnel B2B (`/b2b/partenaires`) + l'écran de qualification DirCo
   (`AdminB2bTab.vue`) collectent une description obligatoire, un statut, et
   supportent le persona syndic avec plusieurs corps de métier.
2. Le schéma de base porte le modèle multi-lots (un AO peut couvrir
   plusieurs corps de métier, chacun devenant un lot indépendant).

</domain>

<decisions>
## Implementation Decisions

### Description obligatoire (TEND-01)
- Champ description **obligatoire, minimum 20 caractères** — même contrainte
  que le champ `description` du formulaire particulier
  (`server/api/v1/projects.post.ts`, `z.string().min(20, ...)`).
- Vient s'ajouter à la fourchette de budget (`budget_range`, déjà existante)
  et aux documents joints (`files`, dropzone R2, déjà existante) — ces deux
  champs restent inchangés.
- Raison : sans description, l'artisan ne peut juger la charge de travail
  qu'avec un budget indicatif — insuffisant (constat fait en session : le
  formulaire B2B actuel n'a AUCUN champ description contrairement au
  formulaire particulier qui en a un depuis toujours).

### Statut confirmé / en attente de décision (TEND-02)
- Chaque AO a un statut choisi **à la qualification** (par DirCo, pas à
  l'intake public anonyme) : **« confirmé »** (travaux décidés, budget
  arrêté, le client a déjà validé) vs **« en attente de décision »** (devis
  à comparer avant une décision — ex. syndic qui sonde les prix avant une
  AG, ou tout partenaire qui veut comparer plusieurs artisans avant de
  choisir).
- **S'applique à TOUS les partenaires** (architecte, agent immo,
  diagnostiqueur, syndic) — pas seulement au syndic. Décision explicite de
  l'utilisateur : « tous les partenaires » plutôt que « syndic uniquement ».
- Ce statut est visible par l'artisan **avant** qu'il ne réponde (affiché en
  Phase 9, mais le champ doit exister dès cette phase).
- Conséquence directe sur le cap de claims (Phase 9, TEND-03, pas cette
  phase) : « confirmé » → 1 seul artisan (exclusif) ; « en attente de
  décision » → jusqu'à 3 artisans (comme les leads particuliers).

### Persona syndic exposé (SYNDIC-01) — CORRECTION 2026-09-04
- **Correction post-vérification code** : contrairement à ce qui était noté
  initialement ici, le persona `syndic` est **déjà exposé** dans le tunnel
  `/b2b/partenaires` — `app/types/b2b.ts` (`APPORTEUR_LABELS`) l'inclut déjà,
  et `partenaires.vue` (step 1) itère `Object.entries(APPORTEUR_LABELS)`,
  donc la carte syndic s'affiche déjà au même niveau qu'architecte/agence
  immo/diagnostiqueur. **SYNDIC-01 est déjà satisfait par le code
  existant — aucune tâche à créer pour l'exposition du persona lui-même.**
- Ce qui reste réellement à construire pour le syndic dans cette phase n'est
  PAS l'exposition du persona (déjà là) mais le **sélecteur multi-lots**
  (TEND-05) qui n'apparaît que pour ce persona — voir section dédiée
  ci-dessous. Le planner doit vérifier ce constat en ouvrant
  `app/pages/b2b/partenaires.vue` avant de créer des tâches, plutôt que de
  prendre ce CONTEXT.md pour argent comptant sur ce point précis.
- Contexte métier (pour calibrer l'UI du statut confirmé/en attente, sans
  obligation légale à coder) : un
  syndic gère des décisions **collectives** (vote en AG de copropriété),
  d'où le besoin du statut confirmé/en attente ci-dessus — c'est le lien
  direct entre SYNDIC-01 et TEND-02. Transparence avec les artisans jugée
  **obligatoire** par l'utilisateur sur ce point.

### Modèle multi-lots (TEND-05)
- Un AO peut nécessiter **plusieurs corps de métier simultanément** (cas
  typique syndic : parties communes — toiture + façade + électricité en
  même temps). Chaque corps de métier devient un **lot distinct**, avec son
  propre statut de claim (le matching/claim lui-même est Phase 8/9, mais le
  schéma qui le permet est posé ici).
- **Décision d'architecture actée (recherche du 2026-09-04,
  `.planning/research/ARCHITECTURE.md`)** : ne PAS forcer ce besoin dans le
  modèle plat `projects`/`leads` existant (1 catégorie par design). Créer un
  niveau supplémentaire, même topologie que l'existant :
  ```
  b2b_requests (1 AO) → b2b_tender_lots (N lots, 1 par corps de métier) → b2b_tender_claims (N claims par lot, Phase 9)
  ```
- Schéma proposé par la recherche (à valider/adapter par le planner, pas
  une prescription rigide) :
  ```sql
  CREATE TABLE b2b_tender_lots (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id   uuid NOT NULL REFERENCES b2b_requests(id) ON DELETE CASCADE,
    category     text NOT NULL,              -- vocabulaire aligné sur professionals.categories
    zone_id      uuid REFERENCES zones(id),  -- résolu via matchZone() à la qualification
    status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed')),
    created_at   timestamptz DEFAULT clock_timestamp(),
    UNIQUE (request_id, category)
  );
  ```
  `b2b_tender_claims` et `b2b_tender_notifications` (tables de la Phase 8/9)
  ne sont PAS à créer dans cette phase — seule `b2b_tender_lots` est du
  ressort du formulaire/modèle de données de Phase 7. Le planner peut créer
  les 3 tables dans une seule migration si c'est plus propre techniquement
  (moins de migrations à séquencer), mais le code applicatif qui les
  consomme (matching, claim) reste hors scope de cette phase.

### Code postal structuré (support de TEND-04, Phase 8 — mais le champ est posé ici)
- `b2b_requests.project_location` est aujourd'hui du texte libre
  ("département ou CP, défaut 78/IDF") — pas exploitable directement par
  `matchZone()` qui attend un code postal 5 chiffres.
- Ajouter un champ structuré `project_postal_code` (regex `^\d{5}$`, même
  contrainte que `postal_code` sur `projects.post.ts`), rempli par le DirCo
  à l'étape de qualification (pas à l'intake public — le partenaire ne le
  saisit pas forcément avec précision).
- Ce champ est nécessaire au matching (Phase 8) mais sa création fait
  partie du "socle de données" de cette phase.

### Pas de vitrine publique, pas de dashboard/compte partenaire (rappel scope)
- Décidé en amont du roadmap (`.planning/PROJECT.md`) : le partenaire reste
  côté demande, pas de profil public, pas de compte/authentification
  partenaire. Rien à construire ici sur ce point — juste ne pas
  l'introduire par accident dans le formulaire (ex. ne pas créer de
  page publique par AO).
- Le suivi partenaire se fait par email structuré (TEND-16, Phase 9) — hors
  scope de cette phase, mentionné ici pour éviter qu'un exécuteur invente un
  mécanisme de suivi dans le formulaire lui-même.

### Claude's Discretion
- Nommage exact des colonnes/enums (le planner peut ajuster le schéma
  proposé ci-dessus si un pattern existant du repo est plus cohérent —
  regarder `qualifications_requises TEXT[]`, `b2b_request_status` enum déjà
  en place).
- UI exacte du sélecteur multi-lots dans `AdminB2bTab.vue` (formulaire
  DirCo) — pas de maquette fournie, appliquer le design system existant
  (copper/navy, radius pill).
- Décider si `b2b_tender_lots` référence `professionals.categories` par
  simple `text` (comme proposé) ou par un enum partagé — vérifier ce que
  fait déjà `professionals.categories TEXT[]` pour rester cohérent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & recherche (décisions déjà actées, ne pas re-débattre)
- `.planning/research/ARCHITECTURE.md` — schéma détaillé, anti-patterns à
  éviter (ne pas réutiliser `leads/index.get.ts` tel quel, ne pas appliquer
  `maskLead.ts` au B2B), ordre de build suggéré.
- `.planning/research/FEATURES.md` — table stakes vs anti-features (pas de
  bidding/comparaison de devis in-app — confirmé dans la conversation).
- `.planning/research/PITFALLS.md` — pièges à éviter (traités en Phase 8/9,
  mais le champ statut syndic de cette phase est directement lié au
  Pitfall 3 : « le syndic n'est pas un client comme les autres »).
- `.planning/REQUIREMENTS.md` — TEND-01, TEND-02, TEND-05, SYNDIC-01
  (source de vérité des critères d'acceptation).

### Code existant à réutiliser / respecter
- `supabase/migrations/20260822000002_b2b_requests.sql` — schéma actuel de
  `b2b_requests`, enum `b2b_apporteur_type` (contient déjà `syndic`), enum
  `b2b_request_status`.
- `supabase/migrations/20260830000001_diagnostiqueur_apporteur.sql` —
  pattern de référence pour ajouter des colonnes conditionnelles
  persona-spécifiques (fait pour le diagnostiqueur en 05.17, à reproduire
  pour le multi-lots syndic plutôt que de forker une table par persona).
- `app/pages/b2b/partenaires.vue` — tunnel de dépôt actuel, à étendre avec
  description + statut + sélection multi-lots (syndic).
- `app/components/admin/AdminB2bTab.vue` — écran de qualification DirCo, à
  étendre avec le champ `project_postal_code` et le statut.
- `server/api/v1/b2b/requests.post.ts` — endpoint d'intake, schéma Zod à
  étendre pour la description obligatoire.
- `server/api/v1/projects.post.ts` (ligne `description: z.string().min(20,...)`)
  — référence exacte de la contrainte à répliquer côté B2B.

</canonical_refs>

<specifics>
## Specific Ideas

- Le formulaire multi-lots syndic doit rester simple pour un pilote (pas de
  UI complexe de gestion de N lots) — une liste à cocher/ajouter des corps
  de métier suffit, pas de sous-formulaire par lot à ce stade (le détail
  budget/description reste au niveau de l'AO parent, pas dupliqué par lot).

</specifics>

<deferred>
## Deferred Ideas

- Matching automatique zone×catégorie, bouton "Diffuser", rate-limit,
  badge partenaire vérifié → **Phase 8**.
- Dashboard artisan, claim, révélation coordonnées, fermeture auto,
  signalement, emails structurés au partenaire → **Phase 9**.
- API/webhooks partenaires, dashboard/compte partenaire, vitrine publique,
  commission B2B/Stripe Connect → hors scope v2.0 (voir
  `.planning/REQUIREMENTS.md` § Différé, `.planning/seeds/SEED-001`).

</deferred>

---

*Phase: 07-formulaire-ao-mod-le-multi-lots*
*Context gathered: 2026-09-04 via conversation de cadrage milestone (pas de discuss-phase séparée)*
