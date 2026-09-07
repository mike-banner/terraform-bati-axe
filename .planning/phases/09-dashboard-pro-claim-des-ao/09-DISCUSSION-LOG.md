# Phase 9: Dashboard Pro & Claim des AO - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 09-dashboard-pro-claim-des-ao
**Areas discussed:** Structure de l'onglet AO, Mécanique du claim, Expiration automatique des lots, Signalement AO suspect

---

## Structure de l'onglet AO

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle dans /espace/leads | Deux onglets dans la même page, cohérent avec le wording "onglet" du roadmap | ✓ |
| Sous-route dédiée /espace/leads/appels-offres | Page séparée, plus simple isolément mais casse la logique "un seul espace" | |

**User's choice:** Toggle dans /espace/leads

| Option | Description | Selected |
|--------|-------------|----------|
| Reprendre le style des cartes leads existantes | Cohérence visuelle, pattern d'interaction déjà connu | ✓ |
| Style distinct inspiré d'AdminB2bTab | Look différencié mais plus de travail et risque d'incohérence | |

**User's choice:** Reprendre le style des cartes leads existantes
**Notes:** Nuance ajoutée par Claude — le critère de succès du roadmap demande "visuellement distinct", réconcilié via un badge/accent plutôt qu'un système de cartes entièrement différent (voir CONTEXT.md D-03).

---

## Mécanique du claim

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation avant engagement | Modale rappelant l'engagement exclusif si AO confirmé | ✓ |
| Bouton direct, une seule action | Plus rapide mais risque de claim accidentel | |

**User's choice:** Confirmation avant engagement

| Option | Description | Selected |
|--------|-------------|----------|
| Toutes les coordonnées de contact | Symétrique au déblocage lead particulier | ✓ |
| Coordonnées partielles | Plus prudent mais incohérent avec le pattern existant | |

**User's choice:** Toutes les coordonnées de contact

| Option | Description | Selected |
|--------|-------------|----------|
| Non, pas dans cette phase | Hors critères de succès, évite la scope creep | ✓ |
| Oui, l'artisan peut retirer son intérêt | Fonctionnalité supplémentaire hors périmètre | |

**User's choice:** Non, pas dans cette phase

---

## Expiration automatique des lots

| Option | Description | Selected |
|--------|-------------|----------|
| 7 jours | Cohérent avec le rythme de qualification DirCo rapide | |
| 14 jours | Plus de marge pour les artisans moins réactifs | ✓ |

**User's choice:** 14 jours

| Option | Description | Selected |
|--------|-------------|----------|
| Cron HTTP, pattern decennale-alerts | Réutilise l'infra existante (secret partagé, GitHub Actions) | ✓ |
| Vérification à la lecture (lazy) | Pas de nouvel endpoint mais lot expiré peut rester "open" en base | |

**User's choice:** Cron HTTP, pattern decennale-alerts

---

## Signalement AO suspect

| Option | Description | Selected |
|--------|-------------|----------|
| Flag sur l'AdminB2bTab existant | Pas de nouvel écran, tout au même endroit | ✓ |
| Nouvel onglet modération dédié | Plus de travail, pertinent seulement à volume significatif | |

**User's choice:** Flag sur l'AdminB2bTab existant

| Option | Description | Selected |
|--------|-------------|----------|
| Flag informatif uniquement | L'AO reste visible, l'admin décide ensuite | ✓ |
| Masque l'AO immédiatement | Plus protecteur mais risque d'abus par signalement malveillant | |

**User's choice:** Flag informatif uniquement

---

## Claude's Discretion

- Wording exact de la phrase d'explication du nouvel onglet
- Design précis du badge "AO Partenaire" et du badge "⚠ signalé"
- Contenu exact de la modale de confirmation de claim
- Structure exacte du formulaire de signalement
- Nommage exact de l'endpoint cron et de la table `b2b_tender_claims`

## Deferred Ideas

- Annulation/retrait de claim par l'artisan après coup
- Écran de modération dédié pour les signalements
