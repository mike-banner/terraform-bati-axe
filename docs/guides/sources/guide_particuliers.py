import sys
from tuto_lib import *

SHOTS = sys.argv[1]
OUT = sys.argv[2]
s = []

s += [H1('Bienvenue'),
      P('BÂTI-AXE vous met en relation avec des <b>artisans certifiés du bâtiment</b> de votre zone. Le service est <b>gratuit pour les particuliers</b> et sans engagement. '
        'Vous décrivez vos travaux une seule fois : les artisans dont les métiers correspondent à votre projet sont prévenus, et vous choisissez avec qui avancer.'),
      callout('info', 'Le site est aujourd’hui ouvert à la <b>zone pilote des Yvelines (78)</b>.'),
      H2('Ce que vous allez faire, en bref'),
      *bullets(['<b>Estimer vos aides</b> (facultatif) : MaPrimeRénov’, CEE, Éco-PTZ et reste à charge.',
                '<b>Décrire votre projet</b> avec le simulateur (moins de 3 minutes).',
                '<b>Suivre votre projet</b> depuis un lien personnel reçu par e-mail.',
                '<b>Choisir votre artisan</b> parmi ceux qui se sont positionnés, puis échanger avec lui.']),
      Spacer(1, 6),
      shot(SHOTS + '/p-home.png', 'La page d’accueil : « Décrire mon projet » lance le simulateur.', max_h=80 * mm, crop=(0, 0, 1280, 640))]

s += [H1('1. Estimer vos aides (facultatif)'),
      step(1, 'Ouvrez le calculateur d’aides',
           'Depuis l’accueil, cliquez sur <b>« Calculer mes aides »</b>. Indiquez le montant estimé de vos travaux, puis suivez les questions.'),
      step(2, 'Lisez votre bilan',
           'Le calculateur estime vos aides (<b>MaPrimeRénov’, CEE, Éco-PTZ</b>) et votre <b>reste à charge</b>. '
           'Si vous déposez ensuite un projet, ce bilan est repris dans votre espace de suivi.'),
      callout('warn', 'Il s’agit d’une <b>estimation</b>, pas d’une décision d’attribution. Le montant réel dépend de votre dossier.'),
      shot(SHOTS + '/p-aides.png', 'Le calculateur d’aides.', max_h=70 * mm, crop=(0, 0, 1280, 560))]

s += [H1('2. Décrire votre projet'),
      step(1, 'Lancez le simulateur', 'Cliquez sur <b>« Décrire mon projet »</b> (accueil) ou <b>« Déposer un projet »</b> (menu). Le simulateur compte 6 étapes.'),
      step(2, 'Choisissez le type de projet',
           [P('Trois grandes familles vous sont proposées :')] + bullets(['<b>Rénovation globale</b> : gros œuvre et second œuvre.',
                                                                         '<b>Rénovation énergétique</b> : équipements, isolation thermique, énergies renouvelables.',
                                                                         '<b>Prestations / rénovation ciblée</b> : une pièce ou un aménagement précis.'])),
      step(3, 'Précisez les travaux, le lieu, le budget et le délai',
           'Les étapes suivantes demandent les <b>postes de travaux</b> concernés, la <b>localisation</b> (code postal), le <b>niveau de finition</b> '
           '(rafraîchissement, standard ou premium), votre <b>budget estimé</b> et votre <b>délai</b> souhaité.'),
      step(4, 'Laissez vos coordonnées',
           'En fin de parcours, vous indiquez comment vous joindre et vous acceptez le traitement de vos données. '
           'Vos coordonnées servent à la mise en relation et <b>ne sont pas affichées aux artisans</b> avant le contact (voir « Votre confidentialité »).'),
      callout('tip', 'Plus la description est précise (postes de travaux, surface, délai), plus les artisans peuvent juger vite si le projet leur convient.'),
      shot(SHOTS + '/p-simulateur.png', 'Étape 1 sur 6 du simulateur : le type de projet.', max_h=70 * mm, crop=(0, 0, 1280, 600))]

