# 📄 Note — Modèle économique hybride (abonnements + leads à l'unité + commissions)

> **Statut : NOTE, non planifiée, plusieurs points CONTREDISENT des décisions déjà prises.** Rangée le 2026-11-06 sur demande de Mike. Aucune ligne de code écrite.
> Complète `20261106-LEAD_TUNNEL_VENTE_DIAG_COURTIER-SPEC_CLIENT.md` (mêmes acheteurs de leads, mêmes réserves).

## 📌 Metadata
- **Projet** : BÂTI-AXE — **Sujet** : composition du modèle hybride et hypothèses de flux — **Date** : 2026-11-06
- **Auteur** : client, via Mike. Texte brut en annexe ; on ne sait pas quel outil IA l'a produit.

## 🎯 1. Ce que dit le client (résumé)
Trois piliers :
1. **Abonnements artisans** : Zone Classic 149 €/mois, Flux Max 249 €/mois, Pack Élite 449 €/mois (accès exclusif au flux B2B / copropriétés / syndics).
2. **Bourse aux leads à l'unité (PPL)** : agent immo 120 €, artisan 45 €, diagnostiqueur 25 €, courtier 30 € ; règle : « les leads non absorbés par le réseau SaaS sont vendus à l'unité » ; un formulaire peut générer jusqu'à 220 € (120 + 45 + 25 + 30, arithmétique juste).
3. **Commissions** : intermédiation tripartite **8 % quel que soit le montant** du chantier (prélevée à la source via Stripe Connect) ; courtage de financement **5 % du prêt travaux débloqué** ; split payment Stripe Connect à l'acompte.

## ⚠️ 2. Contradictions avec l'existant (vérifiées 2026-11-06)

