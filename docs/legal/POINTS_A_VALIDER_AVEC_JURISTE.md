# Points à valider avec un juriste / avocat — BÂTI-AXE

> **Statut : liste de travail, établie le 2026-11-08** à partir du code (phase 05.21), des gabarits (`server/utils/contracts.ts`, `docs/legal/`), des notes client (`.planning/notes/`) et des échanges avec Mike.
> Je ne suis pas juriste : chaque point ci-dessous est une **question à poser**, pas une conclusion. Quand je doute, c'est écrit.
> Les gabarits de contrat portent déjà la mention « à faire relire par un avocat avant mise en prod ». **Cette relecture est bloquante pour la bascule prod chez le client, pas pour le dev.**

## Comment utiliser ce document
Chaque point donne : le **constat** (ce que fait le produit aujourd'hui), la **question** à poser, et la **priorité** (A = peut bloquer le modèle, B = à fixer avant la prod, C = confort).
Un point sans réponse du juriste reste ouvert : ne rien déclarer « conforme » dans le produit tant qu'il n'est pas levé.

---

## 1. Rétro-commission versée au partenaire prescripteur (priorité A)

**Constat.** Le modèle : le client final paie l'artisan, l'artisan nous doit une commission d'apport d'affaires, nous reversons une quote-part (rétro-commission) au partenaire qui a apporté le dossier. Les partenaires sont des syndics, agences immobilières, architectes, experts, courtiers. La convention partenaire prévoit une « quote-part de la commission » dont « les modalités sont fixées par avenant ou conditions particulières » : **le pourcentage n'est pas fixé** (colonne `partner_share_bps` prévue, non renseignée). Le client a évoqué un partage 5 % / 3 %, non confirmé.

**Questions.**
1. Un syndic de copropriété peut-il légalement percevoir une rémunération d'un prestataire qu'il a désigné pour sa copropriété ? Sous quelles conditions (information du conseil syndical, mise en concurrence, accord de l'assemblée générale, mention au contrat de syndic) ?
2. Même question pour un agent immobilier (loi Hoguet n° 70-9 du 2 janvier 1970 et son décret d'application), un architecte inscrit à l'Ordre (art. 27 du Code de déontologie : la rémunération versée par un entrepreneur est-elle autorisée ou interdite ?), un expert, un courtier.
3. L'information du client final que la convention impose aujourd'hui (« clause CLIENT_INFO ») suffit-elle ? Doit-elle être écrite, chiffrée, antérieure au choix de l'artisan ? À quel moment et sous quelle forme (devis, mandat, lettre) ?
4. La rétro-commission est-elle requalifiable en pratique commerciale trompeuse par omission vis-à-vis d'un particulier (consommateur) ?

**Précision de Mike (2026-11-08).** BÂTI-AXE ne traite pas avec le client final : le partenaire est un apporteur d'affaires qui a seul la relation avec lui (sauf s'il est lui-même le donneur d'ordres). L'information ne peut donc pas venir de nous directement. Pistes à faire valider :
- (a) **CGU** de BÂTI-AXE et **conventions / avenants** : mention de la rémunération (déjà présente dans les trois gabarits ; absente des CGU, qui sont encore fictives) ;
- (b) **attestation du partenaire** cochée au dépôt du devis (« j'ai informé mon client de l'existence d'une rémunération d'apport d'affaires »), horodatée ;
- (c) **page publique** « Comment BÂTI-AXE est rémunéré », que le partenaire peut montrer à son client ;
- (d) distinguer le partenaire qui agit **pour son compte** (pas de client final à informer) de celui qui agit **pour un tiers** (obligation à sa charge), en le demandant dans le formulaire du dossier.
**Thèse de Mike à faire valider :** le client final reçoit le devis détaillé de l'artisan avant de signer ; c'est au partenaire de justifier le prix, il est responsable de ce qu'il fait signer. Réserve de l'advisor : le devis montre un prix, pas le conflit d'intérêts (rémunération du partenaire par l'artisan) ; le prix correct n'efface pas une omission de cette rémunération. Piste complémentaire : **clause de garantie** par laquelle le partenaire nous indemnise si son client le met en cause (et nous avec lui). La thèse est la plus solide quand le partenaire agit pour son propre compte ou que le client final est un professionnel.
Question au juriste : ces mécanismes (a) à (d) suffisent-ils, ou l'information doit-elle figurer dans un document remis au client final (devis de l'artisan, mandat du partenaire) ? L'obligation pèse-t-elle sur le partenaire, sur l'artisan, sur nous ?

**Pourquoi A.** Si la réponse est « interdit pour une catégorie de partenaires », le modèle économique change pour cette catégorie. Mieux vaut le savoir avant de développer le versement.

## 2. Stipulation pour autrui et non-contournement (priorité B)

**Constat.** L'avenant par lot contient une clause de non-contournement de 24 mois au profit de BÂTI-AXE et, par stipulation pour autrui (art. 1205 C. civ.), du partenaire non signataire. L'ensemble convention pro + convention partenaire + avenant est présenté comme « indivisible ».

**Questions.**
1. La rédaction retenue est-elle valable et opposable au partenaire qui n'a pas signé l'avenant ?
2. Une durée de 24 mois et un périmètre « tout chantier issu d'une mise en relation » sont-ils proportionnés (risque de nullité pour restriction excessive) ?
3. L'« ensemble indivisible » tient-il si l'une des trois conventions est annulée ou résiliée ?

## 3. Clause pénale (priorité B)

**Constat.** Pénalité de 5 000 € HT par chantier dissimulé, sans préjudice de la commission due, plus exclusion du réseau. Le gabarit cite l'art. 1231-5 du Code civil (modération par le juge).

**Questions.** Le montant forfaitaire est-il défendable ? Le cumul pénalité + commission est-il admis ? Faut-il un barème proportionnel au montant du chantier plutôt qu'un forfait ? L'exclusion du réseau est-elle exécutable sans mise en demeure préalable ?

## 4. Commission : assiette, exigibilité, annulation (priorité B)

**Constat.**
- Taux : 8 % HT jusqu'à 200 000 € HT, 6 % au-delà, **par tranche** (250 000 € → 19 000,00 € HT). Le client a évoqué « 8 % fixe » : non tranché.
- Mécanisme décidé le 2026-11-08 (voir `.planning/notes/20261108-REFONTE_CHOIX_PARTENAIRE_DEVIS-SPEC.md`) : l'assiette est le **montant HT total du devis signé par le client final**, déposé par le partenaire et confirmé par l'artisan. La commission est annulable manuellement par l'admin dans des cas précis.
- Les gabarits actuels disent « exigible à la signature du devis par le client final et au versement du premier acompte ».

**Questions.**
1. L'assiette « devis signé » est-elle valable si le devis évolue (avenants de travaux, révision de prix, travaux supplémentaires) ? Quelle clause d'ajustement ?
2. Quels cas d'annulation sont acceptables pour nous et opposables à l'artisan (chantier jamais démarré, devis résilié par le client, rétractation) ? Qui supporte le risque si le client se rétracte (délai de rétractation applicable aux contrats hors établissement conclus avec un particulier) ?
3. Un artisan peut-il se voir imputer la commission si le chantier est réalisé mais le devis a été remplacé par un autre document ?
4. Mention TVA et nature de la prestation (apport d'affaires) : confirmer avec l'expert-comptable.

## 5. Preuve du montant : double déclaration (priorité B)

**Constat.** Nouveau flux : le **partenaire** saisit le montant HT total et dépose le PDF du devis signé ; l'**artisan** confirme en un clic (ou conteste). Silence de l'artisan : règle à définir (acceptation tacite après X jours ?).

**Questions.**
1. Une acceptation tacite par silence d'un professionnel est-elle opposable ? Quelle formulation, quel délai, quelle preuve d'envoi (e-mail horodaté) ?
2. Valeur probante du PDF déposé (le devis peut être falsifié) : quels éléments exiger (signature électronique du client, mentions obligatoires) ? Droit d'audit contractuel sur les pièces ?
3. En cas de contestation artisan/partenaire, qui tranche et selon quelle procédure ? (aujourd'hui : l'admin BÂTI-AXE, sans clause d'arbitrage.)

## 6. Signature électronique simple par code e-mail (priorité B)

**Constat.** Signature = code à 6 chiffres envoyé par e-mail (valable 10 minutes), HTML du contrat figé, empreinte SHA-256, horodatage, adresse IP, navigateur, journal d'audit. Ce n'est ni une signature avancée ni qualifiée (eIDAS). Évolution possible vers un prestataire (Yousign).

**Questions.** Cette signature suffit-elle à prouver l'engagement d'un artisan (professionnel) dans un litige sur la commission ? Faut-il une convention de preuve explicite (art. 1368 C. civ.) dans la convention cadre ? Le niveau « simple » est-il acceptable pour une clause pénale de 5 000 € ?

## 7. Flux d'argent, statut de la plateforme et Stripe Connect (priorité A avant la phase 05.22)

**Constat.** Aujourd'hui, aucun argent ne transite par BÂTI-AXE : facturation manuelle. Le client souhaite à terme un split Stripe Connect avec commission prélevée à la source à l'acompte. Voir `.planning/notes/20261106-CONTRAT_TRIPARTITE_STRIPE_CONNECT-SPEC_CLIENT.md`.

**Questions.**
1. Quel statut réglementaire si les fonds passent par un compte plateforme avant ventilation (agrément ACPR, statut d'agent de prestataire de services de paiement, cantonnement) ? *Je ne suis pas sûr de la réponse ; à ne pas considérer acquis.*
2. Un paiement échelonné de la commission par l'artisan (prélèvement SEPA) : quel mandat, quelles mentions, quelle sanction d'impayé (suspension de l'accès) ?
3. Un compte connecté (KYC) est-il obligatoire pour chaque partenaire rémunéré ?

## 8. Facturation et autofacturation (priorité B)

**Constat.** Prévu : facture de commission BÂTI-AXE → artisan ; rétro-commission BÂTI-AXE → partenaire. Pour la seconde, deux montages : le partenaire nous facture, ou nous établissons la facture à son nom (**autofacturation**).

**Questions.** Mentions obligatoires, mandat de facturation écrit, numérotation, TVA applicable selon le statut du partenaire (assujetti ou non), conservation. À valider avec l'expert-comptable autant qu'avec le juriste. Le partenaire qui n'est pas assujetti à la TVA (syndic bénévole, association) change-t-il le montage ?

## 9. Courtage en crédit (priorité A si maintenu)

**Constat.** Le client veut une rémunération de 5 % du prêt travaux débloqué et un lead « courtier ». Aucune ligne de code à ce jour.

**Questions.** L'intermédiation en crédit est réglementée (immatriculation ORIAS, statut d'IOBSP, rémunération d'apporteur). Qui doit être immatriculé : BÂTI-AXE, le courtier partenaire, les deux ? Un apporteur d'affaires sans immatriculation est-il possible ? *Je ne suis pas sûr de la réponse.*

## 10. Revente de leads et consentements RGPD (priorité A avant la phase 13)

**Constat.** Le client veut revendre à l'unité les contacts issus du simulateur (artisan, agent immobilier, diagnostiqueur, courtier), à des tarifs de 25 à 120 €. Voir `.planning/notes/20261106-LEAD_TUNNEL_VENTE_DIAG_COURTIER-SPEC_CLIENT.md`. Le registre RGPD existe (`docs/legal/REGISTRE_RGPD.md`, ADR-007).

**Questions.** Consentement explicite et distinct par catégorie de destinataire, avec identification du destinataire ; durée de validité ; preuve ; droit de retrait ; base légale de la revente ; information préalable sur le prix (rémunération pour le transfert). Un formulaire à deux cases suffit-il ? (Je pense que non.) Statut de responsable de traitement conjoint avec chaque acheteur de leads.

## 11. Masquage des coordonnées et données personnelles (priorité B)

**Constat.** Les coordonnées du partenaire (nom, téléphone, e-mail) ne sont révélées au pro qu'après signature de l'avenant (ADR-004). Les pages partenaire sont des liens à jeton, sans compte. Les preuves de signature stockent adresse IP et navigateur.

**Questions.** Durée de conservation des preuves (IP, user-agent, contrat signé) ; information des signataires sur ce traitement ; base légale ; mentions dans la politique de confidentialité ; transfert de données du client final (devis PDF déposé par le partenaire : nom, adresse du client final) : qui est responsable de traitement, quelle mention d'information ?

## 12. Place de marché : CGU, mentions, responsabilités (priorité B)

**Constat.** Les pages légales (CGU, confidentialité, mentions légales) existent mais avec **contenu fictif** (SAS fictive, RCS fictif, adresse fictive). Autres points listés au ROADMAP : statut éditeur/hébergeur (LCEN), portée du badge « vérifié » (décennale, SIRET, URSSAF, RGE), modération des avis, assurance RC de BÂTI-AXE.

**Questions.** Rédaction réelle des CGU/CGV, qualification (intermédiaire, courtier, apporteur d'affaires, plateforme au sens de l'art. L. 111-7 du Code de la consommation), responsabilité en cas de défaillance d'un artisan présenté, mentions obligatoires de l'éditeur.

## 13. Contrats B2C : exclusivité géographique (priorité C tant que le B2C n'est pas facturé)

**Constat.** `docs/legal/CHARTE_EXCLUSIVITE_B2C.md` prévoit un artisan unique par métier et par zone, avec clause de palier de volume et engagement de 12 mois.

**Questions.** Validité de l'exclusivité de zone (droit de la concurrence), clause de basculement automatique de palier, reconduction tacite et information du consommateur/professionnel.

## 14. Sous-traitance : vigilance et pièces obligatoires (priorité C)

**Constat.** Le verrou sous-traitance exige Kbis de moins de 3 mois, décennale, URSSAF (attestation de vigilance), RGE le cas échéant (phase 05.11-05). Re-contrôle tous les 6 mois.

**Questions.** Les pièces et périodicités correspondent-elles aux obligations de vigilance du donneur d'ordre (art. L. 8222-1 du Code du travail) ? BÂTI-AXE est-elle donneur d'ordre ou simple intermédiaire ? Le badge « éligible sous-traitance » engage-t-il sa responsabilité ?

## 15. Écarts entre les gabarits v1 signés et le flux 05.23 (priorité A avant la bascule prod)

**Constat.** Le flux livré en phase 05.23 diffère des gabarits v1 (`server/utils/contracts.ts`, non modifiés). Les engagements déjà signés gardent leur version v1.

- **Avenant art. 5 et convention pro art. 3 (« Déclaration loyale »)** : l'Entreprise « déclare » le montant du devis. Désormais le Partenaire dépose le devis signé et l'Entreprise le confirme ou le conteste (l'interface dit « En confirmant, vous déclarez le montant HT du devis signé (article 5 de votre avenant) »).
- **Convention partenaire art. 3** : le Partenaire « confirme loyalement le montant ». Désormais il le dépose avec une attestation d'information de son client, horodatée.
- **Convention pro art. 2 (exigibilité)** : commission exigible « à la signature du devis … et au versement du premier acompte ». Le flux 05.23 applique un échéancier (D-06 bis) : jusqu'à 200 000 € HT, 50 % à l'acompte puis 50 % à la fin ; au-delà, 30 % / 40 % / 30 %. Chaque versement devient exigible par la validation d'avancement du partenaire. La rétro-commission n'est versée qu'en fin de chantier (D-26). À aligner dans le gabarit v2.
- **Convention partenaire art. 2** : quote-part « fixée par avenant ou conditions particulières ». Le flux applique 3 % fixe du montant HT (D-05) sans document signé le précisant : rédiger les conditions particulières.
- **Annulation de commission (D-10)** et **silence de l'artisan** (blocage, relance, arbitrage admin, jamais d'acceptation tacite) : absents des gabarits v1.
- **D-26, rétro-commission** : exigible seulement en fin de chantier (dernière étape validée par le partenaire ET commission intégralement encaissée), sans avance. L'exigibilité doit figurer dans la convention partenaire v2.
- **D-06 bis / D-17, avenant de travaux** : un avenant de travaux qui fait passer l'assiette au-dessus de 200 000 € HT change l'échéancier (2 → 3 versements de la commission). Les montants déjà facturés sont conservés et le reste est rééchelonné : à prévoir dans l'avenant v2.
- **Page partenaire à jeton** : elle affiche la convention partenaire v1 signée, dont la clause « quote-part de la commission perçue par BÂTI-AXE ». La part n'est pas chiffrée dans l'interface (D-22), mais le principe est visible dans le document signé.

**Questions.** Les gabarits v1 restent-ils opposables pour les engagements déjà signés ? Quelle formulation pour la v2 (déclaration vs confirmation, exigibilité par étapes, rétro-commission, conditions particulières) ?

---

## Ce qui a été fait côté produit en attendant (à relire, pas à valider)
- Convention cadre pro, convention cadre partenaire, avenant par lot : gabarits versionnés (`CC-PRO-2026-10-v1`, `CC-PART-2026-10-v1`, `AV-LOT-2026-10-v1`), HTML figé + SHA-256.
- Clause d'information du client final (art. 27 Code de déontologie architectes, loi Hoguet) : présente dans les trois gabarits.
- Non-contournement 24 mois, pénalité 5 000 € HT, juridiction du siège de BÂTI-AXE, droit français.
- Phase 05.23 : choix de l'artisan par le partenaire, dépôt du devis signé (PDF R2 + montant HT + attestation horodatée), confirmation ou contestation par l'artisan, espace admin Commissions en cours (journal en ajout seul, annulation motivée tracée).
- **Les gabarits devront être republiés en version 2** quand le nouveau mécanisme (choix du partenaire, devis déposé par le partenaire, confirmation de l'artisan) sera livré : les clauses « déclaration loyale » et « exigibilité » décrivent l'ancien flux.

## Documents à remettre au juriste
1. Ce document.
2. Les trois gabarits (`server/utils/contracts.ts`, rendu HTML).
3. `docs/legal/CONTRAT_APPORT_AFFAIRES_B2B.md`, `docs/legal/CHARTE_EXCLUSIVITE_B2C.md`, `docs/legal/REGISTRE_RGPD.md`.
4. Les notes client du 2026-11-06 (modèle hybride, contrat tripartite Stripe Connect, tunnel de leads).
5. `.planning/notes/20261108-REFONTE_CHOIX_PARTENAIRE_DEVIS-SPEC.md` (nouveau mécanisme).