s += [H1('3. Suivre votre projet'),
      step(1, 'Ouvrez le lien reçu par e-mail',
           'Dès le dépôt, vous recevez un e-mail avec un <b>lien personnel et sécurisé</b>. Il ouvre la page <b>« Suivi de projet »</b>, sans mot de passe.'),
      step(2, 'Retrouvez votre dossier',
           [P('La page affiche :')] + bullets([
               'le <b>récapitulatif</b> : catégorie, description, budget estimé, délai souhaité et statut du dossier ;',
               'le <b>bilan financier estimé</b> : estimation des travaux, aides estimées et reste à charge ;',
               'la liste de <b>vos artisans</b> : les artisans certifiés qui se sont positionnés sur votre projet.'])),
      callout('warn', 'Ce lien est <b>personnel</b> : ne le transférez pas. Si vous ne le retrouvez plus, cherchez l’e-mail reçu lors du dépôt de votre projet. '
                      'Un lien invalide affiche « Lien invalide ou expiré ».')]

s += [H1('4. Choisir votre artisan'),
      step(1, 'Consultez chaque profil',
           'Pour chaque artisan, un badge indique si sa <b>décennale est vérifiée</b>. Ouvrez son <b>profil public</b> pour voir sa présentation, ses métiers et sa zone d’intervention.'),
      step(2, 'Indiquez votre choix',
           'Pour chaque artisan, indiquez si vous le <b>retenez</b> ou si vous l’<b>écartez</b>. Un artisan écarté apparaît grisé.'),
      step(3, 'Si aucun ne vous convient',
           'Votre projet est <b>automatiquement reproposé à de nouveaux artisans</b>. Vous n’avez rien à refaire.'),
      step(4, 'Échangez avec l’artisan retenu',
           'Les échanges (questions, visite, devis, planning) se font par la <b>messagerie de la plateforme</b>.'),
      callout('tip', 'Demandez plusieurs devis écrits avant de vous engager, et comparez les postes de travaux ligne par ligne.')]

s += [PageBreak(), H1('Ce qui est vérifié chez les artisans'),
      P('Avant de pouvoir vous contacter, chaque artisan doit remplir ces conditions :'),
      *table(['Contrôle', 'Ce que cela signifie'],
             [['Décennale à jour', 'L’attestation d’assurance décennale est déposée et valide.'],
              ['Kbis déposé', 'L’entreprise justifie de son existence légale.'],
              ['Zone confirmée', 'L’artisan intervient bien dans votre secteur.'],
              ['Entreprise vérifiée (API Gouv)', 'Le SIRET est contrôlé auprès des registres officiels.']],
             [0.34, 0.66]),
      callout('info', 'Ces contrôles facilitent votre choix mais ne remplacent pas votre vigilance : demandez toujours une attestation d’assurance à jour avant le début des travaux. '
                      'BÂTI-AXE met en relation ; la réalisation des travaux relève de l’artisan que vous choisissez.'),
      H1('Votre confidentialité'),
      *bullets(['Vos coordonnées sont <b>masquées</b> aux artisans tant que la mise en relation n’est pas engagée. Avant cela, ils voient seulement des informations générales du projet : '
                'département, nature des travaux, surface en tranche, budget et délai.',
                'Évitez d’écrire votre nom, votre numéro ou votre adresse dans les champs libres de description.',
                'Vous pouvez demander l’accès, la correction ou l’effacement de vos données en écrivant à <b>rgpd@bati-axe.com</b>.']),
      H1('Questions fréquentes'),
      *table(['Question', 'Réponse'],
             [['Est-ce payant ?', 'Non, le service est gratuit pour les particuliers.'],
              ['Combien de temps pour être contacté ?', 'Les artisans de vos métiers sont alertés dès le dépôt. Les délais de réponse dépendent de chacun.'],
              ['Je n’ai pas reçu d’e-mail.', 'Regardez vos courriers indésirables, puis vérifiez l’adresse saisie. À défaut, redéposez le projet avec la bonne adresse.'],
              ['Mon lien indique « invalide ou expiré ».', 'Utilisez le lien du dernier e-mail reçu. S’il ne fonctionne plus, écrivez à contact@bati-axe.com.'],
              ['Aucun artisan ne me convient.', 'Indiquez-le sur la page de suivi : le projet est reproposé à de nouveaux artisans.'],
              ['Je veux retirer mon projet.', 'Écrivez à rgpd@bati-axe.com en indiquant l’e-mail utilisé lors du dépôt.']],
             [0.34, 0.66]),
      Spacer(1, 4), P('Une question ? <b>contact@bati-axe.com</b>', 'small')]

build(OUT, 'Guide du particulier', 'Décrire mon projet, suivre mon dossier et choisir mon artisan, pas à pas.', 'Pour : particuliers porteurs d’un projet de travaux', s)
print('ok', OUT)
