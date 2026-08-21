# 📊 Suivi des Specs Client — Fait / Reste à faire

> Inventaire vivant des specs reçues du client, croisé avec l'état réel du code et du ROADMAP.
> Mis à jour : 2026-08-21.

---

## 0. `20260806` — Cahier des Charges Fonctionnel v1.1 (spec maître)
**Statut global :** spec maître fondatrice — couverte en grande partie par la spec Arti-Box (18/08) + ROADMAP. Détail fait/restant : `.planning/clients/20260806-CAHIER_DES_CHARGES_V1.1-SPEC_CLIENT.md` §7.

- ✅ **fait** : US-ART-01 (label vérifié), US-PAR-01 (reste à charge), badges SIRET/décennale, abonnement Stripe plat.
- ❌ **reste** : US-ART-02 (sectorisé), US-ART-03/04 (fournisseurs), US-ARC-01..04 (GANTT/IA/signature), US-DIA-01/02 (diag, écarté), US-PAR-02 (courtier), commission/Stripe Connect/signature (P10/P11), packs zonés révisés (P7).
- ⚠️ **§4.1 révisé le 08/08** : pricing par add-on de zone (1 zone incluse + add-on + dégressif > 3 zones) → reporté dans P7.

---

## 1. `20260806` — PWA Mobile-First & Packaging Stores
**Statut global :** cadrée, **non implémentée** → Phase 8 (Not started).

| Élément | Fait | Reste |
| :--- | :--- | :--- |
| Manifest + Service Worker (`@vite-pwa/nuxt`) | ❌ | Phase 8 (Not started) |
| Bottom Bar mobile + safe-area + touch targets | ❌ | Phase 8 |
| Capacitor / App Store / Play Store | ✅ écarté (décision) | — (hors scope, ADR dédié si besoin) |
| Queue offline (Dexie/IndexedDB) | ✅ écarté (décision) | — (hors scope) |
| Mobile QA (landing + simulateur + états vides) | ❌ | **P9** (backlog) |

---

## 2. `20260818` — Benchmark Arti-Box & APIs Intelligentes
**Statut global :** cadrée/filtrée, **partiellement implémentée**. ✅ **SPEC COMPLÈTE** (consolidée le 2026-08-21 à partir des 4 emails source 17-18/08).

| Élément | Fait | Reste |
| :--- | :--- | :--- |
| §1 + §9.1 — API Mes Aides Réno (simulateur) | ✅ **Phase 05.9** livrée (proxy Nitro + mini-tunnel + reste à charge) | Compléments : DPE actuel/visé, parcours d'aide (Deferred) |
| §3 — Arbitrage APIs IA | ✅ décisions documentées | — |
| §2.1 — Switch « Alerte Capacité » (`is_available_subcontracting`, `workforce_size`) | ❌ | **§9.2** + P7 |
| §2.2 — Coffre-fort juridique `documents_artisan` + auto-suspension | ⚠️ partiel (Kbis/décennale existent dans `verifications`) | Table `documents_artisan` + URSSAF + auto-suspension |
| §2.3 — Tunnel Dépôt Projet B2B (Lot/CCTP) | ❌ | → couvert par **Phase 05.10** (spec 21/08) |
| §6.1 — Packs zonés (Zone Unique / Département, 12 mois) | ❌ | **P7** (backlog) |
| §6.2 — Freemium IA (Assistant Réagencement, crédits) | ❌ | non traité (Phase 7+) |
| §6.3 — Commission dégressive 8→2,5 % | 📝 doc only | **P10** |
| §6.4 — Stripe Connect (split flux) | 📝 doc only | **P10** |
| §6.5 — Signature eIDAS (Yousign/DocuSign) | ❌ | **P11** (Phase 7+) |
| §7 — Écrans (Dashboard artisan, Workspace archi, App diag, Portail particulier) | ⚠️ partiel | **P11** (workspace archi) ; diag écarté (niche) |
| US-PAR-02 — Étude de financement courtier | ❌ | **P6** (backlog) |
| §9.2 — Schéma BDD `documents_artisan` + colonnes sous-traitance | ❌ | **Phase 05.11** (créée 2026-08-21) |
| Human-in-the-Loop DirCo (analyse CCTP, 2-3 sous-traitants validés) | ❌ | Phase 05.10 |
| Ouverture TP (VRD, terrassement, géomètres) | ❌ | Phase 7+ |
| Devoir de vigilance 6 mois (re-contrôle docs) | ❌ | légal/ops (spec §6.7) |

