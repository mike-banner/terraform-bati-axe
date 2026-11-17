import sys
from tuto_lib import *

SHOTS = sys.argv[1]
OUT = sys.argv[2]
s = []

s += [H1('Bienvenue'),
      P('BÂTI-AXE vous envoie des <b>projets qualifiés</b> qui correspondent à vos métiers, sans prospection ni devis à l’aveugle. '
        'Deux sources de chantiers : les <b>particuliers</b> (leads) et les <b>partenaires professionnels</b> (appels d’offres : syndics, architectes, agences…).'),
      shot(SHOTS + '/p-pro-artisans.png', 'La page Artisans : inscription gratuite, 3 leads offerts pour démarrer.', max_h=70 * mm, crop=(0, 0, 1280, 640)),
      H2('Les étapes de départ'),
      *table(['Étape', 'Action', 'Résultat'],
             [['1', 'Créer votre compte avec votre SIRET', 'Raison sociale récupérée automatiquement.'],
              ['2', 'Déposer Kbis et décennale', 'Validation par l’équipe, puis accès aux projets.'],
              ['3', '(Facultatif) RGE et URSSAF', 'RGE : chantiers de rénovation énergétique. URSSAF : sous-traitance.'],
              ['4', 'Recevoir les alertes', 'Un e-mail à chaque projet dans vos métiers.'],
              ['5', 'Débloquer ou se positionner', 'Accès aux coordonnées du particulier, ou signature de l’avenant pour un appel d’offres.']],
             [0.08, 0.40, 0.52])]

s += [H1('1. Créer votre compte'),
      step(1, 'Ouvrez la connexion', 'Rendez-vous sur <b>« Je suis artisan »</b> puis <b>« Créer un compte »</b> (page « Espace artisan »).'),
      shot(SHOTS + '/p-pro-claim.png', 'Espace artisan : « Se connecter » ou « Créer un compte ».', max_h=62 * mm, crop=(0, 0, 1280, 620)),
      step(2, 'Renseignez votre entreprise', 'Votre <b>SIRET</b> suffit : il est vérifié auprès des registres officiels et la raison sociale est récupérée automatiquement.'),
      step(3, 'Choisissez vos métiers',
           [P('Deux profils existent :')] + bullets(['<b>Spécialiste</b> : 1 à 2 métiers.',
                                                      '<b>Entreprise générale (EGB)</b> : plusieurs métiers, jusqu’à 9. Elle doit être <b>approuvée par notre équipe</b> avant de recevoir des chantiers.'])),
      callout('warn', 'Ne cochez que les métiers que votre <b>décennale couvre</b>. Un métier ajouté plus tard n’est jamais activé automatiquement : vous devez le confirmer vous-même.')]

s += [H1('2. Déposer vos documents'),
      P('Depuis votre <b>tableau de bord</b>, section documents :'),
      *table(['Document', 'Obligatoire ?', 'À quoi il sert'],
             [['Kbis', 'Oui', 'Prouver l’existence légale de l’entreprise.'],
              ['Attestation décennale', 'Oui', 'Débloquer les projets de vos métiers.'],
              ['Attestation RGE', 'Non', 'Accéder aux postes de rénovation énergétique (avec une décennale valide). Date de fin de validité obligatoire.'],
              ['Attestation de vigilance URSSAF', 'Non', 'Être éligible à la sous-traitance. Date de fin de validité obligatoire.']],
             [0.30, 0.17, 0.53]),
      step(1, 'Déposez le fichier', 'Formats <b>PDF, JPG ou PNG</b>. Pour la RGE et l’URSSAF, saisissez la <b>date de fin de validité</b> indiquée sur l’attestation.'),
      step(2, 'Attendez la validation', 'L’équipe contrôle chaque pièce. Le statut passe de <b>En attente</b> à <b>Validé</b>, ou <b>Rejeté</b> avec un motif : déposez alors une pièce corrigée.'),
      step(3, 'Renouvelez avant l’échéance', 'Un document déjà validé n’affiche plus le formulaire de dépôt, mais un bouton <b>« Renouveler »</b> et sa période de validité. '
                                             'Vous êtes prévenu par e-mail avant l’échéance d’une décennale (rappels à 30 jours et à 7 jours).'),
      callout('tip', 'Déposez des pièces <b>lisibles et complètes</b> (toutes les pages, dates visibles) : c’est la première cause de refus.')]

