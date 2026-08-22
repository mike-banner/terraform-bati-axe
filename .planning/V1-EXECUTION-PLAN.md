# 🚀 V1 — Plan d'Exécution (Lancement pilote 78)

> Objectif V1 : machine B2C **en prod mesurée** + **Espace Partenaires MVP** + premières exclusivités vendues.
> Ordre imposé par le risque et la valeur (voir `PLAN_DE_VOL.md`).
> **Dernière mise à jour** : 2026-08-23 (P4 livré, déblocage 72h → 48h, planning resynchronisé)

---

## 1. P3 — Stripe + cron 48h re-testés en prod ⚠️ CRITIQUE
**Pourquoi** : le paywall mort a été découvert par hasard (404 silencieux) — à re-tester avant tout.
**Runbook** : voir `docs/P3-STRIPE-RETEST-RUNBOOK.md`.

- [ ] 1.1 Vérifier que les vars Stripe sont bien posées en prod (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, prix/plan IDs).
- [ ] 1.2 Test checkout de bout en bout (création session → paiement test → webhook reçu).
- [ ] 1.3 Vérifier que `professionals.subscription_status` passe bien à `active`.
- [ ] 1.4 Vérifier que le job `pg_cron` 48h existe bien en prod (`SELECT * FROM cron.job` — `auto-unlock-leads-48h`).
- [ ] 1.5 Vérifier le déblocage auto à T+48h sur un lead réel.
**Sortie** : un abonnement test complet, facturé → activé → lead débloqué à 48h, sans intervention manuelle.

---

## 2. P2 — Turnstile anti-spam (Cloudflare) ✅ CODE LIVRÉ
**Statut** : code prêt, standby (clés Turnstile à poser côté client au transfert).
- [x] 2.1 Ajouter `NUXT_TURNSTILE_SITE_KEY` / `NUXT_TURNSTILE_SECRET_KEY` (config + `.env.example`).
- [x] 2.2 Utilitaire serveur `verifyTurnstile(token, ip)` (appel `siteverify` Cloudflare).
- [x] 2.3 Widget client + envoi du token sur les formulaires publics (`/simulateur`, `/b2b/partenaires`).
- [x] 2.4 Rejet 400 si token invalide/absent en prod (bypass en dev si clé absente).
- [ ] **TODO** : créer les 2 clés Turnstile sur Cloudflare Dashboard → poser les vars en prod.

---

## 3. 06.1 — Console admin opérationnelle ✅ FAIT
**Statut** : console complète avec sidebar, 7 onglets, dark mode.
- [x] 3.1 Vue d'ensemble (KPIs : pros, projets, leads, paywall).
- [x] 3.2 Onglet revue documents (Kbis/décennale) consolidé avec AdminProCard.
- [x] 3.3 Gestion pros (approuver/suspendre/statut) + search + pagination.
- [x] 3.4 Pilotage projets (search étendue client, tri, pagination, cards cliquables).
- [x] 3.5 Audit log consultable (onglet Journal).
- [x] 3.6 Dark mode forcé + contraste cards/badges.
- [x] 3.7 Sidebar fixe + déconnexion dans sidebar.
- [ ] 3.8 Fusion de la future vue `b2b_requests` (05.10) dans le même écran.

---

## 4. 06.2 — KPIs de pilotage (Matomo + dashboard) ✅ CODE LIVRÉ
**Statut** : moteur KPI + dashboard UI livrés. Matomo à brancher côté client.
- [x] 4.1 Schéma : tables `marketing_spend_logs` + `kpi_snapshots` + vue `view_kpi_matching_48h`.
- [x] 4.2 Endpoint `GET /api/v1/admin/kpi-engine` (calcul CAC, LTV, churn, matching, rétention).
- [x] 4.3 Dashboard admin : 6 cartes KPI + matrice lignes rouges (vert/orange/rouge).
- [x] 4.4 Filtre période (7j, 30j, mois, année).
- [ ] 4.5 Matomo (P1) branché sur le funnel (simulateur → lead → contact → chantier).

---

