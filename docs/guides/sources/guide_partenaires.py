import sys
from tuto_lib import *

SHOTS = sys.argv[1]
OUT = sys.argv[2]
s = []

s += [H1('Bienvenue'),
      P('Vous êtes <b>syndic, architecte, bureau d’études, agence immobilière, diagnostiqueur</b> ou autre professionnel prescripteur ? '
        'Vous gardez la relation avec votre client ; BÂTI-AXE vous met en relation avec des <b>artisans certifiés</b> (décennale, SIRET et documents vérifiés) '
        'et suit le dossier jusqu’à la réalisation. Vous n’avez pas de compte à créer : tout passe par des <b>liens personnels envoyés par e-mail</b>.'),
      shot(SHOTS + '/p-partenaires.png', 'La page « Partenaires » : « Déposer un dossier » ouvre le formulaire.', max_h=72 * mm, crop=(0, 0, 1280, 620)),
      H2('Le parcours d’un dossier en 7 étapes'),
      *table(['Étape', 'Qui', 'Ce qui se passe'],
             [['1. Dépôt', 'Vous', 'Vous remplissez le formulaire (4 étapes) et joignez vos pièces.'],
              ['2. Convention', 'Vous', 'Vous signez une fois la convention de partenariat, par code reçu par e-mail.'],
              ['3. Diffusion', 'BÂTI-AXE', 'Notre équipe analyse le dossier et le diffuse aux artisans concernés.'],
              ['4. Positionnement', 'Artisans', 'Les artisans intéressés signent leur avenant et se positionnent sur votre dossier.'],
              ['5. Choix', 'Vous', 'Vous retenez un artisan par lot (ou une entreprise hors plateforme).'],
              ['6. Devis', 'Vous', 'Vous déposez le devis signé par votre client ; l’artisan le confirme.'],
              ['7. Avancement', 'Vous', 'Vous validez chaque étape du chantier une fois atteinte.']],
             [0.19, 0.15, 0.66]),
      callout('info', 'À chaque étape clé, vous recevez un <b>e-mail avec un sujet clair</b> et un lien vers votre espace de suivi.')]

s += [PageBreak(), H1('Cas 1 : j’ai un projet immédiat à faire chiffrer'),
      P('C’est le parcours complet. Comptez environ 5 minutes pour le dépôt.'),
      step(1, 'Ouvrez le formulaire',
           'Sur la page Partenaires, cliquez sur <b>« Déposer un dossier »</b>. Choisissez votre profil (étape 1/4), puis <b>« J’ai un projet / chantier immédiat à faire chiffrer »</b>.'),
      shot(SHOTS + '/p-b2b-form.png', 'Étape 1/4 : choisir votre profil professionnel.', max_h=68 * mm, crop=(0, 0, 1280, 700)),
      step(2, 'Décrivez le projet',
           [P('Renseignez :')] + bullets(['le <b>code postal du chantier</b> (obligatoire) et, si vous le souhaitez, l’adresse ;',
                                          'la <b>description du besoin</b> (obligatoire) ;',
                                          'le <b>budget estimé</b> des travaux ;',
                                          'selon votre profil : les corps de métier, la surface, le calendrier souhaité, le nombre de logements.'])),
      step(3, 'Joignez vos pièces',
           'Plans, CCTP, notes de calcul : formats <b>PDF, DWG, DXF, PNG, JPG, ZIP ou DOCX</b>. Les artisans y accèdent '
           'après avoir signé leur avenant, pour étudier le dossier avant de se positionner.'),
      step(4, 'Indiquez vos coordonnées et validez',
           'Nom, société (facultatif), <b>téléphone direct</b> et <b>adresse e-mail professionnelle</b>, puis acceptez d’être recontacté. '
           'Un écran vous confirme que « le dossier est transmis à notre pôle Pro » et vous donne une <b>référence</b> : notez-la.'),
      callout('tip', 'Soyez précis sur le périmètre de chaque lot (10 caractères minimum par lot pour un syndic) : les artisans lisent ces détails <b>avant</b> de se positionner.')]

s += [H1('Signer la convention de partenariat'),
      step(1, 'Ouvrez le lien de suivi', 'Vous recevez par e-mail un lien vers <b>« Espace partenaire »</b>, page « Dossier » avec votre référence. Il est <b>valable 30 jours</b>.'),
      step(2, 'Lisez la convention',
           'Le texte complet s’affiche dans un cadre. Il précise vos engagements, notamment l’<b>information de votre client</b> sur l’existence d’une rémunération d’apport d’affaires.'),
      step(3, 'Signez avec un code',
           'Cliquez sur <b>« Recevoir mon code de signature »</b> : un code à 6 chiffres arrive par e-mail (<b>valable 10 minutes</b>). Saisissez-le pour signer. '
           'Vous recevez une copie signée par e-mail.'),
      callout('info', 'La convention est signée <b>une seule fois par adresse e-mail</b> : vos dossiers suivants la réutilisent. Tant qu’elle n’est pas signée, vous ne pouvez pas choisir d’artisan.')]

