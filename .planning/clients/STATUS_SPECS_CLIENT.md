# 📊 Suivi des Specs Client — Fait / Reste à faire

> Inventaire vivant des specs reçues du client, croisé avec l'état réel du code et du ROADMAP.
> Mis à jour : 2026-10-30 (resynchronisé avec le code — la version précédente datait du 2026-08-21 et ne reflétait plus les phases 05.10 → 05.19, 06.2, 06.3, 7, 8, 9).
>
> Légende : ✅ livré · 🔶 partiel · ❌ à faire · ⏸️ reporté · 📝 documenté seulement

---

## 0. `20260806` — Cahier des Charges Fonctionnel v1.1 (spec maître)

- ✅ **fait** : US-ART-01 (label vérifié), US-PAR-01 (reste à charge, 05.9), badges SIRET/décennale (Phase 5), abonnement Stripe (Phase 4), packs zonés révisés §4.1 — zones 78 + dégressif (05.16).
- ❌ **reste** : US-ART-02 (sectorisé), US-ART-03/04 (fournisseurs), US-ARC-01..04 (GANTT/IA/signature), US-PAR-02 (courtier, P6), commission/Stripe Connect/signature (P10/P11, reportés), exclusivité métier (P7).
- ✅ écarté : US-DIA-01/02 (outil diagnostiqueur).

---

## 1. `20260806` — PWA Mobile-First & Packaging Stores

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Manifest + Service Worker (`@vite-pwa/nuxt`) | ❌ | Phase 12 |
| Bottom Bar mobile + safe-area | ❌ | Phase 12 |
| Touch targets ≥ 44px + Mobile QA + états vides | ✅ (2026-08-23) | 05.13 / P9 |
| Icônes PWA 192/512 | ✅ (2026-08-23) | 05.12 |
| Capacitor / stores, queue offline | ✅ écartés (décision) | — |

---

## 2. `20260818` — Benchmark Arti-Box & APIs Intelligentes

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| API Mes Aides Réno (simulateur + reste à charge) | ✅ | 05.9 ; compléments DPE/parcours = Deferred |
| Arbitrage APIs IA | 📝 décisions documentées | — |
| §2.1 Alerte capacité (`is_available_subcontracting`, `workforce_size`) | ✅ | 05.11 |
| §2.2 Coffre-fort `documents_artisan` + auto-suspension | ✅ | 05.11 |
| §2.3 Tunnel dépôt projet B2B (lot/CCTP) | ✅ | 05.10 + Phase 7 (multi-lots) |
| Human-in-the-loop DirCo | ✅ | 05.10-08 + Phase 8 (diffusion) |
| §6.1 Packs zonés | 🔶 zones + dégressif livrés | 05.16 ; exclusivité métier = P7 |
| §6.2 Freemium IA (réagencement) | ❌ | non planifié |
| §6.3/6.4 Commission dégressive + Stripe Connect | 📝 | P10 / 05.21 (à arbitrer) |
| §6.5 Signature eIDAS | ❌ | P11 / 05.21 (à arbitrer) |
| §6.7 Devoir de vigilance 6 mois | ✅ | 05.11-03 |
| Workspace architecte | ❌ | P11 |
| US-PAR-02 étude de financement courtier | ❌ | P6 |
| Ouverture TP | ❌ | P16 (V3) |

---

## 3. `20260821` — Espace Partenaires & Apporteurs d'Affaires

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Landing `/partenaires` + `/b2b/partenaires` | ✅ | 05.10 / 05.12 |
| Tunnel 4 étapes + upload R2 (Turnstile) | ✅ | 05.10 |
| Schéma + endpoint public + consentement RGPD | ✅ | 05.10 |
| Back-office admin + notif équipe + email confirmation | ✅ | 05.10-06 / 06.3 |
| Thank-you + PDF (Book / Kit / Attestation) | ❌ PDF = livrable client attendu | — |
| Google Places, simulateur agences, WhatsApp, CRM tiers | ⏸️ V1.1+ | — |
| Annuaire / vitrines / dashboard partenaire | ⏸️ milestone suivant | 05.18 |

---

## 4. `20260821` — KPIs de Pilotage & Scalabilité

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Churn, CAC, LTV, LTV/CAC, matching, rétention, activation (stub) | ✅ endpoint + dashboard | 06.2 |
| Dashboard lignes rouges + filtre période | ✅ | 06.2 |
| Funnel analytics client | ❌ Umami décidé (remplace Matomo), non branché | P1 |
| Définition opérationnelle du « matching » | ⚠️ attente client | — |

---

