# Page publique « Comment BÂTI-AXE est rémunéré » — brouillon pour relecture juridique

> **Statut : brouillon du 2026-11-14, non publié, aucune page créée dans l'application.** Le texte ci-dessous est une proposition à faire relire. Les passages entre crochets `[…]` sont des choix à trancher par le juriste ou par Mike. Rien de ce texte n'est une conclusion juridique.
> Contexte : point n° 1 de `POINTS_A_VALIDER_AVEC_JURISTE.md` (rétro-commission et information du client final), piste (c) : une page publique que le partenaire peut montrer à son client.

## 1. Rôle de la page

Le partenaire (syndic, agent immobilier, architecte, expert, courtier) est rémunéré par BÂTI-AXE quand un chantier est signé avec un artisan qu'il a retenu sur la plateforme. Le client final (copropriété, propriétaire, donneur d'ordres) ne traite pas avec BÂTI-AXE. Cette page sert à ce qu'il puisse connaître le mécanisme **avant** de signer le devis. Elle complète, sans les remplacer, l'attestation du partenaire et la clause d'information des conventions.

Où elle serait utilisée, une fois validée :
- lien affiché sur la page partenaire à jeton, à côté de la case d'attestation ;
- lien dans les CGU (article sur la rémunération, à rédiger) et dans le pied de page ;
- lien dans l'e-mail de choix de l'artisan envoyé au partenaire, pour qu'il puisse le transmettre à son client.

## 2. Faits du produit (vérifiés dans le code le 2026-11-14)

| Élément | Valeur actuelle | Source |
|---|---|---|
| Qui paie la commission | l'artisan retenu, à BÂTI-AXE | convention pro, avenant par lot |
| Base de calcul | montant HT total du devis signé ; les avenants de travaux confirmés s'ajoutent | `b2bCommissionPlan.ts` (D-17) |
| Taux | 8 % jusqu'à 200 000 € HT ; 6 % sur la part au-delà de 200 000 € HT | `commission.ts`, `commissionTiers.ts` |
| Taux : réserve | le client n'a pas encore tranché entre 8 % fixe et 8 % puis 6 % par tranche | `05.23-CONTEXT.md`, « Deferred » |
| Part reversée au partenaire | 3 % du montant HT du devis, prélevée sur la commission, y compris au-delà de 200 000 € | `PARTNER_SHARE_BPS = 300` (D-05) |
| Quand la commission est due | par versements validés par le partenaire : 50 % à l'acompte puis 50 % à la fin (jusqu'à 200 000 € HT) ; 30 % / 40 % / 30 % au-delà | `b2bCommissionRules.ts` (D-06 bis) |
| Quand le partenaire est payé | seulement en fin de chantier, une fois la commission intégralement encaissée | D-26 |
| Ce que voit le partenaire dans l'interface | jamais le montant de la commission ni sa part | D-22 |
| Attestation du partenaire au dépôt du devis | « J'atteste avoir informé mon client de la rémunération d'apport d'affaires perçue au titre de cette mise en relation. » Horodatée, avec IP et agent utilisateur | `QUOTE_ATTESTATION_TEXT`, `quote.post.ts` |
| Champ « pour le compte de » | « soi-même » ou « un tiers », obligatoire pour un projet immédiat | `partenaires.vue` (D-14) |

Point d'attention : la décision D-22 (le partenaire ne voit pas sa part dans l'interface) est **en tension** avec une page publique qui l'afficherait. Si la page chiffre les 3 %, il faudra décider si l'interface partenaire les affiche aussi. Question n° 3 ci-dessous.

## 3. Texte proposé de la page

**Titre :** Comment BÂTI-AXE est rémunéré

**Chapô :** BÂTI-AXE met en relation des porteurs de projets de bâtiment, via leurs prescripteurs (syndics, agents immobiliers, architectes, experts, courtiers), avec des artisans certifiés. Cette page explique, en toute transparence, qui rémunère qui.

