# Milestones — BÂTI-AXE

## v1.0 « Pilote 78 en orbite » — shipped 2026-09-04

**Phases** : 05.10 → 06.4 (+ P4, P7, P19) — 14 jours (2026-08-21 → 2026-09-04)
**Volume** : 240 fichiers modifiés sur la fenêtre du milestone

**Accomplissements clés :**
1. Espace Partenaires B2B complet (landing, tunnel 4 étapes, back-office, workflow DirCo) — 05.10
2. Coffre-fort juridique artisan (KBIS/URSSAF/décennale, suspension auto, devoir de vigilance) — 05.11
3. Console admin opérationnelle (8 composants, 9 onglets, audit log) — 06.1
4. KPIs de pilotage (6 indicateurs + seuils) — 06.2
5. Découpage 78 en 4 zones + pricing dégressif Stripe (Subscription Schedule) — 05.16 / P7
6. Notifications email transactionnelles multi-expéditeurs (code complet, activation prod différée) — 06.3

**Détails complets** : `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

**Gaps connus assumés à la clôture** : P3 (re-test Stripe prod), P1 (Umami), 06.4 (mot de passe oublié pro), SMS-01/02, TRST-02 (badge RGE), activation prod 06.3 (DNS). Domaine de production corrigé `bati-axe.fr` → `bati-axe.com` (Terraform corrigé, apply non déclenché).

---

## v0.9.0 « Experience & Growth Pro » — CLÔTURÉ le 2026-08-19

Socle B2C complet pour le pilote mono-ville (Carrières-sous-Poissy). Capture,
onboarding/vérification, verrou & billing, conversion, marché dynamique,
design system, SIRET/badges, portfolio, calculateur, durcissement inputs,
messagerie/espace client, aides rénovation.
