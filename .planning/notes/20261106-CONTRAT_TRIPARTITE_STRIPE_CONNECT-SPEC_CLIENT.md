# 📄 Note — Contrat tripartite prescripteur + stack de paiement Stripe Connect

> **Statut : NOTE.** Rangée le 2026-11-06. La partie « contrat tripartite » est **déjà livrée en dev par la Phase 05.21** ; la partie « Stripe Connect » est la **Phase 05.22**, non commencée et volontairement reportée. Aucun code écrit.
> Voisines : `20261106-MODELE_HYBRIDE_REVENUS-SPEC_CLIENT.md`, `clients/20260828-CONVENTION_TRIPARTITE_BLINDAGE_JURIDIQUE-SPEC_CLIENT.md`, `clients/20260828-STRIPE_CONNECT_SPLIT_PAYMENT-SPEC_CLIENT.md`.

## 🎯 1. Ce que dit le texte (résumé)
- **Contrat tripartite** plateforme / prescripteur / artisan : commission due à la signature du devis et au premier acompte ; **8 % HT = 5 % plateforme + 3 % prescripteur** ; non-contournement 12 à 24 mois avec pénalité forfaitaire (ex. 5 000 €) ; information du client final (architectes, syndics) ; prélèvement à la source via un PSP ; CGU valant contrat-cadre ; avenant automatique par affaire ; double validation par l'artisan.
- **Stack de paiement** : Stripe Connect (Custom/Express), acompte payé par le client final sur une page Stripe Hosted, ventilation artisan / prescripteur / plateforme, table de comptes Stripe, autofacturation (facture d'apport d'affaires au nom du prescripteur, Factur-X / Pennylane), user story d'onboarding KYC.

