# Phase 8: Diffusion Automatique & Confiance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 08-diffusion-automatique-confiance
**Areas discussed:** Déclenchement diffusion, Critères de matching, Rate-limit anti-spam, Badge « partenaire vérifié »

---

## Format de session

L'utilisateur a demandé de sauter la sélection de zones grises une par une et
de recevoir directement des propositions senior calquées sur les patterns
déjà en place dans le repo, pour les 4 zones grises identifiées par analyse
du code (`notifyProLead.ts`, `restitution.post.ts`, schémas Phase 7/P4/zones).
Réponse : « oui go » — validation en bloc, sans correction.

## Déclenchement diffusion

| Option envisagée | Description | Retenue |
|---|---|---|
| Bouton par lot | Diffusion lot par lot dans l'UI | |
| Bouton unique par AO | Un clic diffuse tous les lots `open` | ✓ |

**Choix :** Bouton unique « Diffuser », actionnable seulement si
`decision_status` + `project_postal_code` renseignés. Idempotence par table
dédiée `b2b_tender_notifications` (UNIQUE pro/lot/channel).

## Critères de matching (TEND-04)

| Option envisagée | Description | Retenue |
|---|---|---|
| Mirroring exact du matching particulier (P4) | Pas de filtre `pro_zones` actif | |
| Filtre strict zone active + catégorie + vérifié | `pro_zones.status='active'` requis, contrairement à P4 | ✓ |

**Choix :** `pro_zones` actif + `professionals.categories @>` + `is_verified`
+ nouvelle colonne `b2b_alerts_email` (opt-out dédié B2B). `zone_id` du lot
résolu au clic diffusion (pas à la qualification).

## Rate-limit anti-spam (TEND-11)

**Choix :** Plafond AO actifs/partenaire = 3 (env var), plafond
notifs/jour/artisan = 5 (env var). Dépassement AO actifs → bouton désactivé,
message DirCo. Dépassement notifs/jour → skip silencieux de l'artisan pour
cette diffusion (non-bloquant).

## Badge « partenaire vérifié » (TEND-14)

**Constat :** aucun SIRET partenaire en base — la formulation ROADMAP
(« réutilise la vérification SIRET existante ») ne peut pas s'appliquer
littéralement côté partenaire.

**Choix :** le badge communique que l'AO a été qualifié manuellement par
BÂTI-AXE (signal de confiance réel qui remplace le tri DirCo), renommé en
interne « AO qualifié BÂTI-AXE », affiché uniquement dans l'email de
notification (le dashboard artisan est Phase 9).

## Claude's Discretion

- Emplacement exact du check de plafond AO actifs (clic Diffuser vs
  transition de statut).
- Design du badge dans le template email.
- Structure exacte de `b2b_tender_notifications`.
- Mode de comptage des notifs/jour (requête COUNT vs compteur dédié).

## Deferred Ideas

- Vraie vérification SIRET partenaire (nouvelle portée).
- UI/table de configuration des seuils de rate-limit.
- Dashboard artisan, claim, fermeture auto, signalement, emails partenaire → Phase 9.
