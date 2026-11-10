# Note — Refonte du mécanisme B2B après l'avenant : choix du partenaire, devis déposé par le partenaire, espace commissions

> **Statut : SPEC DE TRAVAIL, non planifiée au ROADMAP, aucune ligne de code écrite.** Décidée avec Mike le 2026-11-08 à l'issue de la recette de 05.21. Le client n'a pas encore validé ce modèle.
> Remplace le flux « le pro déclare son devis, le partenaire confirme » de 05.21 (plans 05.21-05/06/07).

## 1. Pourquoi changer
Pendant la recette, Mike a vu que le flux actuel demande à l'artisan de déclarer un devis, alors que :
- l'artisan a son propre process commercial (visite, devis, discussions par téléphone) : la plateforme ne peut pas le remplacer ;
- l'artisan a **intérêt à sous-déclarer** le montant dont dépend notre commission ;
- le partenaire, qui touche une rétro-commission, a au contraire **intérêt à ce que le montant soit exact** ; il ne peut pas gonfler un devis que son client final signe et paie.

## 2. Flux cible (décisions de Mike)

| # | Étape | Acteur | Où |
|---|---|---|---|
| 1 | Convention cadre signée (existe) | pro, partenaire | plateforme |
| 2 | « Je suis intéressé » → avenant par lot signé par code e-mail (existe) | pro | plateforme |
| 3 | **Le partenaire voit les artisans intéressés** et **choisit** l'artisan du lot | partenaire | plateforme (lien à jeton) |
| 4 | Le pro choisi : lot **« retenu »** ; les autres : lot **« non obtenu »** | système | plateforme |
| 5 | Devis, discussions, visite | pro, partenaire, client final | **hors plateforme** (téléphone) |
| 6 | Le client final signe le **devis** de l'artisan | client final | hors plateforme |
| 7 | **Le partenaire dépose le PDF du devis signé et saisit le montant HT total** | partenaire | plateforme |
| 8 | **L'artisan confirme le montant en un clic** (ou conteste) | pro | plateforme |
| 9 | La commission est calculée (`computeCommission`, 8 % puis 6 % par tranche) et apparaît dans l'**espace admin Commissions en cours** | système | admin |
| 10 | Facture de commission au pro ; rétro-commission au partenaire | admin / système | voir §6 |

Vocabulaire : on parle de **devis** (accepté, signé), jamais de « facture » : une facture suppose la prestation terminée. La base de commission est le **montant HT total du devis signé** ; le nombre de versements du client n'a pas d'importance pour nous.

Pourquoi c'est le partenaire qui dépose : il veut sa part de la commission, il ne va donc pas dans le sens de l'artisan. L'artisan ne saisit plus aucun montant.

## 3. Points de conception à trancher