## 5. P4 — Notif leads aux pros (email) ✅
- [x] 5.1 Email transactionnel au pro quand un lead matche ses catégories (Resend existant).
- [x] 5.2 Flag d'opt-in (`professionals.lead_alerts_email`, défaut ON) + idempotence (table `lead_notifications` UNIQUE pro/projet).
- [ ] 5.3 (plus tard, Phase 8) Web Push natif via PWA.
**Sortie** : un pro reçoit un email quand un lead arrive dans sa zone/catégorie.

**Implémentation (2026-08-23)** : `server/utils/notifyProLead.ts` branché sur `projects.post.ts` (remplace le TODO) — pros vérifiés + opt-in dont les catégories matchent, envoi séquentiel non bloquant + trace d'idempotence. **La notification ne débloque rien** : les coordonnées restent masquées (règle Premium / free-grant / attente). Page « Lead non accessible » refaite sur `/espace/leads/[id]` (panneau cadenas : Passer Premium ou attendre 48h + countdown). Déblocage auto passé de **72h → 48h** (cron `auto-unlock-leads-48h`, plus laxiste au lancement).

---

## 6. P9 — Mobile QA
- [ ] 6.1 Landing + simulateur sur 375px/768px sans scroll horizontal.
- [ ] 6.2 États vides (dashboard sans leads, espace client sans messages).
- [ ] 6.3 États erreur/hors-ligne propres.
**Sortie** : parcours mobile complet sans friction.

---

## 7. P12 — Page pro publique « digne » ✅ PARTIEL
**Statut** : CTA « Demander un devis » ajouté. Reste les avis (Phase 7).
- [x] 7.1 CTA contact dans le hero de `/pro/[dept]/[slug]`.
- [x] 7.2 Badge SIRET/décennale déjà affiché.
- [ ] 7.3 Avis clients (Phase 7).
- [ ] 7.4 Galerie améliorée.

---

## 8. 05.10 MVP — Espace Partenaires ✅ LIVRÉ
**Statut** : landing + tunnel complet + endpoint + presign R2. Reste back-office admin.
**En parallèle** : appeler 5-6 artisans, vendre l'exclusivité (valider le modèle terrain avant de sur-builder).

- [x] 8.1 Landing `/b2b/partenaires` (hero « bras armé technique », 4 promesses par type, badge conformité).
- [x] 8.2 Tunnel 4 étapes (profil apporteur → besoin → dropzone fichiers R2 → coordonnées + GDPR).
- [x] 8.3 Endpoint `POST /api/v1/b2b/requests` (Zod + consent + notif Resend équipe + confirmation pro).
- [x] 8.4 Presign R2 public (Turnstile guard, allow-list MIME, 50 Mo).
- [x] 8.5 Thank-you page + référence dossier.
- [x] 8.6 Migration `b2b_requests` + types + RLS.
- [x] 8.7 Liens « Partenaires » dans header/footer.
- [x] 8.8 Back-office admin (onglet `b2b_requests` dans console admin).
- [x] 8.9 Workflow DirCo (qualification CCTP, sélection 2-3 sous-traitants).

---

## 9. P7 — Packs zonés & exclusivité métier
- [ ] 9.1 Modèle de zones (1 zone incluse + add-on par zone + dégressif > 3 zones).
- [ ] 9.2 Exclusivité **Département + Métier** (1 pro par métier/zones).
- [ ] 9.3 Tarifs (Basic 150-200 € / Premium 300 €) + engagement 12 mois.
- [ ] 9.4 Charte d'exclusivité B2C (contrat — cf. `docs/legal/`).
- [ ] 9.5 Paiement via Stripe (abonnements existants à étendre).
**Sortie** : un artisan peut acheter l'exclusivité de son métier/zones, avec contrat signé.

---

## 10. P5 — Feedback loop refus → remise marché testé
- [ ] 10.1 Tester le chemin « tous les pros engagés refusés → projet repart sur le marché ».
- [ ] 10.2 Corriger les trous détectés (statuts, notifications).
**Sortie** : le chemin est vérifié de bout en bout.

---

## Dépendances & ordre
```
P3 (Stripe) ─┬─ P2 (Turnstile) ✅ ─┬─ 05.10 MVP ✅ (upload public)
             │                     │
06.1 (admin) ✴─ 06.2 (KPIs) ✅ ──┴─ P7 (packs) ─ P4/P9/P12 ─ P5
```
**Blocages externes** : clé Turnstile (P2 — standby), PDF Book/Kit (05.10), tarifs définitifs (P7).