### 2bis. ✅ Morceau manquant comblé (2026-08-21)
La spec a été **consolidée** à partir des 4 emails source (17/08 12:12 benchmark Arti-Box, 17/08 12:17 APIs IA, 17/08 12:21 API Mes Aides Réno, 18/08 11:08 positionnement simulateur). Ajouts intégrés :
- §2.3 Plan de Dépassement (matrice : modèle hybride, human-in-the-loop, ouverture TP)
- §2.4 Directive tech `documents_artisan` + colonnes sous-traitance (immédiate)
- §1 payload API Mes Aides Réno + alternatives privées (Calculeo/Effy/Aides-energie) + positionnement « 2 formes »
- §3 APIs IA détaillées (ControlNet/GetFloorPlan/Interior AI, Whisper+Claude, Doc AI/LlamaParse, Vapi/Retell) + architecture reco
- §6.7 devoir de vigilance 6 mois ; §10 synthèse fait/à faire

---

## 3. `20260821` — Espace Partenaires & Apporteurs d'Affaires (B2B/B2B2C)
**Statut global :** cadrée + arbitrages appliqués → **Phase 05.10** (Not started). **100 % à construire** (l'ancienne « Phase 5.8 » était docs-only).

| Élément | Fait | Reste |
| :--- | :--- | :--- |
| Landing `/partenaires` + hero + réassurance + badge | ❌ | 05.10-04 |
| Tunnel 4 étapes | ❌ | 05.10-05 |
| Upload drag & drop (50 Mo, R2) | ❌ | 05.10-03 (dépend P2 Turnstile) |
| Schéma BDD + endpoint public + consentement RGPD | ❌ | 05.10-01 / 05.10-02 |
| CRM interne + notif équipe (Resend/Slack) + email confirmation | ❌ | 05.10-06 |
| Thank-you + PDF (Book/Kit/attestation) | ❌ | 05.10-07 (PDF = ⚠️ livrable client) |
| Google Places, simulateur macro agences, WhatsApp, CRM tiers | ❌ | **V1.1+** (hors phase) |

---

## 4. `20260821` — KPIs de Pilotage & Scalabilité
**Statut global :** cadrée — **NON implémentée** (seul `paywall_events` existe) → **Phase 06.2**.

| Élément | Fait | Reste |
| :--- | :--- | :--- |
| Churn (Stripe) | ⚠️ données dispo, pas calculé | 06.2 |
| CAC / LTV / LTV-CAC | ❌ | 06.2 (+ table `acquisition_costs`) |
| Taux de matching | ❌ (pas de notion « devis ») | 06.2 + définition à trancher |
| Rétention prescripteurs | ❌ | 06.2 (V1 particuliers, B2B via 05.10) |
| Activation fournisseurs | ❌ | dépend P11 (stub) |
| Dashboard 5 lignes rouges | ❌ | 06.2 |
| Outil analytics | ✅ Matomo décidé (P1), pas branché | 06.2-04 |

---

## 5. `20260821` — Positionnement Courtier & Blindage Juridique (Plateforme B2B)
**Statut global :** cadrée — **à implémenter** (spec dédiée `.planning/clients/20260821-POSITIONNEMENT_COURTIER_BLINDAGE_JURIDIQUE-SPEC_CLIENT.md`).

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Copy « Hub des Artisans Certifiés » | ❌ | 05.10 |
| Tunnel par type de lot / sinistres | ❌ | 05.10 (extension) |
| CGU clause courtier | ❌ | Légal + 05.10 |
| Blocage décennale expirante | ❌ (couvert) | 05.11 |
| Tarifs Basic/Premium + exclusivité métier | ❌ | P7 |
| Commission 5-10 % / 2 piliers | 📝 doc | P10 / P17 |

---

## 6. `20260821` — Modèle Économique B2B2C, Commission & Acteurs
**Statut global :** cadrée — **à implémenter** (spec `.planning/clients/20260821-MODELE_ECONOMIQUE_COMMISSION_ACTEURS-SPEC_CLIENT.md`). ⚠️ 3 conflits à trancher.

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Cloisonnement B2C/B2B (push/pull) | ❌ | 05.10 + P20 |
| Ticket à l'acte 79 € / Pack Elite 450 € | ❌ | P20 |
| Commission milestones + SEPA + contrat tripartite | ❌ (manuel 10 premiers) | P10/P11 |
| Diagnostiqueurs apporteurs (15-20 €/lead) | ❌ (réversal → GO) | P19 |
| Matrice monétisation (qui paye qui) | 📝 doc | — |
| « Mes chantiers partagés » + déclencheur commission | ❌ | P10/P11 |
| Avis certifiés + droit de réponse | ❌ | Phase 7 |

---

## 7. Séquencement opérationnel (GTM — S1→S4, source email 21/08)
Le client donne un ordre d'exécution **business-first** :
- **S1 — Crash Test Commercial** (business, pas de code) : appeler 5-6 artisans, vendre l'exclusivité (**200 €/mois, 1 pro par métier**), valider le modèle par le terrain avant de builder.
- **S2 — Maquettage des 2 tunnels** : Flux 1 Particulier (max 5 clics, attribution auto → simulateur 5.6 ✅ + zonage P7) ; Flux 2 « Espace Architectes & Institutionnels » + bouton « Déposer un dossier » + rappel 4h (→ 05.10).
- **S3-4 — Blindage back-office** : Stripe Billing (✅ Phase 4) + **2 contrats** : **charte d'exclusivité B2C** (nouveau) + **contrat d'apport B2B** (anti-contournement) via DocuSign/HelloSign.

---

## 8. `20260821` — Tunnel Sinistres & Assurances (REN)
**Statut global :** cadrée — **à implémenter** (3ᵉ flux, spec `.planning/clients/20260821-TUNNEL_SINISTRES_ASSURANCES_REN-SPEC_CLIENT.md`). → P21.

| Élément | Statut |
| :--- | :--- |
| Tunnel sinistre 4 étapes + bouton rouge | ❌ |
| Plateformes sinistre (IMH/Saretec/Texa/Multiassistance) + experts locaux | ❌ (business) |
| Devis normes assurance (Sedgwick/Sia) | ❌ |
| Contractant Général (1 interlocuteur) | ❌ (scope) |
| Décennale + RGE visibles | ⚠️ partiel (badges Phase 5) |

---

## 9. `20260821` — Déontologie, TP & Majors (vision Phase 2/3)
| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Rétrocession archi (3 options légales + ascenseur) | ❌ | Modèle Économique §8 |
| TP (apporteurs + tunnel + barrières) | ❌ Phase 2 | P16 |
| Majors Grands Comptes (tunnel + commission paliers) | ❌ Phase 3 | P22 |
| Commission paliers Majors 5→2-3 % | ⚠️ conflit % | Modèle Économique §6 |

---

## Synthèse prioritaire — ce qui reste à faire
1. **Phase 05.10 (Espace Partenaires)** — nouveau module B2B, dépend de P2 Turnstile + Phase 06.1.
2. **P2 (Turnstile anti-spam)** — pré-requis de l'upload public (aussi utile au simulateur B2C).
3. **Phase 06.1 (Console Admin)** — en cours, à fusionner avec la vue `b2b_requests`.
4. **§9.2 Arti-Box (schema sous-traitance)** + **P7 (packs zonés)** — pivot B2B Phase 7.
5. **P6 (étude financement)** — levier monétisation simple, non fait.
6. **Phase 06.2 (KPIs de pilotage & scalabilité)** — à plannifier dès J1 lancement, dépend P1 + Phase 06.1.

**Spécifications en attente du client :**
- Définition opérationnelle du « matching » (devis vs réponses vs leads débloqués) — spec KPIs 21/08.
- PDF Book Garanties / Kit Convention / Attestation (spec 21/08).
- Toute nouvelle spec à venir.
