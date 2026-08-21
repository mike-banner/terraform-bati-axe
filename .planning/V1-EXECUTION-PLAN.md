# 🚀 V1 — Plan d'Exécution (Lancement pilote 78)

> Objectif V1 : machine B2C **en prod mesurée** + **Espace Partenaires MVP** + premières exclusivités vendues.
> Ordre imposé par le risque et la valeur (voir `PLAN_DE_VOL.md`).

---

## 1. P3 — Stripe + cron 72h re-testés en prod ⚠️ CRITIQUE
**Pourquoi** : le paywall mort a été découvert par hasard (404 silencieux) — à re-tester avant tout.
**Runbook** : voir `docs/P3-STRIPE-RETEST-RUNBOOK.md`.

- [ ] 1.1 Vérifier que les vars Stripe sont bien posées en prod (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, prix/plan IDs).
- [ ] 1.2 Test checkout de bout en bout (création session → paiement test → webhook reçu).
- [ ] 1.3 Vérifier que `professionals.subscription_status` passe bien à `active`.
- [ ] 1.4 Vérifier que le job `pg_cron` 72h existe bien en prod (`SELECT * FROM cron.job`).
- [ ] 1.5 Vérifier le déblocage auto à T+72h sur un lead réel.
**Sortie** : un abonnement test complet, facturé → activé → lead débloqué à 72h, sans intervention manuelle.

---

## 2. P2 — Turnstile anti-spam (Cloudflare)
**Pourquoi** : un bot flood tue la qualité du marché + la délivrabilité email.
**Dépend** : clé Turnstile (site + secret) fournie par le client.

- [ ] 2.1 Ajouter `NUXT_TURNSTILE_SITE_KEY` / `NUXT_TURNSTILE_SECRET_KEY` (config + `.env.example`).
- [ ] 2.2 Utilitaire serveur `verifyTurnstile(token, ip)` (appel `siteverify` Cloudflare).
- [ ] 2.3 Widget client + envoi du token sur les formulaires publics (`/simulateur`, futur `/partenaires`).
- [ ] 2.4 Rejet 400 si token invalide/absent en prod (bypass en dev si clé absente).
**Sortie** : `POST /api/v1/projects` refuse les soumissions sans token Turnstile valide.

---

## 3. 06.1 — Console admin opérationnelle
- [ ] 3.1 Vue d'ensemble (KPIs : pros, projets, leads, paywall).
- [ ] 3.2 Onglet revue documents (Kbis/décennale) consolidé.
- [ ] 3.3 Gestion pros (vérifier/promouvoir/statut).
- [ ] 3.4 Pilotage projets/leads + audit log consultable.
- [ ] 3.5 Fusion de la future vue `b2b_requests` (05.10) dans le même écran.
**Sortie** : l'admin couvre les 5 usages quotidiens sans code monolithique.

---

## 4. 06.2 — KPIs de pilotage (Matomo + dashboard)
- [ ] 4.1 Schéma : `acquisition_costs` (commissions freelance + frais marketing) + `kpi_snapshots`.
- [ ] 4.2 Ingestion : churn (Stripe), matching (projets → réponses pros), coûts (saisie admin).
- [ ] 4.3 Calculs serveur : CAC, LTV, LTV/CAC, churn, matching, rétention, activation fournisseur (stub).
- [ ] 4.4 Dashboard admin : 5 lignes rouges (vert/orange/rouge + action).
- [ ] 4.5 Matomo (P1) branché sur le funnel (simulateur → lead → contact → chantier).
**Sortie** : le pilote est mesurable dès J1.

---

## 5. P4 — Notif leads aux pros (email)
- [ ] 5.1 Email transactionnel au pro quand un lead matche ses catégories (Resend existant).
- [ ] 5.2 Flag d'opt-in + idempotence (pas de double envoi).
- [ ] 5.3 (plus tard, Phase 8) Web Push natif via PWA.
**Sortie** : un pro reçoit un email quand un lead arrive dans sa zone/catégorie.

---

## 6. P9 — Mobile QA
- [ ] 6.1 Landing + simulateur sur 375px/768px sans scroll horizontal.
- [ ] 6.2 États vides (dashboard sans leads, espace client sans messages).
- [ ] 6.3 États erreur/hors-ligne propres.
**Sortie** : parcours mobile complet sans friction.

---

## 7. P12 — Page pro publique « digne »
- [ ] 7.1 Héro + preuve sociale (avis une fois Phase 7) + CTA contact sur `/pro/[dept]/[slug]`.
- [ ] 7.2 Mettre en avant badges (SIRET/décennale) + galerie + likes existants.
**Sortie** : la vitrine du pro donne envie de contacter.

---

## 8. 05.10 MVP — Espace Partenaires + crash test commercial
**En parallèle** : appeler 5-6 artisans, vendre l'exclusivité (valider le modèle terrain avant de sur-builder).

- [ ] 8.1 Landing `/partenaires` (hero « bras armé technique », 4 promesses, badge conformité) + lien header/footer.
- [ ] 8.2 Formulaire épuré (profil → besoin → dépôt fichiers → coordonnées + GDPR) + bouton « Déposer vos plans/cahier des charges ».
- [ ] 8.3 Upload R2 (presign public, derrière Turnstile P2).
- [ ] 8.4 Rappel < 4h : notif équipe (Resend) + email confirmation pro.
- [ ] 8.5 Table `b2b_requests` + vue admin minimale.
**Sortie** : un archi/agent peut déposer un dossier, l'équipe est notifiée, rappel < 4h.

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
P3 (Stripe) ─┬─ P2 (Turnstile) ─┬─ 05.10 MVP (upload public)
             │                  │
06.1 (admin) ┴─ 06.2 (KPIs) ───┴─ P7 (packs) ─ P4/P9/P12 ─ P5
```
**Blocages externes** : clé Turnstile (P2), PDF Book/Kit (05.10), tarifs définitifs (P7).