| # | Point | Existant | Demande | Gravité |
|---|---|---|---|---|
| 1 | **Commission** | **05.21 D-01 : 8 % jusqu'à 200 000 € HT, 6 % au-delà, calcul par tranche — confirmé par Mike le 2026-10-30.** Implémenté dans `computeCommission` (`server/utils/commission.ts`), testé, appliqué à la table `b2b_engagements` migrée au cloud le 2026-11-05. P22 (Majors) prévoit encore des paliers 5 % → 2-3 % | « 8 % quel que soit le montant » | **Haute** : si le taux unique l'emporte, il faut modifier la règle, ses tests et le gabarit des contrats signés ; les engagements déjà signés gardent leur version de gabarit |
| 2 | **Prix des abonnements** | Code (`zoneMatcher.ts`) : abonnement **par zone**, 190 € → 350 € mensuel dégressif, 150 € → 300 € annuel (05.16, livré). P7 : Basic 150-200 € / Premium 300 €. P20 : Pack Élite/Corporate 450 €/mois + ticket à l'acte 79 € | « Zone Classic 149 / Flux Max 249 / Élite 449 » : des **paliers d'offre**, non par zone | **Haute** : modèle de tarification différent (paliers vs dégressif par zone). 449 ≈ 450 de P20, mais 149 et 249 ne correspondent à rien d'existant |
| 3 | **Marché dynamique** | Les chantiers se lisent en direct depuis `projects` selon `professionals.categories` ; une ligne `leads` n'existe qu'au déblocage ; pas de modèle « push » (Phase 4.6, invariant) | « Leads non absorbés vendus à l'unité » | **Haute** : aucun mécanisme d'achat unitaire ni de notion de « lead absorbé » (délai ? nombre de pros ?) n'existe. Ticket à l'acte 79 € de P20 est le plus proche, à un autre prix (45 € ici) |
| 4 | **Valeur d'un lead artisan** | Les abonnés reçoivent les leads de leur zone en illimité selon l'offre | vendre le même lead à l'unité à un non-abonné | **Moyenne** : dévalue l'abonnement et pose la question de l'exclusivité (P7) |
| 5 | **Prix des leads** | Note précédente : 15-30 € artisan, 20-40 € diag, 30-60 € courtier, 80-150 € agent. Spec 21/08 (P19) : diagnostiqueur = apporteur d'affaires **payé** 15-20 €/lead par la plateforme | ici : artisan 45, diag 25, courtier 30, agent 120 ; le diagnostiqueur serait **acheteur** | **Moyenne** : sens de l'argent inversé pour le diagnostiqueur (P19 le rémunère, ici il paie) ; fourchettes incohérentes entre deux textes du même client |
| 6 | **Courtage 5 % du prêt** | P6 = « 1 CTA + envoi », ❌ absent, aucun montant de commission | 5 % du prêt débloqué | **Haute** : cette rémunération vient de l'établissement prêteur, pas d'un paiement Stripe ; « prélevée à la source via Stripe Connect » ne s'y applique pas. Activité réglementée (intermédiation en crédit) : *à valider par le conseil juridique ; je n'en suis pas sûr à 100 %* |
| 7 | **Stripe Connect** | Phase 05.22 (séquestre / split) non commencée ; 05.21 ne fait que déclarer et suivre les montants (`deposit_paid` forcé à la main par l'admin) ; Stripe prod non re-testé (Phase 10) ; la spec précise qu'il y a un prescripteur + artisan + plateforme (`application_fee_amount`) | « prélevée à la source » | **Moyenne** : dépend de 05.22 et de Phase 10 ; répartition partenaire / plateforme à l'intérieur des 8 % toujours non tranchée (CONTEXT 05.21) |

## 🧾 3. À trancher par le client avant toute planification
1. **Commission : 8 % fixe ou 8 % / 6 % par tranche ?** (le client a déjà validé la tranche le 2026-10-30 ; la nouvelle note la remet en cause sans le dire). Et que devient le palier de P22 ?
2. **Grille d'abonnement** : paliers Classic / Flux Max / Élite **à la place** du dégressif par zone, ou **en plus** ? Que contient « Flux Max » ?
3. **PPL** : définition de « lead non absorbé » (délai, nombre de pros) ; prix unique ou selon le métier ; compatibilité avec l'exclusivité métier (P7) ; ticket à l'acte 79 € de P20 : remplacé par 45 € ?
4. **Diagnostiqueur** : acheteur (25 €) ou apporteur payé (15-20 €, P19) ?
5. **Courtage 5 %** : cadre réglementaire et contrat avec le courtier ; ne pas passer par Stripe Connect.
6. **Consentements par destinataire** : sans eux, aucune revente de leads (cf. note du tunnel, §3.3).

## 🧭 4. Quand (recommandation)
- **Rien à coder maintenant** : c'est une décision de modèle économique, pas une fonctionnalité prête. Elle ne change aucun invariant tant que le client n'a pas répondu aux six points.
- **Si le client confirme 8 % fixe** : à traiter avant la bascule prod, car `computeCommission` et le gabarit de convention (05.21) sont déjà livrés en dev. Plan court : modifier la fonction + tests + nouvelle version de gabarit, sans migration. Je ne le fais pas sans réponse.
- **Grille d'abonnement et PPL** : rattachés à **P7 / P20** (déjà au backlog), après la Phase 10 (Stripe prod) et un pilote 78 avec des abonnés réels. Pas avant : sans clients payants, les prix ne sont pas testés.
- **Courtage** : avec **P6**, après avis juridique.
- **Stripe Connect** : Phase 05.22, inchangée.

## 📎 Annexe — Texte reçu (verbatim)

Composition du Modèle Hybride & Hypothèses de Flux
Le modèle hybride de Bâti-Axe repose sur 3 piliers complémentaires pour maximiser l'ARPU (Revenu Moyen par Utilisateur) et réduire le délai de cash-in :

**Abonnements SaaS Récurrents (Cash Prévisible) :**
- Artisans : Offres Zone Classic (149 €/mois), Flux Max (249 €/mois), Pack élite (449 €/mois) (avec accès exclusif au flux B2B / Copropriétés / Syndics)

**Bourse aux Leads à l'Unité / PPL (Cash Immédiat) :**
Revente multi-métiers de chaque simulation :
- Lead Agent Immo (Mandat Vente) : 120 €
- Lead Artisan (Projet Travaux) : 45 €
- Lead Diagnostiqueur (Audit / DPE) : 25 €
- Lead Courtier (Financement) : 30 €

Règle : Les leads non absorbés par le réseau SaaS sont vendus à l'unité. Un même formulaire génère jusqu'à 220 € de valeur cumulée.

**Commissions & Apports d'Affaires B2B (Marge à forte valeur) :**
- Commission Intermédiation Tripartite : Fixée à 8 % quel que soit le montant du chantier (prélevée à la source via Stripe Connect).
- Courtage de financement : 5 % sur le montant du prêt travaux débloqué.
- Marketplace Tripartite (Split Payment Stripe Connect) : Commission d'intermédiation B2B prélevée à la source lors du versement de l'acompte.