s += [H1('Choisir votre artisan'),
      step(1, 'Attendez l’e-mail « Choisissez l’artisan de votre dossier »',
           'Il vous prévient que des artisans certifiés se sont positionnés. Ouvrez votre espace : section <b>« Artisans intéressés par votre dossier »</b>, <b>lot par lot</b>.'),
      step(2, 'Comparez les fiches',
           'Pour chaque artisan : métiers, <b>profil vérifié</b>, <b>décennale valide</b>, <b>RGE</b> le cas échéant, zone, et lien <b>« Voir la fiche publique »</b>. '
           'Son <b>téléphone</b> s’affiche une fois son avenant signé.'),
      step(3, 'Retenez un artisan par lot',
           'Cliquez sur <b>« Retenir cet artisan »</b>, puis <b>« Confirmer mon choix »</b>. Un seul artisan par lot : <b>les autres sont informés</b> que le chantier n’est pas obtenu.'),
      step(4, 'Ou retenez une entreprise hors plateforme',
           'Si vous avez déjà choisi ailleurs, cliquez sur <b>« J’ai retenu une entreprise hors plateforme »</b> : tous les artisans positionnés sur ce lot en sont informés.'),
      callout('warn', 'Le choix est <b>définitif pour le lot</b>. Vérifiez bien l’artisan avant de confirmer.')]

s += [H1('Déposer le devis signé'),
      step(1, 'Attendez la signature de votre client',
           'Une fois l’artisan retenu, il établit son devis. Quand <b>votre client l’a signé</b>, vous le déposez dans votre espace (e-mail « Déposez le devis signé »).'),
      step(2, 'Renseignez le dépôt',
           [P('Pour chaque lot :')] + bullets(['le <b>devis signé en PDF</b> ;', 'le <b>montant HT total</b> du devis ;',
                                               'la <b>date prévue de chaque étape</b> de versement (le 1er versement correspond à l’acompte du devis) ;',
                                               'l’<b>attestation</b> que vous avez informé votre client de l’existence d’une rémunération d’apport d’affaires (horodatée).'])),
      step(3, 'L’artisan confirme ou conteste',
           'L’artisan confirme le montant en un clic, ou le conteste. En cas de contestation, vous êtes invité à <b>déposer le devis corrigé</b>. Il n’y a jamais d’acceptation automatique par silence.'),
      callout('info', 'Les <b>montants de commission</b> ne sont pas affichés dans votre espace. Les conditions applicables figurent dans votre convention de partenariat.')]

s += [H1('Valider l’avancement du chantier'),
      P('Le chantier est découpé en <b>étapes</b> (échéancier lié au montant du devis). Quand la date prévue d’une étape est atteinte, vous recevez l’e-mail <b>« Validez l’avancement du chantier »</b>.'),
      step(1, 'Ouvrez la section « Avancement du chantier »', 'Chaque étape affiche sa date prévue ; une étape déjà validée indique « Validée le … ».'),
      step(2, 'Cliquez sur « Valider l’avancement »', 'Puis <b>« Confirmer »</b> : vous attestez que l’étape est bien atteinte. Les étapes se valident <b>dans l’ordre</b>.'),
      callout('warn', 'Ne validez une étape que si elle est réellement atteinte : cette validation rend exigible le versement correspondant.')]

s += [H1('Cas 2 : je souhaite établir un partenariat régulier'),
      P('Vous n’avez pas de chantier précis mais voulez accéder au réseau pour vos <b>futurs dossiers</b>.'),
      step(1, 'Choisissez le bon besoin', 'Dans le formulaire, sélectionnez <b>« Je souhaite établir un partenariat régulier »</b>. Le parcours est plus court : <b>3 étapes</b>, sans dépôt de fichiers.'),
      step(2, 'Laissez vos coordonnées', 'Un chargé d’affaires dédié vous recontacte au plus vite pour cadrer le partenariat.'),
      step(3, 'Déposez ensuite chaque projet', 'Pour chaque nouveau chantier, utilisez <b>« Mes dossiers »</b> (voir ci-dessous) puis <b>« Nouveau dossier »</b> : vos coordonnées sont préremplies.')]

