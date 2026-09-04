---
id: SEED-001
status: dormant
planted: 2026-09-04
planted_during: v2.0 « Partenaires en scène » — Phase 9 (Dashboard Pro & Claim des AO)
trigger_when: un partenaire concret du pilote (architecte, agent immo, diagnostiqueur, syndic) demande explicitement un accès programmatique (webhook/API) pour suivre ses appels d'offres, plutôt que de lire des emails
scope: small
---

# SEED-001: Intégration partenaire plus poussée (API/webhooks)

## Why This Matters

En v2.0, le suivi des appels d'offres côté partenaire passe uniquement par
des emails structurés (TEND-16 : sujet/statut identifiables, exploitables
par des outils no-code comme Zapier/Make/n8n sans développement de notre
côté). Un partenaire plus outillé (CRM propre, automatisation interne)
pourrait vouloir un accès programmatique direct (webhook à la diffusion, à
chaque claim artisan) plutôt que de parser des emails.

Décision prise le 2026-09-04 : ne pas construire ça maintenant, c'est
spéculatif — aucun partenaire du pilote (poignée d'architectes/agences/
diagnostiqueurs/syndics dans le 78) n'a exprimé ce besoin. Construire une
API partenaire (authentification par clé API, gestion de webhooks avec
retry, documentation, surface d'attaque supplémentaire sur des données
professionnelles) est un investissement disproportionné pour un besoin non
prouvé.

## When to Surface

**Trigger:** un partenaire concret du pilote demande explicitement un accès
programmatique (pas une demande générique/hypothétique de notre part).

Ce seed doit être présenté pendant `/gsd-new-milestone` si le périmètre du
prochain milestone touche à :
- l'intégration de partenaires B2B tiers (CRM, outils d'automatisation)
- une extension de l'API publique (`/api/v1/`) à des consommateurs externes
- une demande explicite de webhook/notification push par un partenaire

## Scope Estimate

**Small** — scopé au besoin réel du partenaire qui le demande (probablement
1-2 endpoints webhook + une clé API par partenaire), pas une plateforme
d'intégration générique. Ne pas sur-construire même au moment de l'activer.

## Breadcrumbs

- `server/api/v1/b2b/requests.post.ts` — intake actuel, anonyme, sans compte partenaire
- `supabase/migrations/20260822000002_b2b_requests.sql` — schéma `b2b_requests`, pas de notion de compte/API key partenaire
- `.planning/REQUIREMENTS.md` — TEND-16 (emails structurés, v2.0), section « Différé / Anti-features »
- `.planning/research/ARCHITECTURE.md` — étape 6 (optionnelle) « visibilité partenaire sur l'état de diffusion »

## Notes

Discuté pendant le cadrage de v2.0 (`/gsd-new-milestone`) en répondant à la
question « est-ce que les partenaires ont un dashboard ? ». Décision : non,
email suffit — le partenaire est un déposant occasionnel avec ses propres
outils, pas un utilisateur récurrent de la plateforme (contrairement à
l'artisan, qui paie un abonnement et revient chaque jour).