## 5. `20260821` — Positionnement Courtier & Blindage Juridique

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Copy « Hub des Artisans Certifiés » | ✅ | 05.10 / 05.12 |
| Tunnel par type de lot | ✅ | Phase 7 |
| Tunnel sinistres | ❌ | P21 |
| CGU clause courtier | ❌ | légal (pages légales encore placeholder) |
| Blocage décennale expirante | ✅ | 05.11 + 05.15 + expiration auto `20260920` |
| Tarifs + exclusivité métier | 🔶 | 05.16 / P7 |
| Commission 5-10 % / 2 piliers | 📝 | P10 / P17 |

---

## 6. `20260821` — Modèle Économique B2B2C, Commission & Acteurs

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Cloisonnement B2C (pull) / B2B (diffusion AO) | ✅ | Phases 7-9 |
| Ticket à l'acte 79 € / Pack Elite 450 € | ⏸️ | P20 (milestone suivant) |
| Commission milestones + SEPA + contrat tripartite | 📝 manuel sur 10 chantiers | P10 / P11 / 05.21 |
| Diagnostiqueurs apporteurs | ✅ profil + tunnel ; commission 15-20 €/lead ❌ | 05.17 / P10 |
| « Mes chantiers partagés » | ❌ | P8 |
| Avis certifiés + droit de réponse | ❌ | Phase 11 |

---

## 7. Séquencement GTM (email 21/08)

- **S1 — Crash test commercial** (business, pas de code) : à mener par le client.
- **S2 — Tunnels** : flux particulier ✅ (05.19) ; espace architectes/institutionnels ✅ (05.10).
- **S3-4 — Blindage back-office** : Stripe Billing ✅ ; charte d'exclusivité B2C ❌ (P7) ; contrat d'apport B2B ❌ (05.21 / P11).

---

## 8. `20260821` — Tunnel Sinistres & Assurances (REN)

❌ Non commencé → **P21**. Seuls les badges décennale/RGE existent (Phase 5 + 05.19).

---

## 9. `20260821` — Déontologie, TP & Majors (vision Phase 2/3)

❌ Non commencé → P16 (TP), P22 (Majors). Rétrocession archi : 📝 doc.

---

## 10. `20260827` — Kit de Transfert & Handover des Accès

📝 Documenté. Runbook d'exécution : `docs/PROD-BASCULE-CLIENT-RUNBOOK.md` (uniquement sur demande de Mike). Bloqué par les accès client (Cloudflare, DNS, Resend, Stripe prod, Turnstile).

---

## 11. `20260828` — Stripe Connect, Séquestre & Split Payment

📝 Documenté → P10 (reporté au milestone suivant le 2026-08-30). ⚠️ Repris par la **Phase 05.21** marquée URGENTE au ROADMAP : à arbitrer, contradiction avec le recentrage B2C et la décision « Stripe en dernier » (2026-10-09).

---

## 12. `20260828` — Convention Tripartite & 5 Clauses Juridiques

📝 Documenté → P11 / 05.21 (même arbitrage que §11).

---

## 13. `20260828` — Agents Immobiliers (Home Staging 3D IA & Dossier VIP)

❌ Non commencé — vision v2/v3.

---

## 14. `20260828` — Synthèse des User Stories de l'Écosystème

📝 Cartographie de référence, pas d'implémentation propre.

---

## 15. `20260905` — Benchmark HelloArtisan / ImmoScan

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Sous-tuiles guidées par catégorie (TUNNEL-01) | 🔶 catégorie → postes livrés en 05.19 ; à recouper avant planification | Phase 14 |
| Question « projets complémentaires » avant le Lead Wall (TUNNEL-02) | ❌ | Phase 14 |
| Validation téléphone SMS OTP (TUNNEL-03) | ❌ (dépense fournisseur SMS → feu vert requis) | Phase 14 |
| Data immo / lead vendeur DPE, DVF (IMMO-01/02/03, IMMO-DVF-01) | ❌ | Phase 13 |

---

## 16. `20261009` — Vitrine Prescripteurs / Partenaires

❌ Non commencé → **Phase 05.20** (spec copiée dans `.planning/phases/05.20-vitrine-prescripteurs-partenaires/`, pas encore planifiée) : menu Espace Pro, landing 4 piliers, routage CTA vers `/b2b/partenaires`.

---

## Synthèse — ce qui reste

1. **06.4 Mot de passe oublié + templates Auth** — plans prêts, aucun recours self-service aujourd'hui.
2. **05.20 Vitrine prescripteurs** — dernière spec client reçue.
3. **05.21 Verrou juridique + Stripe Connect** — à arbitrer avant tout code.
4. **P7 exclusivité métier + charte**, **P1 Umami**, **P14 monitoring**.
5. **Phases 13 / 14** — à planifier.
6. **Bascule prod** — bloquée par les accès client.

**En attente du client :** tarifs définitifs et exclusivité (P7), définition du « matching », PDF Book/Kit/Attestation, délai de déblocage (cron 48h inopérant), validation `egbMatches`, accès prod.