s += [H1('3. Capacité de sous-traitance'),
      P('Cette option vous rend visible pour les chantiers où une entreprise générale cherche un sous-traitant.'),
      step(1, 'Activez l’interrupteur « Capacité sous-traitance »', 'Dans votre tableau de bord.'),
      step(2, 'Complétez la liste des pièces requises', 'Kbis récent, décennale, <b>attestation URSSAF</b> et RGE si concernée. Tant qu’une pièce manque, la liste « Pièces requises » vous l’indique.'),
      step(3, 'Obtenez le badge « Éligible sous-traitance »', 'Il apparaît dès que toutes les pièces sont validées. Elles sont <b>recontrôlées périodiquement</b> : pensez à les renouveler.')]

s += [H1('4. Les projets de particuliers (leads)'),
      step(1, 'Recevez l’alerte', 'Un e-mail vous prévient quand un particulier dépose un projet dans vos métiers et votre zone.'),
      step(2, 'Consultez la carte du projet',
           [P('Tant que le projet n’est pas débloqué, la carte reste <b>masquée</b>. Elle affiche seulement :')] +
           bullets(['le <b>département</b> du chantier ;', 'la <b>nature des travaux</b> (postes cochés) ;', 'la <b>surface en tranche</b> (par exemple « 50 à 80 m² ») ;', 'le <b>budget</b> et le <b>délai</b>.'])),
      step(3, 'Débloquez les coordonnées',
           '<b>3 leads sont offerts</b> à l’inscription. Au-delà, l’accès aux coordonnées passe par l’abonnement <b>Premium</b> (voir plus bas). '
           'Une fois débloqué, vous voyez le nom, le téléphone, l’e-mail et le détail du projet.'),
      step(4, 'Suivez le projet',
           'Faites évoluer son statut : <b>nouveau → contacté → gagné</b> (ou <b>perdu</b>). Les projets contactés ou gagnés se retrouvent dans <b>Projets en cours › Projets particuliers</b> ; '
           'les perdus sont rangés. Écrivez au particulier via la <b>messagerie</b> de la plateforme.'),
      callout('info', 'Un projet déjà débloqué par un autre artisan peut apparaître comme « attribué à un autre professionnel » : agissez vite sur ceux qui vous intéressent.')]

s += [H1('5. Les appels d’offres de partenaires'),
      P('Des professionnels (syndics, architectes, agences…) diffusent des dossiers découpés <b>en lots par métier</b>. Vous les retrouvez dans <b>Appels d’offres</b>, onglet <b>En cours</b>.'),
      step(1, 'Étudiez le lot', 'Vous lisez le détail des travaux attendus du lot correspondant à votre métier, la surface, le calendrier. L’identité du partenaire et ses pièces sont <b>masquées</b> à ce stade.'),
      step(2, 'Positionnez-vous',
           'Vous signez l’<b>avenant</b> du lot : un code à 6 chiffres arrive par e-mail (valable 10 minutes). '
           'La première fois, vous signez aussi la <b>convention cadre</b> BÂTI-AXE. L’avenant contient notamment la <b>commission</b> et une clause de <b>non-contournement</b> : lisez-les avant de signer.'),
      step(3, 'Retrouvez le dossier dans « Projets en cours »',
           'Dès que vous êtes positionné, le dossier quitte « Appels d’offres » et passe dans <b>Projets en cours › Appels d’offres en attente</b>. '
           'Cliquez sur la ligne pour ouvrir la <b>fiche du projet</b> : contact du partenaire et <b>pièces jointes</b> (plans, CCTP) à consulter ou télécharger, accessibles seulement après la signature de l’avenant.'),
      step(4, 'Attendez le choix du partenaire',
           'Le partenaire retient <b>un seul artisan par lot</b>. Si c’est vous, le dossier passe dans <b>Appels d’offres gagnés</b>. Sinon, il rejoint l’onglet <b>Perdues</b> d’Appels d’offres, '
           'avec le <b>motif</b> (par exemple : un autre artisan retenu, entreprise hors plateforme, délai dépassé) ; vous êtes aussi prévenu par e-mail. Les pièces jointes ne sont plus consultables.'),
      callout('warn', 'Ne contournez pas la plateforme : l’avenant comporte une clause de non-contournement. En cas de doute, relisez le texte signé ou demandez un avis juridique.')]