## ✅ 2. Ce qui existe déjà (Phase 05.21, commits sur `dev`, recette de Mike en attente)
| Demande | Existant |
|---|---|
| Convention cadre signée par les deux parties | `b2b_engagements` types `framework_pro` / `framework_partner` : signature OTP e-mail + HTML figé + SHA-256 + horodatage + IP/UA |
| Avenant par affaire, double validation | type `lot_amendment`, généré au clic « Se positionner » ; le partenaire confirme le devis déclaré par le pro (`quote_confirmed`) |
| Non-contournement, pénalité, information du client final | clauses du gabarit versionné (24 mois) ; **rédaction juridique à faire relire par un avocat avant la prod** |
| Commission calculée | `computeCommission` (8 % jusqu'à 200 k€, 6 % au-delà, par tranche) ; colonne `partner_share_bps` **déjà prévue mais non renseignée** |
| Suivi signé → devis → acompte → facturé, relances J+30/J+60 | en place ; `deposit_paid` forcé à la main par l'admin (D-07) |

→ **Il ne faut pas refaire un contrat tripartite** : le texte décrit ce que 05.21 a déjà construit. Seul apport nouveau : **la répartition 5 % / 3 %** (voir §3.1).

## ⚠️ 3. Points qui bloquent ou contredisent
1. **Répartition 5 / 3** : elle tranche la question laissée ouverte par 05.21 (« répartition partenaire / plateforme à l'intérieur des 8 % »), mais pas complètement. Si la commission reste **par tranche (8 % puis 6 %)**, la part du prescripteur est-elle 3 % fixe du montant, ou 3/8 de la commission ? Les deux donnent des montants différents au-delà de 200 k€. Dépend aussi de la réponse « 8 % fixe ou par tranche » (note hybride §3.1).
2. **Recadrage « facturation manuelle d'abord »** : la Phase 05.22 est notée « à lancer après les premiers chantiers facturés à la main », et le recadrage PM de la spec modèle économique (§2) va dans le même sens. Le texte reçu demande l'inverse (automatiser maintenant). Le client doit confirmer qu'il lève ce recadrage.
3. **Pas de compte partenaire** : 05.21 et la Phase 9 fonctionnent volontairement sans compte partenaire (pages à jeton). Stripe Connect exige un compte connecté et une vérification d'identité (KYC) pour chaque prescripteur payé. C'est un changement de produit (compte, onboarding, tableau de bord), pas un détail.
4. **Aucun Stripe Connect dans le code** (aucun `transfer_data`, `application_fee_amount`, compte connecté). Stripe prod n'est pas re-testé (Phase 10) et la prod chez le client n'est pas déployée. Le premier pas serait d'activer Connect sur le compte Stripe en mode test : à confirmer avec le client.
5. **« Bati-Axe ne touche pas l'argent du chantier / pas d'agrément ACPR »** : à ne pas prendre pour acquis. Avec une charge « destination », les fonds passent par la plateforme avant ventilation ; le cadre réglementaire (statut, cantonnement) dépend du type de compte et de la structure. *À valider par le conseil juridique du client ; je n'en suis pas sûr à 100 %.*
6. **Autofacturation** : établir des factures au nom du prescripteur suppose un mandat de facturation écrit et des mentions précises ; à valider avec l'expert-comptable. Rien dans le texte n'est dimensionné.
7. **Acompte** : pourcentage inconnu, et payeur ambigu (le texte dit le client final ; 05.21 suit des partenaires donneurs d'ordres). Questions déjà posées dans `V1-EXECUTION-PLAN.md` (page d'acompte), restées sans réponse.
8. **Erreurs du code fourni** (à ne pas copier) : Next.js / `require` au lieu de Nuxt-Nitro ; table `REFERENCES profiles(id)` alors que le projet utilise `professionals` ; `sepa_credit_transfer` n'est pas un moyen de paiement valide pour un PaymentIntent (SEPA = prélèvement) ; montants en `Math.round(total * 0.05)` sur des flottants (le projet calcule en centimes entiers) ; commission prescripteur retenue dans `application_fee_amount` puis « transférée plus tard » sans traitement d'échec ni idempotence ; aucune vérification de webhook ni de rattachement à l'engagement signé.

## 🧭 4. Quand
- **Contrat tripartite : rien à faire**, sauf la **relecture avocat** du gabarit (bloquante pour la bascule prod, pas pour le dev) et la **recette de Mike** qui clôt 05.21.
- **Stripe Connect (05.22) : pas maintenant.** Conditions pour la lancer :
  1. 05.21 close (recette) ;
  2. client : 8 % fixe ou par tranche, partage du prescripteur (3 % fixe ?), acompte (% et payeur) ;
  3. client : levée du recadrage « manuel d'abord », ou premiers chantiers déjà facturés à la main ;
  4. avis juridique (statut de la plateforme, autofacturation) ;
  5. Connect activé sur le compte Stripe (mode test d'abord) ; Phase 10 pour Stripe prod ;
  6. décision produit : compte partenaire/prescripteur avec onboarding KYC.
- **Si le client veut avancer quand même** : on peut écrire le **plan** de 05.22 en mode test dès que les points 2, 3 et 6 sont tranchés (`/gsd-discuss-phase 05.22`), sans coder. Premier plan raisonnable : comptes connectés artisans seulement + paiement de l'acompte avec `application_fee_amount`, **le versement au prescripteur restant manuel** (comme le recadrage PM le prévoit).

## 📎 Annexe — Texte reçu (résumé fidèle des éléments décisionnels)
Voir le texte complet dans la conversation d'origine ; éléments conservés ici : répartition type « commission totale prélevée sur l'artisan 8 % HT ; rétrocession prescripteur 3 % HT ; marge Bâti-Axe 5 % HT » ; exemple chiffré acompte 10 000 € HT → artisan 9 200 €, plateforme 500 €, prescripteur 300 € (note : 9 200 + 500 + 300 = 10 000 €, soit 8 % prélevés) ; non-contournement 12 à 24 mois, pénalité 5 000 € par chantier dissimulé ; user stories « Contrat Tripartite & Split Payment » et « Onboarding Financier Stripe Connect ».