**1. Qui nous rémunère ?**
BÂTI-AXE est rémunéré par l'**artisan** [retenu pour le chantier], sous la forme d'une commission d'apport d'affaires. [Le client final ne règle aucun frais à BÂTI-AXE au titre de cette mise en relation.] 
*(Réserve : voir question 5. L'artisan peut avoir intégré cette commission à son prix.)*

**2. Quand la commission est-elle due ?**
Uniquement si un devis est signé entre le client et l'artisan retenu. Aucune commission n'est due si le devis n'est pas signé. Elle est calculée sur le montant hors taxes du devis signé, y compris les avenants de travaux confirmés, [selon le barème : 8 % du montant HT jusqu'à 200 000 € HT, puis 6 % sur la part au-delà].

**3. Le prescripteur est-il rémunéré ?**
[Oui. Le prescripteur qui vous a présenté cette solution et qui a retenu l'artisan perçoit de BÂTI-AXE une part de cette commission [, égale à 3 % du montant HT du devis]. Cette part est versée par BÂTI-AXE, [en fin de chantier,] et non par vous.] 
[Variante sans chiffre : « perçoit une part de cette commission, dont le montant ne s'ajoute pas au prix de votre chantier ».] 
*(Réserve : voir questions 1, 2 et 3.)*

**4. Cette rémunération influence-t-elle le choix de l'artisan ?**
[Texte à rédiger avec le juriste. Éléments factuels disponibles : le prescripteur choisit l'artisan parmi les artisans qui se sont positionnés sur le lot ; le devis, signé par vous, reste le document qui fixe le prix ; vous pouvez demander d'autres devis hors plateforme.]

**5. Vos droits**
Vous pouvez demander à votre prescripteur, ou à BÂTI-AXE à `contact@bati-axe.com`, des précisions sur ces rémunérations. Le chantier et son prix relèvent du contrat entre vous et l'artisan.

**Mention de fin de page :** Dernière mise à jour : [date]. [Référence de version : REMU-2026-11-v1.]

## 4. Questions pour le juriste

1. **Contenu.** Cette page, avec l'attestation du partenaire et la clause des conventions, suffit-elle à l'information du client final, ou l'information doit-elle figurer dans un document remis au client (devis de l'artisan, mandat du prescripteur) ? Sur qui pèse l'obligation : prescripteur, artisan, BÂTI-AXE ?
2. **Selon la profession.** Pour un syndic, un agent immobilier (loi Hoguet), un architecte (art. 27 du Code de déontologie) : la rémunération est-elle autorisée, sous quelles conditions, et la page doit-elle être différente selon la catégorie ?
3. **Chiffrer ou non.** Faut-il indiquer les pourcentages (commission et part du prescripteur) ? Chiffrer expose la part du prescripteur à son client ; ne pas chiffrer peut être jugé insuffisant. Le cas échéant, l'interface partenaire doit-elle afficher la part, malgré D-22 ?
4. **Barème.** Le taux n'étant pas définitif (8 % fixe ou par tranche), faut-il publier un barème précis ou une formule plus générale, et qui valide les changements de version ?
5. **« Le client ne paie rien en plus ».** Cette phrase est-elle vraie et sans risque ? L'artisan peut répercuter la commission dans son prix ; l'affirmer pourrait être trompeur.
6. **Valeur de la page.** Une page de site, modifiable, a-t-elle une valeur probante ? Faut-il en figer une version horodatée (hash) et la référencer dans l'attestation du partenaire, comme pour les gabarits de contrat ?
7. **Lien avec les CGU.** Les CGU actuelles ne parlent ni de commission ni d'apport d'affaires et sont encore fictives : quelle rédaction pour l'article sur la rémunération ?
8. **Particulier consommateur.** Si le donneur d'ordres est un particulier, la rémunération non révélée peut-elle être requalifiée en pratique commerciale trompeuse par omission (point 1, question 4) ?

## 5. Ce qu'il resterait à faire côté produit après validation

- Créer la page `/comment-bati-axe-est-remunere` (statique, pré-rendue, `noindex` à décider) avec le texte validé et sa référence de version.
- Lier la page : case d'attestation du partenaire, CGU, pied de page, e-mail de choix de l'artisan.
- Rédiger l'article des CGU.
- Si le juriste le demande : citer la version de la page dans l'attestation horodatée.
- Aligner la décision D-22 si les pourcentages sont publiés.

Rien de cela n'est fait : aucune page n'existe dans `app/pages/`, aucun lien n'a été ajouté.