s += [H1('6. Après la victoire : devis et commission'),
      step(1, 'Le partenaire dépose le devis signé', 'Vous recevez un e-mail : le devis signé par son client et le <b>montant HT</b> vous sont présentés.'),
      step(2, 'Confirmez ou contestez le montant', 'Confirmez en un clic si le montant est exact. En cas d’écart, contestez : le partenaire est invité à déposer un devis corrigé. En confirmant, <b>vous déclarez le montant HT du devis signé</b>.'),
      step(3, 'Suivez l’échéancier', 'La commission est due <b>par étapes</b>, déclenchées par la validation d’avancement du partenaire. Vous voyez l’état de chaque étape dans la fiche du projet gagné.')]

s += [H1('7. Messagerie, profil et abonnement'),
      H2('Messagerie'),
      P('Tous vos échanges avec les particuliers se font dans <b>Messagerie</b> : une conversation par projet débloqué.'),
      H2('Profil public'),
      P('Dans <b>Mon profil</b>, complétez la <b>présentation</b>, le <b>téléphone</b>, la <b>zone d’intervention</b> et les <b>catégories</b>. '
        'Le badge RGE apparaît si votre attestation est validée. Un profil complet rassure les particuliers qui consultent votre fiche.'),
      H2('Abonnement Premium'),
      *table(['Formule', 'Ce que cela donne'],
             [['Gratuit', 'Inscription gratuite, <b>3 leads offerts</b>.'],
              ['Premium mensuel', 'Accès aux coordonnées <b>sans délai</b> dans vos zones. <b>Sans engagement</b>.'],
              ['Premium annuel', 'Engagement de 12 mois.']],
             [0.25, 0.75]),
      P('Le prix dépend du <b>nombre de zones</b> choisies dans les Yvelines : de <b>190 €/mois (1 zone)</b> à <b>350 €/mois (4 zones)</b>. Le tableau détaillé est sur la page Premium. '
        'Vous gérez votre facturation (moyen de paiement, factures, résiliation) depuis le bouton <b>« Gérer la facturation »</b>.'),
      callout('info', 'Un <b>essai avec désistement gratuit</b> peut s’appliquer : la date limite s’affiche sur la page Premium. Un changement de zone ou de formule prend effet à la date indiquée et peut être annulé avant.')]

s += [H1('Problèmes courants'),
      *table(['Situation', 'Que faire ?'],
             [['Mot de passe oublié', 'Sur la page de connexion, « Mot de passe oublié ? » : vous recevez un lien de réinitialisation.'],
              ['Un document est « Rejeté »', 'Lisez le motif, puis redéposez une pièce lisible et à jour.'],
              ['Je ne vois aucun projet', 'Vérifiez que Kbis et décennale sont <b>validés</b>, que vos métiers et zones sont bien renseignés, et que votre décennale est à jour.'],
              ['Les projets d’énergie ne s’affichent pas', 'Ils exigent une <b>RGE validée</b> et une décennale valide.'],
              ['Je suis une entreprise générale et je ne reçois rien', 'Votre statut d’entreprise générale doit être <b>approuvé</b> par l’équipe.'],
              ['Je ne retrouve pas un appel d’offres', 'Positionné : <b>Projets en cours › en attente</b>. Gagné : <b>… › gagnés</b>. Perdu : <b>Appels d’offres › Perdues</b>.'],
              ['Le code de signature ne fonctionne plus', 'Il est valable 10 minutes : redemandez un code.']],
             [0.34, 0.66]),
      Spacer(1, 4), P('Une question ? <b>contact@bati-axe.com</b>', 'small')]

build(OUT, 'Guide de l’artisan', 'Créer son compte, déposer ses documents, recevoir et gagner des chantiers.', 'Pour : artisans, entreprises du bâtiment et entreprises générales', s)
print('ok', OUT)