1. **Si le pro ne confirme pas** : délai (7 jours ?) puis acceptation tacite, ou blocage jusqu'à intervention de l'admin ? Dépend du juriste (voir `docs/legal/POINTS_A_VALIDER_AVEC_JURISTE.md` §5).
2. **Contestation par le pro** : statut `contested`, notification admin, l'admin arbitre (pièce PDF à l'appui). Aucun calcul de commission tant que c'est contesté.
3. **Évolution du devis** (avenant de travaux) : nouveau dépôt ; l'assiette est la somme des montants HT confirmés, plafonnée par règle à définir.
4. **Partenaire qui ne choisit pas** : relance J+7, J+14 ; expiration du lot après X jours ; cas « retenu hors plateforme » (le partenaire a choisi quelqu'un d'autre : le lot passe en « non obtenu » pour tous).
5. **Un seul artisan retenu par lot.** Plusieurs artisans intéressés → le partenaire voit leurs fiches (raison sociale, métier, certifications, zone) avant de choisir. Quelles coordonnées de chaque artisan sont visibles au partenaire avant choix : à décider (ADR-004 côté artisan inchangé).
6. **Stockage du PDF** : sur Cloudflare R2 via URL pré-signée générée par Nitro (invariant ADR-003), jamais dans la base. Accès : admin, pro retenu, partenaire déposant.
7. **Information du client final sur la rétro-commission** : nous ne traitons pas avec lui, l'obligation passe par le partenaire. Au dépôt du devis, case d'**attestation** obligatoire (« j'ai informé mon client de la rémunération d'apport d'affaires »), horodatée et conservée ; page publique « Comment BÂTI-AXE est rémunéré » ; champ « pour le compte de » (soi-même / un tiers) dans le formulaire du dossier ; mention dans les CGU. À valider par le juriste (`docs/legal/POINTS_A_VALIDER_AVEC_JURISTE.md` §1).
8. **Le PDF contient des données du client final** (nom, adresse) : à encadrer RGPD (juriste §11).

## 4. Annulation de commission (cas manuel, admin)

Annulation **manuelle uniquement**, dans des cas précis, par un admin, avec **motif obligatoire** et trace dans `audit_logs` (même logique que la dérogation D-07 de 05.21). Cas à lister avec Mike et le juriste, par exemple :
- chantier jamais démarré ou devis résilié par le client final avant le début des travaux ;
- rétractation du client final dans le délai légal ;
- erreur de saisie du partenaire (montant ou document faux) corrigée ;
- litige résolu en faveur de l'artisan ;
- geste commercial décidé par BÂTI-AXE.

Règles :
- une annulation ne supprime rien : le dossier passe en `commission_cancelled`, les montants et le motif restent consultables ;
- si une partie a déjà été encaissée, l'annulation génère un mouvement de **remboursement à traiter** (jamais automatique) ;
- la rétro-commission du partenaire est annulée ou ajustée dans le même geste, avec avertissement si elle a déjà été versée.

## 5. Espace admin « Commissions en cours »

Nouvel onglet (ou sous-onglet de « Dossiers B2B »). Une ligne par engagement dont le devis est confirmé.

**Colonnes** : référence dossier/lot, partenaire, artisan, montant HT confirmé, commission BÂTI-AXE, part partenaire (rétro-commission), statut, prochaine échéance, solde restant, lien vers le devis PDF et l'avenant signé.

**Statuts de commission** (proposition) : `à facturer` → `facturée` → `partiellement encaissée` → `encaissée` ; branches `contestée` et `annulée`. Rétro-commission : `à verser` → `versée`.

**Mouvements d'argent** (journal par dossier, jamais modifié, seulement complété) : date, type (`commission_facturée`, `encaissement`, `remboursement`, `rétro_commission_versée`, `annulation`), montant en centimes, acteur, note. Le solde se calcule à partir du journal.

**Actions admin** : marquer une facture émise, enregistrer un encaissement (manuel au début), enregistrer un versement partenaire, annuler (§4), exporter en CSV pour l'expert-comptable.

Vue de synthèse en tête : total à encaisser, total encaissé, total de rétro-commissions dues, nombre de dossiers contestés, dossiers sans devis après X jours.

## 6. Facturation et paiement (reporté)

- **Facture de commission** BÂTI-AXE → artisan : simple, nous sommes créancier.
- **Rétro-commission** → partenaire : facture du partenaire à BÂTI-AXE, ou autofacturation avec mandat. À valider avec l'expert-comptable (juriste §8).
- **Échelonnement du paiement de la commission** par l'artisan : **reporté** (décision de Mike). Il suppose un mandat SEPA, un plafond de durée et une sanction d'impayé, et dépend de la phase 05.22 (Stripe).
- Au début, tout est manuel : l'admin enregistre les mouvements dans l'espace Commissions.

## 7. Impact sur l'existant (05.21)

| Élément | Impact |
|---|---|
| `b2b_engagements.status` (`signed`, `not_awarded`, `quote_declared`, `quote_confirmed`, `deposit_paid`, `invoiced`) | Nouveaux statuts : `selected` (retenu), `quote_submitted` (déposé par le partenaire), `contested`, `commission_cancelled`. Le garde de transition SQL (`b2b_engagement_status_rank`) est à revoir. |
| `declare-quote.post.ts` (pro) | Remplacé : le pro ne déclare plus, il **confirme** (`confirm-quote`) |
| `confirm-quote.post.ts` (token partenaire) | Remplacé par le **dépôt** du devis par le partenaire |
| Pages à jeton partenaire `/b2b/engagement/[token]` | Ajout : liste des artisans intéressés + choix ; dépôt du devis |
| `computeCommission`, `commissionTiers` | Inchangés |
| `partner_share_bps` | À renseigner : la part du partenaire doit être fixée (client + juriste) |
| `deposit_paid`, `invoiced`, `Acompte versé` | À reclasser : remplacés par les mouvements d'argent du §5 |
| Gabarits de contrat (`contracts.ts`) | **Version 2** de la convention pro, de la convention partenaire et de l'avenant : clauses « déclaration loyale », « exigibilité » et « stipulation pour autrui » réécrites. Les engagements déjà signés gardent leur version. |
| Relances J+30 / J+60 (`engagement-reminders`) | À réécrire : relance partenaire (choix, dépôt du devis), relance pro (confirmation) |
| Migration | Nouvelles colonnes/tables : sélection, dépôt, journal des mouvements. **Base cloud partagée dev/prod : dry-run + accord explicite avant toute migration.** |

## 8. Étapes proposées

0. **Clôturer 05.21** : SUMMARY du plan 08, `STATE.md`, en notant que le flux de déclaration est remplacé par la présente note. *(en attente du GO de Mike)*
1. **Valider avec le client** : modèle « le partenaire dépose le devis, l'artisan confirme », commission due à la signature du devis, part du partenaire. Remettre `docs/legal/POINTS_A_VALIDER_AVEC_JURISTE.md` au juriste.
2. **Choix du partenaire** : statuts retenu / non obtenu, liste des artisans intéressés côté partenaire, notifications, relances, expiration.
3. **Dépôt du devis par le partenaire** (PDF sur R2 + montant HT) et **confirmation / contestation par l'artisan**.
4. **Espace admin Commissions en cours** : journal des mouvements, annulation manuelle motivée, export.
5. **Gabarits version 2** (après avis du juriste) et republication.
6. **Facturation** (commission artisan, rétro-commission partenaire) puis **échelonnement** (phase 05.22 / Stripe), seulement après les réponses du client et du juriste.

Les étapes 2 à 4 peuvent être planifiées en une phase (proposition : 05.23) sans attendre le juriste ; l'étape 5 est bloquée par lui, l'étape 6 par le client et le juriste.

## 9. Décisions de Mike (2026-11-09) et questions ouvertes

**Décidé :**
- **Part du partenaire : 3 % fixe du montant HT du devis**, prélevée sur les 8 % perçus par BÂTI-AXE (reste net 5 %). **3 % partout**, y compris au-delà de 200 000 € HT (confirmé 2026-11-10).
- **Acompte : 4 % du total du devis** (et non de l'acompte), demandé quand l'artisan perçoit l'acompte de 30 % ; le solde (4 % du total) complète les 8 % à la fin (confirmé 2026-11-10, pour éviter un calcul compliqué).
- **Contact de l'artisan** : son téléphone est révélé au partenaire après signature de l'avenant (confirmé 2026-11-10).
- **Ce que voit le partenaire avant de choisir** : la fiche/page publique de chaque artisan intéressé. La proposition chiffrée et les échanges se font hors plateforme (téléphone) et déterminent le choix.

**Piste sur l'acompte (non tranchée) :** prélever environ 4 % du **total du devis** quand l'artisan perçoit l'acompte de 30 %, car cela dépend de la pression de trésorerie du pro. *À clarifier : 4 % du total ou 4 % de l'acompte ? Risque : une règle variable au cas par cas est difficile à défendre et laisse le pro maître du déclencheur. Alternative proposée : choix unique à l'avenant entre « 4 % à l'acompte + solde » et « 8 % à la fin », déclencheur fixé par le devis déposé par le partenaire.*

**Encore ouvert :**
- 8 % fixe ou 8 % / 6 % par tranche (réponse du client attendue).
- Silence de l'artisan : acceptation tacite ou blocage ?
- Liste définitive des cas d'annulation autorisés (§4).
- Les autres questions du client restées sans réponse : grille d'abonnement, définition du PPL, conditions Stripe Connect, périmètre du tunnel de leads et consentements.
