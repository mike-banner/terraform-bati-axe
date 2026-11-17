const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, LevelFormat, Footer, Header, PageNumber, PageBreak, TabStopType,
} = require('docx')

const OUT = process.argv[2]
const W = 9026 // A4, marges 2 cm → largeur utile en DXA
const FONT = 'Arial'
const INK = '0F172A', MUTED = '475569', ACCENT = 'EA580C', SOFT = 'F1F5F9', LINE = 'CBD5E1'

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: 21, color: INK, ...o })
// Texte avec **gras** inline
function rich(text, base = {}) {
  text = text.replace(/`/g, '')
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(t =>
    t.startsWith('**') ? run(t.slice(2, -2), { bold: true, ...base }) : run(t, base))
}
const para = (text, o = {}) => new Paragraph({ spacing: { after: 100, line: 300 }, ...o, children: rich(text, o.run || {}) })
const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] })

let instance = 0
const numbered = (items) => {
  instance += 1
  return items.map(t => new Paragraph({
    numbering: { reference: 'num', level: 0, instance }, spacing: { after: 70, line: 290 }, children: rich(t),
  }))
}
const bullets = (items) => items.map(t => new Paragraph({
  numbering: { reference: 'bul', level: 0 }, spacing: { after: 70, line: 290 }, children: rich(t),
}))

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE }
const borders = { top: border, bottom: border, left: border, right: border }
const cell = (children, width, o = {}) => new TableCell({
  borders, width: { size: width, type: WidthType.DXA }, margins: { top: 70, bottom: 70, left: 110, right: 110 },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, children,
})
const cellP = (text, o = {}) => new Paragraph({ spacing: { after: 20, line: 270 }, children: rich(text, { size: 19, ...(o.bold ? { bold: true } : {}) }) })

function table(header, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0)
  if (sum !== W) throw new Error('largeurs ≠ ' + W + ' : ' + sum)
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell([cellP(h, { bold: true })], widths[i], { fill: SOFT })) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell([cellP(c)], widths[i])) })),
    ],
  })
}

function box(label, lines) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [cell([
      new Paragraph({ spacing: { after: 60 }, children: [run(label, { bold: true, color: ACCENT, size: 19 })] }),
      ...lines,
    ], W, { fill: SOFT })] })],
  })
}

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT })] })
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })] })

const PRIO = { A: 'A — peut bloquer le modèle', B: 'B — à fixer avant la prod', C: 'C — confort' }

function point(p) {
  const out = [h2(`${p.n}. ${p.title}`), new Paragraph({ spacing: { after: 80 }, children: [run(`Priorité ${PRIO[p.prio]}`, { bold: true, color: ACCENT, size: 19 }), ...(p.isNew ? [run('   ·   Nouveau depuis le 8 novembre', { color: MUTED, size: 19 })] : [])] })]
  out.push(para('**Constat.** ' + p.constat[0]))
  for (const c of p.constat.slice(1)) out.push(para(c))
  if (p.bullets) out.push(...bullets(p.bullets))
  out.push(para('**Questions à poser.**', { keepNext: true }))
  out.push(...numbered(p.questions))
  if (p.note) out.push(para('**Remarque.** ' + p.note))
  out.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ height: { value: 900, rule: 'atLeast' }, children: [cell([new Paragraph({ children: [run('Avis / décision du juriste :', { size: 18, color: MUTED, italics: true })] })], W)] })],
  }))
  out.push(spacer(160))
  return out
}

// ───────────────────────── Contenu ─────────────────────────
const POINTS = [
  { n: 1, prio: 'A', title: 'Rétro-commission versée au partenaire prescripteur',
    constat: ['Le client final paie l’artisan ; l’artisan doit à BÂTI-AXE une commission d’apport d’affaires ; BÂTI-AXE reverse une quote-part au partenaire qui a apporté le dossier (syndics, agences immobilières, architectes, experts, courtiers). La convention partenaire parle d’une « quote-part » dont les modalités sont fixées par avenant ou conditions particulières : **le pourcentage n’est pas fixé dans les documents signés**. Le flux applique aujourd’hui 3 % du montant HT, sans document signé qui le précise ; le client a évoqué un partage 5 % / 3 %, non confirmé.',
      'BÂTI-AXE ne traite pas avec le client final : le partenaire a seul la relation avec lui (sauf s’il est lui-même donneur d’ordres). L’information du client ne peut donc pas venir directement de BÂTI-AXE.'],
    questions: ['Un syndic de copropriété peut-il percevoir une rémunération d’un prestataire qu’il désigne pour la copropriété ? À quelles conditions (information du conseil syndical, mise en concurrence, assemblée générale, mention au contrat de syndic) ?',
      'Même question pour un agent immobilier (loi Hoguet du 2 janvier 1970), un architecte inscrit à l’Ordre (art. 27 du Code de déontologie), un expert, un courtier.',
      'La clause d’information du client final imposée par la convention suffit-elle ? Doit-elle être écrite, chiffrée, antérieure au choix de l’artisan ?',
      'La rétro-commission est-elle requalifiable en pratique commerciale trompeuse par omission vis-à-vis d’un consommateur ?',
      'Les mécanismes envisagés suffisent-ils : (a) mention dans les CGU et conventions, (b) attestation horodatée du partenaire au dépôt du devis, (c) page publique « Comment BÂTI-AXE est rémunéré », (d) distinction du partenaire qui agit pour son compte et de celui qui agit pour un tiers ? L’obligation pèse-t-elle sur le partenaire, l’artisan ou BÂTI-AXE ?'],
    note: 'Thèse de Mike à faire valider : le client reçoit le devis détaillé de l’artisan avant de signer et le partenaire est responsable de ce qu’il fait signer. Réserve : un prix correct n’efface pas l’omission d’une rémunération du partenaire. Piste : clause de garantie par laquelle le partenaire indemnise BÂTI-AXE si son client le met en cause.' },
  { n: 2, prio: 'B', title: 'Stipulation pour autrui et non-contournement',
    constat: ['L’avenant par lot contient une clause de non-contournement de 24 mois au profit de BÂTI-AXE et, par stipulation pour autrui (art. 1205 du Code civil), du partenaire non signataire. L’ensemble convention pro + convention partenaire + avenant est présenté comme « indivisible ».'],
    questions: ['La rédaction est-elle valable et opposable au partenaire qui n’a pas signé l’avenant ?', 'Une durée de 24 mois et un périmètre « tout chantier issu d’une mise en relation » sont-ils proportionnés (risque de nullité pour restriction excessive) ?', 'L’« ensemble indivisible » tient-il si l’une des trois conventions est annulée ou résiliée ?'] },
  { n: 3, prio: 'B', title: 'Clause pénale',
    constat: ['Pénalité de 5 000 € HT par chantier dissimulé, sans préjudice de la commission due, plus exclusion du réseau. Le gabarit cite l’art. 1231-5 du Code civil (modération par le juge).'],
    questions: ['Le montant forfaitaire est-il défendable ? Le cumul pénalité + commission est-il admis ?', 'Faut-il un barème proportionnel au montant du chantier plutôt qu’un forfait ?', 'L’exclusion du réseau est-elle exécutable sans mise en demeure préalable ?'] },
  { n: 4, prio: 'B', title: 'Commission : assiette, exigibilité, annulation',
    constat: ['Taux : 8 % HT jusqu’à 200 000 € HT, 6 % au-delà, par tranche (250 000 € donnent 19 000 € HT). Le client a évoqué « 8 % fixe » : non tranché. L’assiette est le montant HT total du devis signé par le client final, déposé par le partenaire et confirmé par l’artisan. La commission est annulable manuellement par l’administrateur dans des cas précis.'],
    questions: ['L’assiette « devis signé » reste-t-elle valable si le devis évolue (avenants de travaux, révision de prix, travaux supplémentaires) ? Quelle clause d’ajustement ?', 'Quels cas d’annulation sont acceptables et opposables à l’artisan (chantier jamais démarré, devis résilié, rétractation) ? Qui supporte le risque si le client se rétracte (contrats hors établissement avec un particulier) ?', 'Un artisan peut-il se voir imputer la commission si le chantier est réalisé mais le devis remplacé par un autre document ?', 'Nature de la prestation (apport d’affaires) et TVA : à confirmer avec l’expert-comptable.'] },
  { n: 5, prio: 'B', title: 'Preuve du montant : double déclaration',
    constat: ['Le partenaire saisit le montant HT total et dépose le PDF du devis signé ; l’artisan confirme en un clic ou conteste. Le silence de l’artisan **ne vaut jamais acceptation** : le dossier est bloqué, relancé et arbitré par l’administrateur.'],
    questions: ['Valeur probante du PDF déposé (falsification possible) : quels éléments exiger (signature électronique du client, mentions obligatoires) ? Droit d’audit contractuel sur les pièces ?', 'En cas de contestation artisan/partenaire, qui tranche et selon quelle procédure ? (aujourd’hui : l’administrateur BÂTI-AXE, sans clause d’arbitrage.)', 'Faut-il prévoir une acceptation tacite après un délai, ou le blocage actuel est-il préférable ?'] },
  { n: 6, prio: 'B', title: 'Signature électronique simple par code e-mail',
    constat: ['Signature = code à 6 chiffres envoyé par e-mail (valable 10 minutes), HTML du contrat figé, empreinte SHA-256, horodatage, adresse IP, navigateur, journal d’audit. Ce n’est ni une signature avancée ni qualifiée (eIDAS). Évolution possible vers un prestataire (Yousign).'],
    questions: ['Cette signature suffit-elle à prouver l’engagement d’un artisan (professionnel) dans un litige sur la commission ?', 'Faut-il une convention de preuve explicite (art. 1368 du Code civil) dans la convention cadre ?', 'Le niveau « simple » est-il acceptable pour une clause pénale de 5 000 € ?'] },
  { n: 7, prio: 'A', title: 'Flux d’argent, statut de la plateforme et Stripe Connect',
    constat: ['Aujourd’hui aucun argent ne transite par BÂTI-AXE : facturation manuelle. Le client souhaite à terme un split Stripe Connect avec commission prélevée à la source à l’acompte. **À traiter avant la phase de paiement.**'],
    questions: ['Quel statut réglementaire si les fonds passent par un compte plateforme avant ventilation (agrément ACPR, agent de prestataire de services de paiement, cantonnement) ? Je ne suis pas sûr de la réponse.', 'Paiement échelonné de la commission par l’artisan (prélèvement SEPA) : quel mandat, quelles mentions, quelle sanction d’impayé ?', 'Un compte connecté (KYC) est-il obligatoire pour chaque partenaire rémunéré ?'] },
  { n: 8, prio: 'B', title: 'Facturation et autofacturation',
    constat: ['Prévu : facture de commission BÂTI-AXE vers l’artisan ; rétro-commission BÂTI-AXE vers le partenaire. Pour la seconde, deux montages : le partenaire nous facture, ou nous établissons la facture à son nom (autofacturation).'],
    questions: ['Mentions obligatoires, mandat de facturation écrit, numérotation, TVA applicable selon le statut du partenaire (assujetti ou non), conservation.', 'Un partenaire non assujetti à la TVA (syndic bénévole, association) change-t-il le montage ?'] },
  { n: 9, prio: 'A', title: 'Courtage en crédit (si maintenu)',
    constat: ['Le client veut une rémunération de 5 % du prêt travaux débloqué et un lead « courtier ». Aucune ligne de code à ce jour.'],
    questions: ['L’intermédiation en crédit est réglementée (ORIAS, statut d’IOBSP, rémunération d’apporteur) : qui doit être immatriculé (BÂTI-AXE, le courtier, les deux) ? Un apporteur sans immatriculation est-il possible ? Je ne suis pas sûr de la réponse.'] },
  { n: 10, prio: 'A', title: 'Revente de leads et consentements RGPD',
    constat: ['Le client veut revendre à l’unité les contacts issus du simulateur (artisan, agent immobilier, diagnostiqueur, courtier), à des tarifs de 25 à 120 €. Le registre RGPD existe mais est limité (voir point 23).'],
    questions: ['Consentement explicite et distinct par catégorie de destinataire, avec identification du destinataire ; durée de validité ; preuve ; droit de retrait ; base légale ; information préalable sur le prix.', 'Un formulaire à deux cases suffit-il ? (Je pense que non.)', 'Responsabilité conjointe de traitement avec chaque acheteur de leads ?'] },
  { n: 11, prio: 'B', title: 'Masquage des coordonnées des partenaires et preuves de signature',
    constat: ['Les coordonnées du partenaire (nom, téléphone, e-mail) ne sont révélées à l’artisan qu’après signature de l’avenant. Les pages partenaire sont des liens à jeton, sans compte. Les preuves de signature stockent adresse IP et navigateur.'],
    questions: ['Durée de conservation des preuves (IP, user-agent, contrat signé) ; information des signataires ; base légale ; mentions dans la politique de confidentialité.', 'Transfert de données du client final (devis PDF déposé par le partenaire : nom, adresse) : qui est responsable de traitement, quelle mention d’information ?'] },
  { n: 12, prio: 'B', title: 'Place de marché : CGU, qualification, responsabilités',
    constat: ['Les pages légales existent mais avec un **contenu d’exemple** (voir point 16). Autres points : statut éditeur/hébergeur (LCEN), portée du badge « vérifié » (décennale, SIRET, URSSAF, RGE), modération des avis, assurance RC de BÂTI-AXE.'],
    questions: ['Rédaction réelle des CGU/CGV ; qualification (intermédiaire, courtier, apporteur d’affaires, plateforme au sens de l’art. L. 111-7 du Code de la consommation) ; responsabilité en cas de défaillance d’un artisan présenté ; mentions obligatoires de l’éditeur.'] },
  { n: 13, prio: 'C', title: 'Contrats B2C : exclusivité géographique',
    constat: ['La charte prévoit un artisan unique par métier et par zone, avec clause de palier de volume et engagement de 12 mois.'],
    questions: ['Validité de l’exclusivité de zone (droit de la concurrence), basculement automatique de palier, reconduction tacite et information du consommateur ou du professionnel.'] },
  { n: 14, prio: 'C', title: 'Sous-traitance : vigilance et pièces obligatoires',
    constat: ['Le verrou sous-traitance exige Kbis de moins de 3 mois, décennale, attestation de vigilance URSSAF et RGE le cas échéant, avec re-contrôle périodique (environ 6 mois).'],
    questions: ['Les pièces et périodicités correspondent-elles aux obligations de vigilance du donneur d’ordre (art. L. 8222-1 du Code du travail) ?', 'BÂTI-AXE est-elle donneur d’ordre ou simple intermédiaire ? Le badge « éligible sous-traitance » engage-t-il sa responsabilité ?'] },
  { n: 15, prio: 'A', title: 'Écarts entre les gabarits v1 signés et le flux actuel',
    constat: ['Le flux livré diffère des gabarits v1 (`CC-PRO-2026-10-v1`, `CC-PART-2026-10-v1`, `AV-LOT-2026-10-v1`). Les engagements déjà signés restent en v1. **À traiter avant la bascule en production.**'],
    bullets: ['**Déclaration du montant** : les gabarits disent que l’artisan « déclare » le montant ; désormais le partenaire dépose le devis signé et l’artisan le confirme ou le conteste.',
      '**Exigibilité** : les gabarits disent « à la signature du devis et au premier acompte » ; le flux applique un échéancier (jusqu’à 200 000 € HT : 50 % / 50 % ; au-delà : 30 % / 40 % / 30 %) déclenché par la validation d’avancement du partenaire.',
      '**Rétro-commission** : versée seulement en fin de chantier, quand la commission est intégralement encaissée ; à écrire dans la convention partenaire v2, avec les conditions particulières (3 % fixe aujourd’hui).',
      '**Annulation de commission** et **silence de l’artisan** : absents des gabarits v1.',
      '**Avenant de travaux** dépassant 200 000 € HT : l’échéancier change (2 puis 3 versements) ; à prévoir dans l’avenant v2.'],
    questions: ['Les gabarits v1 restent-ils opposables pour les engagements déjà signés ?', 'Quelle formulation pour la v2 (déclaration ou confirmation, exigibilité par étapes, rétro-commission, conditions particulières) ?'] },

  // ── Nouveaux points
  { n: 16, prio: 'A', isNew: true, title: 'Pages légales : contenu d’exemple et incohérences',
    constat: ['Constaté sur le site de test le 18 novembre 2026 :'],
    bullets: ['**Mentions légales** : éditeur « BÂTI-AXE SAS », adresse « 12 rue de la Paix, 75002 Paris », RCS « Paris B 123 456 789 », TVA « FR 99 123456789 » : valeurs d’exemple, non réelles. Hébergeur indiqué : Cloudflare seul.',
      '**Politique de confidentialité** : ne décrit que les données des **professionnels** (identité, coordonnées, documents). Rien sur les **particuliers**, les **partenaires**, les preuves de signature, ni sur les destinataires (artisans).',
      '**CGU** : couvrent l’inscription et les documents des professionnels ; BÂTI-AXE s’y définit comme « simple tiers de mise en relation ». Rien sur les particuliers ni les partenaires.',
      '**Contact RGPD** : `rgpd@bati-axe.com` sur la page publique, `rgpd@bati-axe.fr` dans le registre interne.',
      '**Pied de page** : la mention « Conforme RGPD » est affichée sur toutes les pages.'],
    questions: ['Quel périmètre pour les CGU : un jeu par public (particuliers, artisans, partenaires) ou un document commun ?', 'La mention « Conforme RGPD » est-elle une affirmation que l’on peut maintenir tant que les points 17 à 25 ne sont pas levés ?', 'L’hébergement doit-il lister tous les sous-traitants techniques (point 23) ?', 'Quelle adresse unique pour le contact RGPD, et faut-il désigner un DPO ?'] },
  { n: 17, prio: 'A', isNew: true, title: 'Promesse faite aux particuliers sur la confidentialité de leurs coordonnées',
    constat: ['L’accueil affiche : « Vos coordonnées restent masquées jusqu’au contact » et « L’artisan vous écrit via la plateforme, sans voir votre numéro. Vous décidez qui peut vous joindre, et quand. »',
      'Dans le produit, un artisan voit d’abord un aperçu issu de listes fermées : département, postes de travaux, surface en tranche, budget, délai (jamais le texte libre ni le code postal). **Après déblocage** (notamment avec les 3 leads offerts ou l’abonnement Premium), il accède aux coordonnées du particulier. Le particulier peut ensuite retenir ou écarter chaque artisan.'],
    questions: ['La formulation de l’accueil est-elle exacte au regard du déblocage des coordonnées par l’artisan ? Risque de pratique commerciale trompeuse ?', 'Quelle base légale et quelle information pour la transmission des coordonnées à plusieurs artisans ? Le particulier doit-il consentir artisan par artisan ?', 'Combien d’artisans peuvent débloquer un même projet, et le particulier en est-il informé ?', 'L’aperçu (département, travaux, surface en tranche) constitue-t-il une donnée personnelle ? Information nécessaire ?', 'Faut-il adapter le texte, ou le comportement du produit ?'] },
  { n: 18, prio: 'B', isNew: true, title: 'Pièces jointes des partenaires consultables par les artisans',
    constat: ['Le partenaire dépose des plans, CCTP, notes de calcul (PDF, DWG, DXF, PNG, JPG, ZIP, DOCX) stockés sur un espace de stockage privé. L’artisan y accède, depuis la fiche du projet, **après signature de son avenant** ; l’accès est retiré si son offre est perdue. Les liens d’accès sont signés et valables 5 minutes.',
      'Ces fichiers peuvent contenir des données personnelles du client final (nom, adresse sur un plan ou un devis) et des œuvres protégées (plans d’un architecte). Je n’ai pas identifié de purge automatique de ces fichiers : à confirmer.'],
    questions: ['Quelle licence ou quelle clause d’usage pour les plans d’un architecte consultés par plusieurs artisans en concurrence (droit d’auteur) ?', 'Clause de confidentialité et de non-réutilisation dans l’avenant de l’artisan : existante, suffisante ?', 'Qui est responsable de traitement pour les données du client final contenues dans ces fichiers, et quelle information lui est due ?', 'Durée de conservation des fichiers (dossier perdu, annulé, terminé) et procédure de suppression.', 'Responsabilité de BÂTI-AXE si un fichier est diffusé ou réutilisé en dehors du dossier.'] },
  { n: 19, prio: 'B', isNew: true, title: 'Espace « Mes dossiers » du partenaire : accès par lien e-mail',
    constat: ['Un partenaire récurrent saisit son e-mail et reçoit un **lien personnel valable 24 heures**, sans mot de passe. La page liste ses dossiers (état de chaque lot, prochaine action) et permet d’ouvrir le suivi détaillé ou de déposer un nouveau dossier prérempli. Le lien de suivi détaillé existant est valable 30 jours.',
      'Mesures en place : réponse identique que l’adresse ait des dossiers ou non, limitation du nombre de demandes, lien signé côté serveur. **Limite** : la possession du lien suffit ; un lien transféré ou une boîte mail partagée donne accès, et ces liens permettent d’agir (choisir un artisan, déposer un devis, valider un avancement qui rend exigible un versement).'],
    questions: ['Ce niveau d’authentification est-il suffisant au regard de la sécurité exigée (art. 32 du RGPD) et de la valeur probante des actions faites via le lien ?', 'La validation d’avancement par simple possession du lien est-elle opposable, sachant qu’elle déclenche l’exigibilité d’une commission ?', 'Faut-il mentionner ce mode d’accès et sa durée dans la politique de confidentialité et les conditions du partenaire ?', 'Responsabilité si le lien est utilisé par un tiers depuis la boîte mail du partenaire ?'] },
  { n: 20, prio: 'B', isNew: true, title: 'E-mails automatiques envoyés aux artisans',
    constat: ['La plateforme envoie notamment : alertes de nouveau projet dans les métiers de l’artisan ; relances de documents ; rappels de fin de décennale (30 et 7 jours) ; **e-mail de clôture d’un lot** aux artisans qui ont été avertis ou positionnés mais non retenus (y compris ceux qui n’avaient pas signé l’avenant), avec le motif (autre artisan retenu, entreprise hors plateforme, délai dépassé).'],
    questions: ['Ces envois sont-ils des messages transactionnels (exécution du service) ou de la prospection B2B ? Quelles mentions (identité, désinscription) sont exigées (art. L. 34-5 du CPCE, RGPD) ?', 'Pour un artisan avisé sans avoir signé d’avenant, existe-t-il un lien contractuel justifiant l’envoi d’un message de clôture ?', 'Le motif communiqué à l’artisan perdant peut-il révéler un choix « hors plateforme » du partenaire sans enfreindre la confidentialité due au partenaire ?', 'Possibilité pour l’artisan de régler ses préférences d’alertes ?'] },
  { n: 21, prio: 'B', isNew: true, title: 'Abonnement Premium des artisans : conditions de vente',
    constat: ['Formules affichées : abonnement mensuel sans engagement, ou annuel avec engagement de 12 mois ; prix de **190 €/mois (1 zone)** à **350 €/mois (4 zones)** ; essai avec désistement gratuit jusqu’à une date affichée ; changement de zone ou de formule différé à une date indiquée ; facturation et résiliation via le portail du prestataire de paiement. Aucune CGV dédiée n’est publiée.'],
    questions: ['Quelles CGV / conditions d’abonnement pour des professionnels : mentions précontractuelles, prix HT ou TTC, reconduction, résiliation ?', 'Un droit de rétractation s’applique-t-il à certains artisans (petites entreprises, contrat hors établissement) ?', 'L’essai avec désistement gratuit : quelles informations et quel moyen de preuve du consentement au paiement futur ?', 'Quelle information sur l’engagement de 12 mois et sur les conséquences d’un retrait de zone ?', 'Traitement TVA et facturation des abonnements.'] },
  { n: 22, prio: 'B', isNew: true, title: 'Documents des artisans : traitement et portée du badge « vérifié »',
    constat: ['Les artisans déposent Kbis (qui contient des données d’identité de dirigeants), attestation de décennale, RGE, attestation de vigilance URSSAF. Un administrateur les valide ; le SIRET est contrôlé auprès de registres officiels. Les particuliers voient un badge « décennale vérifiée » ; les partenaires voient « profil vérifié ».'],
    questions: ['Base légale et durée de conservation de ces documents (voir point 25) ; accès réservé à quels rôles ?', 'Le badge « vérifié » engage-t-il BÂTI-AXE : sur quoi exactement (existence des documents, validité à la date du contrôle, couverture du métier concerné) ? Quelle mention de limite apposer ?', 'Je n’ai pas vérifié que le passage d’une décennale à l’état « expirée » est entièrement automatique : quel risque si un artisan reste « vérifié » avec une attestation échue, quelle formulation prudente ?'] },
  { n: 23, prio: 'A', isNew: true, title: 'Sous-traitants techniques et transferts hors Union européenne',
    constat: ['Prestataires utilisés : hébergement et stockage de fichiers (Cloudflare, société américaine), base de données (Supabase, région Europe), envoi d’e-mails (Resend), paiements (Stripe), mesure d’audience (Umami), anti-robot (Cloudflare Turnstile). Le registre actuel ne comporte qu’**une fiche de traitement** (mise en relation et conformité des prestataires) et ne liste pas ces sous-traitants ni les transferts.'],
    questions: ['Quels accords de sous-traitance (art. 28 RGPD) et garanties de transfert (clauses contractuelles types, cadre de protection des données UE–États-Unis) faut-il documenter pour chacun ?', 'Où sont physiquement hébergés la base et les fichiers ? Une localisation dans l’UE est-elle exigée par le client ?', 'Faut-il compléter le registre avec des fiches par traitement (particuliers, partenaires, signatures, journal d’audit, paiements) ?', 'Une analyse d’impact (AIPD) est-elle nécessaire ?'] },
  { n: 24, prio: 'B', isNew: true, title: 'Cookies, traceurs et mesure d’audience',
    constat: ['Le site utilise une mesure d’audience (Umami, adresse configurable), un anti-robot (Turnstile) et des cookies de session d’authentification. **Je n’ai pas vérifié** la présence d’un bandeau de consentement ni la configuration d’Umami (sans cookie, exemption de consentement).'],
    questions: ['La mesure d’audience bénéficie-t-elle de l’exemption de consentement dans sa configuration actuelle ?', 'Un bandeau est-il nécessaire pour l’anti-robot et les cookies d’authentification ?', 'Mentions à ajouter dans la politique de confidentialité.'] },
  { n: 25, prio: 'B', isNew: true, title: 'Durées de conservation, droits des personnes, violation de données',
    constat: ['Le registre prévoit : données de compte et documents 5 ans après fermeture du compte ; factures 10 ans ; prospects inactifs 3 ans maximum. Le produit porte une date de conservation sur les projets des particuliers, mais **je n’ai pas vérifié** qu’elle correspond à ces durées ni qu’une purge automatique est en place. Les preuves de signature (IP, navigateur), le journal d’audit et les fichiers déposés ont leur propre durée, non documentée. Je n’ai pas identifié d’outil de demande de droits en libre-service (accès, effacement) ni de procédure écrite de notification de violation (72 heures).'],
    questions: ['Durées de conservation à retenir pour chaque catégorie (projets de particuliers, dossiers partenaires, fichiers, preuves de signature, journal d’audit, documents d’artisans).', 'Procédure minimale pour répondre aux demandes de droits d’accès, rectification, effacement, opposition : délais, vérification d’identité, responsable.', 'Procédure de notification à la CNIL et aux personnes en cas de violation.'] },
  { n: 26, prio: 'C', isNew: true, title: 'Accès administrateur aux données',
    constat: ['La console d’administration permet de consulter les projets des particuliers (coordonnées complètes, y compris la fiche détaillée avec les artisans positionnés), les dossiers partenaires, les documents des artisans et le journal d’audit. Les opérations sensibles demandent de désigner « qui agit ».'],
    questions: ['Engagement de confidentialité et habilitations des personnes ayant accès à la console ; politique de mots de passe ou d’authentification forte pour les administrateurs.', 'Durée de conservation du journal d’audit et information des personnes concernées.'] },
  { n: 27, prio: 'C', isNew: true, title: 'Environnement de test, données de test et bascule en production',
    constat: ['Le site actuel est un environnement de test. La base de données est partagée entre test et production future. Des données de test existent (projets fictifs, comptes de test). Aucune donnée client réelle n’est exploitée avant la bascule ; la bascule chez le client suivra un runbook et n’interviendra qu’après la relecture juridique.'],
    questions: ['Conditions à satisfaire avant l’ouverture au public (liste de contrôle juridique minimale) ?', 'Purge des données de test avant ouverture : à quelle condition, avec quelle trace ?', 'Convient-il de lancer un pilote limité (Yvelines) avec des conditions provisoires, ou d’attendre la version définitive des documents ?'] },
]

const SUMMARY = POINTS.map(p => [String(p.n), p.title, p.prio, p.isNew ? 'Nouveau' : 'Repris'])

const children = []

// Titre
children.push(new Paragraph({ spacing: { after: 60 }, children: [run('BÂTI-AXE', { bold: true, color: ACCENT, size: 22 })] }))
children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Points à valider avec un juriste', font: FONT })] }))
children.push(para('Dossier de relecture juridique — état au 18 novembre 2026', { run: { color: MUTED, size: 22 } }))
children.push(spacer(100))
children.push(box('Avant de lire', [
  para('Ce document liste ce que le produit fait aujourd’hui et les **questions à poser** à un avocat ou à un juriste. Il a été établi par l’équipe produit à partir du code, des gabarits de contrats, du registre RGPD et des échanges avec le dirigeant. **Je ne suis pas juriste** : chaque point est une question, pas une conclusion. Quand un doute subsiste, il est écrit.', { run: { size: 20 } }),
  para('Le site est un **environnement de test**. La relecture juridique est **bloquante pour la bascule en production chez le client, pas pour le développement.** Tant qu’un point reste sans réponse, rien ne doit être déclaré « conforme » dans le produit.', { run: { size: 20 } }),
]))
children.push(spacer(120))

children.push(h1('Comment utiliser ce document'))
children.push(para('Chaque point donne un **constat** (ce que fait le produit), les **questions** à poser et un encadré **Avis / décision du juriste** à compléter. Les points 1 à 15 reprennent la liste du 8 novembre 2026 ; les points 16 à 27 sont nouveaux et viennent des fonctionnalités ajoutées depuis (aperçu des projets aux artisans, pièces jointes, espace « Mes dossiers », e-mails de clôture, abonnement) et d’un contrôle des pages légales.'))
children.push(...bullets(['**Priorité A** : peut bloquer le modèle économique ou l’ouverture au public.', '**Priorité B** : à fixer avant la mise en production.', '**Priorité C** : confort ou amélioration.']))
children.push(spacer(80))

children.push(h1('Synthèse'))
children.push(table(['N°', 'Sujet', 'Priorité', 'Origine'], SUMMARY, [700, 5826, 1000, 1500]))
children.push(spacer(120))
children.push(para(`**Répartition** : ${POINTS.filter(p => p.prio === 'A').length} points en priorité A, ${POINTS.filter(p => p.prio === 'B').length} en B, ${POINTS.filter(p => p.prio === 'C').length} en C.`))

children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('Les points à examiner'))
children.push(h2('Premier ensemble : modèle économique et contrats (points 1 à 15)'))
for (const p of POINTS.filter(p => p.n <= 15)) children.push(...point(p))
children.push(h2('Second ensemble : données, pages légales et fonctionnalités récentes (points 16 à 27)'))
for (const p of POINTS.filter(p => p.n >= 16)) children.push(...point(p))

children.push(h1('Ce qui a déjà été fait côté produit (à relire, pas à valider)'))
children.push(...bullets([
  '**Contrats** : convention cadre artisan, convention cadre partenaire et avenant par lot, en versions numérotées (HTML figé, empreinte SHA-256), avec signature par code e-mail.',
  '**Information du client final** : clause présente dans les trois gabarits (déontologie des architectes, loi Hoguet).',
  '**Clauses** : non-contournement de 24 mois, pénalité de 5 000 € HT, juridiction du siège, droit français.',
  '**Choix de l’artisan par le partenaire**, dépôt du devis signé (PDF, montant HT, attestation horodatée), confirmation ou contestation par l’artisan, échéancier de commission, journal des commissions en ajout seul.',
  '**Masquage serveur** des coordonnées avant déblocage ; aperçu limité à des listes fermées (département, postes de travaux, surface en tranche).',
  '**Espace « Mes dossiers »** pour les partenaires récurrents, avec lien personnel de 24 heures.',
  '**Gabarits à republier en version 2** une fois le nouveau mécanisme validé (point 15).',
]))

children.push(h1('Documents à remettre au juriste'))
children.push(...numbered([
  'Ce document.',
  'Les trois guides d’utilisation (particulier, partenaire, artisan) : ils décrivent les parcours réels, étape par étape.',
  'Les trois gabarits de contrat (rendu HTML) : convention cadre artisan, convention partenaire, avenant par lot.',
  'Le contrat d’apport d’affaires B2B, la charte d’exclusivité B2C et le registre RGPD (dossier `docs/legal/` du dépôt).',
  'Les notes du client du 6 novembre 2026 (modèle hybride, contrat tripartite avec paiement, tunnel de vente de leads).',
  'La note de refonte du choix du partenaire et des devis (8 novembre 2026).',
  'Le brouillon de la page publique « Comment BÂTI-AXE est rémunéré ».',
  'Les pages publiques actuelles : mentions légales, CGU, politique de confidentialité.',
]))

children.push(h1('Questions de cadrage à poser en début de rendez-vous'))
children.push(table(['Question', 'Réponse'], [
  ['Quel périmètre de mission : relecture des conventions seulement, ou aussi CGU/CGV, RGPD et rémunération des partenaires ?', ''],
  ['Quels points sont **bloquants** pour un pilote limité (Yvelines) et lesquels peuvent suivre ?', ''],
  ['Quel statut juridique retenir pour BÂTI-AXE (intermédiaire, apporteur d’affaires, plateforme) ?', ''],
  ['Un pilote avec des conditions provisoires est-il envisageable, ou faut-il tous les documents définitifs ?', ''],
  ['Calendrier et coût estimés de la relecture ?', ''],
], [5626, 3400]))
children.push(spacer(200))
children.push(para('Contact produit : contact@bati-axe.com', { run: { color: MUTED, size: 19 } }))

const doc = new Document({
  creator: 'BÂTI-AXE', title: 'Points à valider avec un juriste — BÂTI-AXE', description: 'Dossier de relecture juridique',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 52, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
      { id: 'Heading1', name: 'heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 4 } } } },
      { id: 'Heading2', name: 'heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: INK }, paragraph: { spacing: { before: 260, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } }, children: [run('BÂTI-AXE', { bold: true, color: ACCENT, size: 17 }), run('\tPoints à valider avec un juriste — 18 novembre 2026', { color: MUTED, size: 17 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Page ', { color: MUTED, size: 17 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, color: MUTED }), run(' / ', { color: MUTED, size: 17 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 17, color: MUTED })] })] }) },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('ok', OUT, buf.length, 'octets,', POINTS.length, 'points') })