s += [H1('Cas 3 : retrouver mes dossiers et en déposer un nouveau'),
      P('Vous avez déjà déposé un ou plusieurs dossiers et vous ne retrouvez plus vos e-mails ? Utilisez <b>« Mes dossiers »</b>.'),
      step(1, 'Demandez votre lien',
           'Sur le formulaire partenaires, cliquez sur <b>« Déjà un dossier ? Mes dossiers »</b>, ou ouvrez la page directement. Saisissez l’adresse e-mail utilisée pour vos dossiers.'),
      shot(SHOTS + '/md-index-desk.png', 'Page « Retrouver mes dossiers ».', max_h=62 * mm, crop=(0, 0, 1280, 520)),
      step(2, 'Ouvrez l’e-mail reçu',
           'Vous recevez un <b>lien personnel valable 24 heures</b>, sans mot de passe. Pour votre sécurité, l’écran de confirmation est <b>le même</b> que l’adresse ait des dossiers ou non : '
           'si rien n’arrive, regardez vos courriers indésirables.'),
      step(3, 'Consultez la liste',
           'Chaque dossier indique sa <b>référence</b>, sa date de dépôt, l’<b>état de chaque lot</b> (en attente d’artisans, à choisir, artisan retenu, clos) '
           'et, en gras, <b>ce que vous avez à faire</b> : « Convention à signer », « Choisissez votre artisan » ou « Devis signé à déposer ».'),
      step(4, 'Ouvrez un dossier ou créez-en un nouveau',
           'Le bouton <b>« Ouvrir »</b> mène au suivi détaillé du dossier. Le bouton <b>« Nouveau dossier »</b> ouvre le formulaire avec vos coordonnées préremplies (le consentement reste à donner).'),
      callout('warn', 'Le lien « Mes dossiers » est <b>personnel</b> : ne le transférez pas. Passé 24 heures, redemandez-en un depuis la même page.')]

s += [H1('Ce qui change selon votre profil'),
      *table(['Profil', 'Points propres au formulaire'],
             [['Syndic de copropriété / gestionnaire', 'Dossier <b>multi-lots</b> : vous cochez les <b>corps de métier concernés</b> (parties communes) et décrivez les travaux attendus par lot (10 caractères minimum). '
                                                       'Un dossier, plusieurs artisans diffusés automatiquement. Précisez le nombre de logements et le calendrier.'],
              ['Architecte / décorateur / maître d’œuvre', 'Joignez vos <b>plans</b> : les artisans les étudient avant de se positionner. Indiquez surface et calendrier. Vous gardez la maîtrise de vos choix de matériaux.'],
              ['Bureau d’études / ingénieur structure', 'Joignez vos <b>notes de calcul</b>. Les artisans consultés sont soumis aux mêmes contrôles de décennale.'],
              ['Agence immobilière / chasseur', 'Cas d’usage : <b>pré-chiffrage pour vos acheteurs</b>. Décrivez le bien et les travaux envisagés.'],
              ['Diagnostiqueur immobilier', 'Renseignez votre <b>numéro de certification</b> et recopiez les <b>travaux suggérés par votre rapport DPE</b> : ils alimentent directement le dossier de travaux.'],
              ['Autre professionnel', 'Même parcours que le projet immédiat ; décrivez au mieux votre besoin.']],
             [0.30, 0.70]),
      H1('Situations particulières'),
      *table(['Situation', 'Ce qu’il faut faire'],
             [['Je n’ai reçu aucun e-mail', 'Vérifiez les courriers indésirables. Sinon, utilisez « Mes dossiers » avec la même adresse que celle du dépôt.'],
              ['Mon lien de suivi est expiré (30 jours)', 'Demandez un nouveau lien via « Mes dossiers » ou écrivez à contact@bati-axe.com.'],
              ['Aucun artisan ne s’est positionné', 'Le lot reste « en attente d’artisans ». Contactez votre chargé d’affaires, avec la référence du dossier.'],
              ['L’artisan conteste mon montant', 'Vérifiez le devis, puis déposez le <b>devis corrigé</b> depuis votre espace.'],
              ['Mon client a changé de décision', 'Écrivez à votre chargé d’affaires <b>avant</b> toute validation d’étape.'],
              ['J’ai retenu une entreprise hors plateforme', 'Utilisez « J’ai retenu une entreprise hors plateforme » : les artisans positionnés sont informés.'],
              ['Je dois modifier mes coordonnées', 'Écrivez à contact@bati-axe.com avec la référence du dossier.']],
             [0.34, 0.66]),
      H1('Vos e-mails, en un coup d’œil'),
      *table(['Vous recevez…', 'Pour…'],
             [['Signez votre convention de partenariat', 'Signer la convention (dossier déposé, convention pas encore signée).'],
              ['Choisissez l’artisan de votre dossier', 'Retenir un artisan par lot.'],
              ['Déposez le devis signé', 'Déposer le PDF et le montant HT.'],
              ['Validez l’avancement du chantier', 'Confirmer qu’une étape est atteinte.'],
              ['Vos dossiers BÂTI-AXE', 'Accéder à « Mes dossiers » (lien valable 24 h).']],
             [0.45, 0.55]),
      Spacer(1, 4), P('Une question ? <b>contact@bati-axe.com</b> — indiquez la référence de votre dossier.', 'small')]

build(OUT, 'Guide du partenaire', 'Déposer un dossier, choisir l’artisan, suivre le chantier : chaque cas, pas à pas.', 'Pour : syndics, architectes, bureaux d’études, agences immobilières, diagnostiqueurs et autres prescripteurs', s)
print('ok', OUT)
