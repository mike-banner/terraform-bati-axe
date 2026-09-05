# Phase 8: Diffusion Automatique & Confiance - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Remplacer le tri manuel DirCo (`recommended_pros`) par un matching automatique
zone×catégorie qui notifie par email les artisans concernés, avec les
garde-fous anti-spam et un signal de confiance en place dès le lancement.

Ne couvre PAS : le dashboard artisan / onglet « Appels d'offres », le claim,
la révélation des coordonnées, la fermeture auto, le signalement, les emails
de statut au partenaire (tout ça = Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Déclenchement de la diffusion
- **D-01:** Un seul bouton **« Diffuser »** par AO (pas un bouton par lot),
  ajouté dans `AdminB2bTab.vue`, qui remplace le picker manuel
  `recommended_pros` dans ce flux.
- **D-02:** Le bouton n'est actionnable que si `decision_status` ET
  `project_postal_code` sont renseignés sur le dossier (prérequis du
  matching zone×catégorie).
- **D-03:** Cliquer « Diffuser » traite **tous les lots `open`** du dossier
  en une fois (pas de diffusion lot par lot dans l'UI de cette phase).
- **D-04:** Idempotence par (pro, lot) via une nouvelle table
  `b2b_tender_notifications` (même forme que `lead_notifications` :
  `UNIQUE(pro_id, lot_id, channel)`). Un second clic « Diffuser » (ex. après
  ajout d'un lot) ne renvoie pas de notif aux pros déjà notifiés sur des lots
  déjà diffusés, mais notifie les nouveaux lots/pros.
- **D-05:** `recommended_pros` reste en base (pas de suppression de colonne)
  mais n'est plus alimenté par ce nouveau flux — dépréciation douce, pas de
  migration destructive cette phase.

### Critères de matching (TEND-04)
- **D-06:** `zone_id` du lot (`b2b_tender_lots.zone_id`) est résolu **au
  moment du clic « Diffuser »** via `matchZone(project_postal_code)` — pas à
  la qualification — pour rester robuste si le code postal est corrigé
  entre-temps.
- **D-07:** Un artisan est matché sur un lot si, simultanément :
  - `pro_zones` a une ligne `(pro_id, zone_id = lot.zone_id, status = 'active')`
  - `professionals.categories @> [lot.category]`
  - `professionals.is_verified = true`
  Contrairement au matching particulier (`notifyMatchedPros`/P4, qui ne
  filtre pas par zone active), TEND-04 exige explicitement `pro_zones`
  actif — décision assumée : un artisan doit avoir une zone payante active
  pour recevoir des AO partenaires.
- **D-08:** Nouvelle colonne `professionals.b2b_alerts_email` (boolean,
  défaut `true`), distincte de `lead_alerts_email`, pour que l'artisan
  puisse couper les alertes B2B indépendamment des alertes particuliers.
  Ajoutée au filtre de matching (`= true`).

### Rate-limit anti-spam (TEND-11)
- **D-09:** Plafond d'AO actifs simultanés par partenaire : **3** par
  défaut, via variable d'env `B2B_MAX_ACTIVE_TENDERS_PER_PARTNER`. Compté
  sur `b2b_requests.status` NOT IN (`converti`, `perdu`, `clos`). Au-delà :
  le bouton « Diffuser » (ou la qualification elle-même — à trancher par le
  planner selon où le check est le plus naturel) est désactivé avec un
  message clair pour le DirCo — pas de blocage silencieux.
- **D-10:** Plafond de notifications B2B par artisan par jour, tous
  partenaires confondus : **5** par défaut, via variable d'env
  `B2B_MAX_NOTIFICATIONS_PER_ARTISAN_PER_DAY`. Au-delà : l'artisan est
  silencieusement exclu de la diffusion en cours (même pattern non-bloquant
  que `notifyMatchedPros` — un échec/skip individuel ne casse jamais la
  diffusion globale).
- **D-11:** Les deux seuils vivent dans `.env.example` (documentés
  immédiatement) — pas de table de config ni d'UI admin pour les ajuster au
  pilote (YAGNI, aucun horizon connu de besoin de changement à chaud).

### Signal de confiance « partenaire vérifié » (TEND-14)
- **D-12:** **Aucun SIRET partenaire n'existe en base** — impossible de
  littéralement « réutiliser la vérification SIRET » côté partenaire
  (`b2b_requests` n'a pas de SIRET). Le badge ne vérifie donc PAS le
  partenaire mais communique que **l'AO a été qualifié manuellement par
  l'équipe BÂTI-AXE avant diffusion** — c'est le signal de confiance réel
  que le tri manuel DirCo apportait, et qu'on reconstitue autrement.
- **D-13:** Libellé interne/UI : **« AO qualifié BÂTI-AXE »** plutôt que
  « partenaire vérifié », pour rester honnête sur ce qui est effectivement
  vérifié.
- **D-14:** Affiché uniquement dans l'**email de notification** à l'artisan
  (via `renderEmail()`) — c'est le seul canal existant en Phase 8, le
  dashboard visuel artisan est Phase 9. Aucune UI dashboard à créer cette
  phase pour ce badge.

### Claude's Discretion
- Emplacement exact du check de plafond D-09 (au clic « Diffuser » vs à la
  transition de `decision_status` vers qualifié) — choisir le point le plus
  simple à implémenter proprement sans dupliquer la logique.
- Design exact du badge dans le template email (texte, icône/emoji, position
  dans `renderEmail()`).
- Structure exacte de `b2b_tender_notifications` (colonnes additionnelles
  éventuelles type `sent_at`) — mirroring `lead_notifications`.
- Où stocker le compteur de notifications/jour/artisan (requête `COUNT`
  sur `b2b_tender_notifications.sent_at::date = today` plutôt qu'un compteur
  dédié — cohérent avec l'absence de table de compteurs ailleurs dans le
  repo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & architecture
- `.planning/REQUIREMENTS.md` — TEND-04, TEND-06, TEND-10, TEND-11, TEND-14
  (source de vérité des critères d'acceptation).
- `.planning/ROADMAP.md` § Phase 8 — success criteria exacts.
- `.planning/research/ARCHITECTURE.md` — schéma `b2b_tender_lots` →
  `b2b_tender_claims`/`b2b_tender_notifications`, anti-patterns (ne pas
  réutiliser `leads/index.get.ts` tel quel, ne pas appliquer `maskLead.ts`
  au B2B).
- `.planning/phases/07-formulaire-ao-mod-le-multi-lots/07-CONTEXT.md` —
  contexte du modèle multi-lots posé en Phase 7, décisions sur
  `b2b_tender_lots`.

### Code existant à réutiliser / respecter
- `server/utils/notifyProLead.ts` (`notifyMatchedPros`) — pattern exact à
  répliquer pour le matching B2B : requête pros, idempotence via table
  dédiée, envoi séquentiel non-bloquant, `renderEmail()`.
- `server/utils/zoneMatcher.ts` (`matchZone`) — résolution CP → zone,
  à réutiliser pour `b2b_tender_lots.zone_id`.
- `supabase/migrations/20260823000002_p4_lead_notifications.sql` — schéma
  de référence pour `b2b_tender_notifications`.
- `supabase/migrations/20260828000002_zones_78_packs.sql` — schéma
  `pro_zones` (`pro_id`, `zone_id`, `status`), condition d'activité à
  matcher.
- `supabase/migrations/20260904000000_phase7_tender_lots.sql` — schéma
  actuel de `b2b_tender_lots` (`category`, `zone_id` nullable, `status`).
- `server/api/v1/admin/b2b-requests/[id]/restitution.post.ts` — pattern de
  référence pour un endpoint admin qui envoie un email et trace en audit
  log (`audit_logs`) ; à adapter pour l'action « Diffuser ».
- `app/components/admin/AdminB2bTab.vue` — écran DirCo où le bouton
  « Diffuser » doit être ajouté (remplace la logique `recommended_pros`
  dans ce flux).
- `.env.example` — emplacement pour documenter
  `B2B_MAX_ACTIVE_TENDERS_PER_PARTNER` et
  `B2B_MAX_NOTIFICATIONS_PER_ARTISAN_PER_DAY`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notifyMatchedPros` / `renderEmail` / `sendEmail` — infra email
  transactionnelle complète et déjà idempotente, à répliquer plutôt qu'à
  réinventer.
- `matchZone(postalCode)` — résolution zone déjà centralisée.
- Table `audit_logs` — déjà utilisée pour tracer les actions DirCo
  (`b2b_restitution_sent`), même pattern pour tracer la diffusion.

### Established Patterns
- Toute notification email en masse est **non-bloquante** : chaque envoi
  individuel est tenté/loggé indépendamment, jamais d'échec en cascade.
- Idempotence par table dédiée avec contrainte `UNIQUE`, jamais de flag
  booléen unique sur la ressource parente (permet de rejouer sans dupliquer
  et de granulariser par destinataire).
- Seuils/config simples → variables d'env + `.env.example`, pas de table
  settings tant qu'aucun besoin de changement à chaud n'est identifié.

### Integration Points
- `AdminB2bTab.vue` : nouveau bouton + état (dossier déjà diffusé ou non,
  par lot).
- Nouvel endpoint admin (ex. `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts`)
  suivant le pattern de `restitution.post.ts`.
- `professionals` : nouvelle colonne `b2b_alerts_email`.
- `b2b_tender_lots.zone_id` : passe de nullable/non résolu à résolu au clic
  diffusion.

</code_context>

<specifics>
## Specific Ideas

Aucune référence produit spécifique fournie au-delà des décisions ci-dessus
— l'utilisateur a validé les propositions senior calquées sur les patterns
existants du repo (« oui go »), sans demander d'ajustement.

</specifics>

<deferred>
## Deferred Ideas

- Vraie vérification SIRET côté partenaire (si le client veut un jour un
  badge de confiance qui vérifie réellement le partenaire plutôt que la
  qualification DirCo) — nouvelle portée, pas actée pour v2.0.
- UI/table de configuration des seuils de rate-limit (actuellement env
  vars fixes) — à envisager si le pilote révèle un besoin de réglage
  fréquent.
- Dashboard artisan, claim, révélation coordonnées, fermeture auto,
  signalement, emails structurés au partenaire → **Phase 9**.

</deferred>

---

*Phase: 08-diffusion-automatique-confiance*
*Context gathered: 2026-09-05*
