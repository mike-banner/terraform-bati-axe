# Pitfalls Research

**Domain:** B2B tender/RFP broadcast added to an existing B2C-first lead marketplace (multi-party matching, zone-subscription reuse)
**Researched:** 2026-09-04
**Confidence:** MEDIUM — grounded in the project's existing architecture (DirCo triage, `b2b_requests`, zone-subscription packs, ADR-004 masking) and well-documented failure patterns from consumer-lead marketplaces (Angi/HomeAdvisor-style "same lead sold to everyone" trust collapse) and French copropriété/AG mechanics (high-confidence domain knowledge). Low direct case-study coverage of "B2B tender broadcast bolted onto existing B2C marketplace" specifically — this is a narrow enough scenario that most findings are reasoned from adjacent, well-established patterns rather than a single canonical source.

## Critical Pitfalls

### Pitfall 1: Un partenaire non vetté peut spammer toute la zone en un clic

**What goes wrong:**
Le DirCo actuel (05.10) filtre manuellement chaque dossier avant diffusion — c'est un goulot d'étranglement volontaire qui fait aussi office d'anti-spam. En automatisant le matching zone/catégorie, un partenaire peut poster un appel d'offres flou, dupliqué, ou test, et il part instantanément vers tous les artisans matchés de la zone. À l'échelle du pilote (78, poignée de partenaires) l'impact est limité, mais le pattern est le même à 10 partenaires qu'à 100 : rien n'empêche techniquement la sur-sollicitation d'un artisan.

**Why it happens:**
Le passage "tri humain → matching automatique" élimine le point de friction qui servait de filtre qualité implicite, sans qu'un filtre explicite le remplace. C'est une régression fonctionnelle déguisée en simplification.

**How to avoid:**
- Rate-limit au niveau partenaire : X appels d'offres actifs simultanés / Y par semaine, configurable en base (pas codé en dur), avec un seuil bas pour le pilote (ex. 1 AO actif à la fois par défaut, dérogation manuelle admin).
- Rate-limit au niveau artisan récepteur : ne pas notifier un artisan plus de N fois/jour tous partenaires confondus — sinon le premier partenaire "gourmand" pollue la boîte mail de tous les artisans de la zone.
- Garder un filtre de validation minimal côté admin même en mode automatique (ex. AO en statut `pending_review` avant diffusion, avec SLA court — quelques heures, pas le tri complet DirCo d'avant mais un garde-fou anti-abus/anti-doublon).
- Champ obligatoire structuré (catégorie, zone, description, budget) plutôt que texte libre — réduit le bruit et facilite la détection de doublons/spam.

**Warning signs:**
- Un même partenaire poste plusieurs AO quasi identiques en quelques minutes.
- Un artisan reçoit plus de notifications B2B que de leads B2C sur la même période.
- Taux de "AO ignorés/jamais répondus" qui grimpe — signal que le volume dépasse la pertinence perçue.

**Phase to address:**
Phase de lancement du broadcast automatique elle-même (pas une phase ultérieure "on ajoutera le rate-limit si besoin") — le rate-limit doit exister au premier commit qui retire le tri DirCo, sinon la fenêtre de vulnérabilité coïncide exactement avec le lancement.

---

### Pitfall 2: Perte de confiance des artisans en supprimant le filtre humain sans le dire

**What goes wrong:**
Aujourd'hui, un artisan qui reçoit un dossier via DirCo sait (implicitement) qu'un humain a jugé le dossier sérieux avant de le lui envoyer. En basculant vers un matching 100% automatique zone/catégorie, cette caution disparaît silencieusement. Si la qualité des AO reçus baisse (partenaires mal qualifiés, besoins flous, doublons), l'artisan associe la baisse de qualité à la plateforme elle-même, pas au changement de process — et perd confiance dans le canal B2B en bloc, ce qui rejaillit sur la confiance globale dans BÂTI-AXE (l'artisan ne fait pas la distinction fine entre "lead B2C" et "AO B2B partenaire").

**Why it happens:**
Le tri DirCo est un mécanisme de confiance invisible pour l'artisan — le retirer sans communication ni mécanisme de substitution visible (badge de vérification du partenaire, note de fiabilité, historique de conversion) revient à retirer une garantie perçue sans prévenir.

**How to avoid:**
- Rendre visible ce qui remplace le tri humain : badge "partenaire vérifié SIRET" (déjà existant côté artisan via `siretLookup.ts`/badges décennale — réutilisable côté partenaire), historique du partenaire (nb d'AO postés, taux de réponse artisan, éventuellement taux de conversion réel).
- Communiquer le changement de process aux artisans pilotes explicitement ("désormais diffusion automatique zone/catégorie, contrôle qualité maintenu via X") plutôt que de laisser le changement passer inaperçu jusqu'à ce qu'un artisan se plaigne.
- Garder une voie de recours simple : bouton "signaler cet AO" par artisan, visible dès le lancement, qui remonte à l'admin — sinon le seul signal de dégradation qualité est le silence/désabonnement.
- Sur un pilote à poignée de partenaires, envisager un mode hybride au démarrage : matching automatique mais AO du partenaire visible en `pending_review` admin quelques heures avant diffusion effective (cf. Pitfall 1) — ça préserve un filet de sécurité perçu sans revenir au tri manuel complet.

**Warning signs:**
- Artisans qui répondent de moins en moins aux AO B2B au fil des semaines (taux de clic/réponse en baisse continue, pas ponctuelle).
- Retours qualitatifs type "je ne sais plus qui filtre quoi" en entretien pilote.
- Désabonnement zone ou downgrade de pack corrélé à l'activation du broadcast B2B (signe que l'artisan associe la baisse de valeur perçue à ce changement précis).

**Phase to address:**
Phase de conception du matching automatique — le mécanisme de confiance de remplacement (badge, historique, signalement) doit être livré **avec** le retrait du tri DirCo, pas après. Le traiter comme un "nice to have V2" revient à lancer sans filet.

---

### Pitfall 3: Le syndic n'est pas un client comme les autres — décision collective, pas décision individuelle

**What goes wrong:**
Le persona syndic est traité dans le tunnel comme un apporteur d'affaires classique (architecte, agent immo) qui peut décider et signer seul. Or un syndic gère des décisions **collectives** : les travaux significatifs (hors urgence/entretien courant) nécessitent un vote en Assemblée Générale de copropriété, avec des délais de convocation légaux (généralement plusieurs semaines avant l'AG) et des majorités variables selon la nature des travaux (majorité simple, absolue, double majorité selon l'article de la loi de 1965 applicable). Un AO posté par un syndic peut donc représenter :
- un besoin déjà voté et budgété (urgent, mandat clair) → traiter comme un AO normal, délai serré ;
- un besoin "sondage de prix avant AG" (le syndic récolte des devis pour présenter aux copropriétaires, sans garantie que le projet se fasse) → si les artisans matchés ne le savent pas, ils investissent du temps sur du chiffrage qui peut ne jamais se concrétiser, et retiennent de l'expérience "les AO syndic sont du vent".
Sans distinguer ces deux cas, on crée soit de la frustration artisan (devis pour rien), soit un besoin urgent noyé dans le bruit des sondages de prix.

**Why it happens:**
Le tunnel B2B actuel (05.10) traite les 4 personas de façon homogène (architecte/agence/syndic/diagnostiqueur = même form, même flux). C'est cohérent pour capter le lead, mais insuffisant pour le broadcast : les personas n'ont pas la même dynamique de décision en aval, et le syndic est le seul cas de décision collective à échéance légale.

**How to avoid:**
- Ajouter au minimum un champ statut sur l'AO syndic : "besoin voté/mandaté" vs "pré-chiffrage avant AG" — visible par l'artisan avant qu'il n'investisse du temps à répondre.
- Ne pas promettre de délai de réponse artisan agressif sur un AO "avant AG" — le SLA de rappel (héritage du "sous 4h" B2C) n'a pas de sens tant que la copro n'a pas voté.
- Envisager, même en V2 minimal, un champ date d'AG prévisionnelle si connue — permet à l'artisan de comprendre le vrai horizon de décision plutôt que de croire à une urgence immédiate.
- Cas des travaux multi-lots (une copro a souvent besoin de plusieurs corps de métier en même temps — toiture + façade + plomberie communs) : un seul AO syndic peut nécessiter plusieurs catégories d'artisans en parallèle. Vérifier que le matching gère un AO multi-catégorie proprement plutôt que de forcer le syndic à poster un AO par corps de métier (frictionnel) ou de diffuser un AO générique à toutes les catégories (bruit).

**Warning signs:**
- Taux de "AO syndic sans suite" nettement plus élevé que les autres personas (signal que des sondages de prix sont traités comme des besoins fermes).
- Artisans qui se plaignent spécifiquement des AO syndic ("j'ai chiffré et rien ne s'est passé").
- AO syndic mono-catégorie alors que le besoin réel (partie commune) est structurellement multi-lots.

**Phase to address:**
Phase d'exposition du persona syndic dans le tunnel (item explicitement listé dans le scope v2.0) — le champ statut "voté vs sondage" doit être conçu en même temps que l'exposition du persona, pas ajouté après les premiers retours négatifs d'artisans.

---

### Pitfall 4: L'artisan a l'impression d'être "facturé deux fois" pour un accès qu'il ne comprend plus

**What goes wrong:**
L'abonnement zone existant a été vendu/compris par l'artisan comme donnant accès aux chantiers particuliers (`projects` en lecture directe, cf. invariant "marché dynamique"). En réutilisant ce même rail d'accès pour les AO B2B partenaires sans le documenter clairement, deux problèmes distincts peuvent apparaître :
1. **Confusion de périmètre** : l'artisan ne sait pas si son abonnement actuel couvre "en plus" les AO B2B ou si c'est un nouveau produit — et le silence sur ce point est lu comme un signal négatif ("ils rajoutent des trucs sans prévenir").
2. **Perception de valeur inversée** : si le volume d'AO B2B est faible au pilote (poignée de partenaires), l'artisan peut se dire qu'il paie le même prix pour "plus de choses visibles mais pas plus de valeur réelle" — l'inverse de l'effet recherché (montrer que l'abonnement devient plus riche).
Le risque symétrique existe aussi : si demain une commission B2B est introduite (hors scope v2 mais annoncée comme suite logique dans PROJECT.md), l'artisan qui a vu les AO B2B "inclus gratuitement" pendant le pilote peut vivre l'introduction d'une commission comme un bait-and-switch — retirer un avantage acquis est toujours plus mal perçu que ne jamais l'avoir eu.

**Why it happens:**
Le choix produit ("pas de nouveau rail de paiement ce milestone") est une bonne décision technique/business à court terme, mais il est invisible pour l'artisan si la communication ne l'accompagne pas. Le pricing/packaging existant (zones + pricing dégressif, phase 05.16) n'a pas été conçu en pensant à un deuxième type de flux (AO B2B) au moment de sa définition — on lui fait porter une charge supplémentaire après coup.

**How to avoid:**
- Documenter explicitement, dans l'espace artisan (dashboard/notification), que l'abonnement zone couvre désormais deux flux : chantiers particuliers (B2C) ET appels d'offres partenaires (B2B) — un artisan doit pouvoir répondre en une phrase à "qu'est-ce que je paie exactement ?".
- Distinguer visuellement les deux types de sollicitations dans l'UI/les notifications (badge "Chantier particulier" vs "Appel d'offres partenaire") — évite la confusion sur "c'est quoi ce lead" et permet de mesurer séparément l'engagement sur chaque flux.
- Si une commission B2B est un jour introduite (P10, différé), la présenter comme "un nouveau service premium optionnel au-delà de l'abonnement zone", jamais comme la mise à péage d'un flux jusque-là gratuit dans le même abonnement — anticiper ce narratif dès maintenant évite un futur reproche évitable.
- Sur le pilote (poignée de partenaires, faible volume), ne pas survendre le B2B comme argument de rétention de l'abonnement tant que le volume réel n'est pas prouvé — le décalage entre promesse et volume perçu est le principal risque de churn ici.

**Warning signs:**
- Questions artisans type "c'est inclus dans mon abonnement ?" en support/entretien.
- Aucune distinction visuelle B2C/B2B dans les notifications → impossible de mesurer si l'artisan comprend ou ignore le nouveau flux.
- Taux d'ouverture des AO B2B très inférieur au taux d'ouverture des chantiers B2C, sans qu'on sache si c'est un problème de pertinence ou de confusion sur la nature du contenu.

**Phase to address:**
Phase de branchement du matching sur l'abonnement existant — le message de clarification (dashboard/email/notif) doit accompagner la première diffusion, pas être un correctif après coup une fois la confusion remontée en support.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Diffusion 100% automatique sans aucun filtre admin résiduel | Simplicité de build, vraie suppression du goulot DirCo | Spam/AO de mauvaise qualité incontrôlable dès que le nombre de partenaires dépasse la poignée du pilote | Jamais au-delà du pilote — acceptable seulement tant que < 5-10 partenaires actifs et supervision manuelle possible |
| Traiter le syndic comme les autres personas (pas de champ "voté vs sondage") | Un seul formulaire, pas de branche conditionnelle | Artisans qui perdent confiance sur les AO syndic spécifiquement, plus difficile à corriger après coup (mauvaise réputation déjà installée) | Acceptable uniquement si le pilote n'inclut aucun syndic réel au lancement — sinon à traiter dès l'exposition du persona |
| Pas de distinction UI B2C/B2B dans les notifications artisan | Moins de travail front, réutilise les composants existants | Confusion durable sur le périmètre de l'abonnement, difficile à mesurer/débugger a posteriori | Jamais — coût de correction faible maintenant, coût de correction élevé une fois les artisans habitués à un flux non distingué |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Matching zone/catégorie sur `professionals.categories` | Réutiliser tel quel le matching B2C (`projects` → array `categories`) sans vérifier qu'un AO peut nécessiter plusieurs catégories simultanément (cas syndic multi-lots, cf. Pitfall 3) | Vérifier explicitement si le matching supporte un AO à catégories multiples, ou forcer une catégorie principale + tag secondaires plutôt que de silencieusement ne matcher qu'une seule catégorie |
| Abonnement zone existant (`professionals` + packs 05.16) | Ajouter un flag booléen implicite "AO B2B inclus" sans le documenter dans le modèle de données ni l'UI pricing | Modéliser explicitement l'accès B2B comme un attribut visible de l'abonnement (même si gratuit ce milestone), pas un simple effet de bord du matching zone/catégorie |
| Table `b2b_requests` (dossiers apporteurs, 05.10) | Réutiliser telle quelle pour les AO à diffuser, alors qu'elle a été conçue pour un flux "un dossier → équipe commerciale humaine", pas "un AO → N artisans matchés" | Vérifier le modèle de données avant de brancher le broadcast : statut par artisan matché (vu/répondu/ignoré) probablement absent de `b2b_requests` en l'état, à ajouter plutôt que de le simuler côté application |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Notification email synchrone à tous les artisans matchés à chaque AO posté | Latence de post AO qui grimpe avec le nombre d'artisans dans la zone ; pic Resend au moment du post | Passer en file d'attente / traitement asynchrone dès le départ (le pattern email transactionnel existe déjà, phase 06.3) plutôt que d'attendre que le nombre d'artisans par zone grossisse | Pas un problème au volume actuel (78, quelques dizaines d'artisans par catégorie) — mais le corriger a posteriori demande de retoucher un chemin déjà en prod |
| Aucun throttle sur le nombre d'AO actifs affichés/notifiés par artisan | Un artisan avec plusieurs catégories reçoit un volume disproportionné dès que 2-3 partenaires postent le même jour | Grouper les notifications (digest quotidien plutôt qu'un email par AO) dès le lancement plutôt que d'ajouter un digest en urgence une fois les premières plaintes reçues | Se déclenche dès que le pilote dépasse 3-4 partenaires actifs en simultané |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Diffuser l'AO à tous les artisans matchés sans masquage des coordonnées du partenaire avant premier contact/réponse | Contournement de l'invariant ADR-004 (masquage serveur) — le B2B pourrait devenir une porte dérobée pour exposer des coordonnées non filtrées si le code de diffusion AO ne réutilise pas `maskLead.ts` | Appliquer explicitement le même pattern de masquage côté serveur aux AO B2B qu'aux leads B2C, ne pas considérer le B2B comme "hors du périmètre" de l'invariant sous prétexte que c'est un flux différent |
| Endpoint de dépôt AO partenaire sans re-vérification d'identité/statut partenaire à chaque post (juste au moment du tunnel initial) | Un compte partenaire compromis ou un partenaire radié pourrait continuer à broadcaster des AO | Vérifier le statut du partenaire (actif/vérifié) à chaque création d'AO, pas seulement à l'inscription |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| AO B2B et chantiers B2C mélangés dans le même flux/liste sans distinction | L'artisan ne sait plus distinguer un lead particulier d'un AO partenaire, perte de repère sur le type d'engagement attendu (délai, interlocuteur, format de réponse) | Séparer visuellement (onglet, badge, couleur) dès le lancement |
| Pas de moyen pour l'artisan de dire "je ne suis pas intéressé par ce type d'AO" (ex: syndic uniquement, ou architecte uniquement) | Sur-sollicitation perçue, désabonnement | Filtre de préférence par sous-type de partenaire, même simple (checkbox), dès le pilote — évite de devoir le retrofit après plaintes |

## "Looks Done But Isn't" Checklist

- [ ] **Matching automatique zone/catégorie** : fonctionne-t-il aussi pour un AO multi-catégorie (cas syndic partie commune) ou seulement mono-catégorie comme le matching B2C actuel ?
- [ ] **Masquage des coordonnées partenaire** : le chemin de diffusion AO B2B passe-t-il bien par `maskLead.ts` (ADR-004) avant premier contact, ou un nouveau chemin de code a-t-il été écrit en parallèle sans réutiliser le garde-fou existant ?
- [ ] **Rate-limit anti-spam partenaire** : existe-t-il un seuil (même généreux) dès le premier commit qui active le broadcast, ou est-ce noté "à faire si besoin" ?
- [ ] **Distinction B2C/B2B dans l'espace artisan** : un artisan peut-il expliquer en une phrase la différence entre un chantier et un AO dans son tableau de bord, ou tout est-il visuellement identique ?
- [ ] **Persona syndic** : le champ "besoin voté vs sondage de prix" existe-t-il, ou le syndic est-il traité comme un persona générique sans notion de délai de décision collective ?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Spam constaté après lancement (Pitfall 1) | LOW | Ajouter le rate-limit a posteriori est un correctif rapide techniquement — le coût réel est la confiance déjà entamée chez les artisans du pilote, plus long à regagner que le fix lui-même |
| Confusion abonnement (Pitfall 4) déjà installée | MEDIUM | Communication corrective explicite (email + dashboard) expliquant le périmètre réel de l'abonnement ; ne pas attendre la prochaine feature pour clarifier, le faire dès détection |
| Réputation "AO syndic = perte de temps" installée (Pitfall 3) | HIGH | Difficile à défaire une fois que plusieurs artisans ont eu une mauvaise expérience concrète — nécessite probablement une communication ciblée + un premier lot d'AO syndic "voté/garanti" pour reconstruire la confiance, plus lent que la prévention en amont |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Spam/volume non vetté (Pitfall 1) | Phase de retrait du tri DirCo / activation du broadcast automatique | Rate-limit partenaire ET artisan présents et testés avant toute désactivation du tri manuel |
| Perte de confiance transition humain→auto (Pitfall 2) | Même phase que Pitfall 1 | Badge/historique partenaire visible côté artisan + bouton signalement livrés avec le broadcast, pas après |
| Syndic décision collective (Pitfall 3) | Phase d'exposition du persona syndic dans le tunnel | Champ statut "voté vs sondage" présent dans le modèle `b2b_requests`/AO avant tout AO syndic réel envoyé à un artisan |
| Confusion abonnement/double facturation perçue (Pitfall 4) | Phase de branchement du matching sur l'abonnement zone existant | Distinction visuelle B2C/B2B en place dans le dashboard artisan + message explicite sur le périmètre de l'abonnement avant le premier AO diffusé |

## Sources

- Contexte projet : `.planning/PROJECT.md`, `.planning/clients/20260821-ESPACE_PARTENAIRES_APPORTEURS_AFFAIRES-SPEC_CLIENT.md`, phase `05.10-espace-partenaires-apporteurs-affaires` (tunnel B2B existant, table `b2b_requests`, tri DirCo).
- Invariants produit existants : ADR-004 (masquage serveur), phase 05.16 (zones/pricing dégressif), "marché dynamique" (matching `projects`/`categories`).
- Pattern de dégradation qualité en marketplace de leads ouverte vs supply curée (open ad exchange invalid traffic 10-15% vs 2-5% sur supply vérifiée) — [Improvado B2B Programmatic Advertising 2026](https://improvado.io/blog/b2b-programmatic-advertising-strategies), [eMarketer — Share of Leads Disqualified by Sales](https://www.emarketer.com/chart/272609/Share-of-Leads-Disqualified-by-Sales-Due-Poor-Quality-Among-US-B2B-Marketers-April-2025-of-respondents).
- Bonnes pratiques de cadrage tender ("weak specs create compounding pain, confused suppliers, inconsistent bids") — [Sparrowgenie — The Tender Process 2026](https://www.sparrowgenie.com/blog/tender-process).
- Mécanismes AG/copropriété (convocation, majorités, urgence vs travaux votés) : connaissance de domaine du droit français de la copropriété (loi de 1965 et ses décrets d'application) — à valider avec le client/juriste avant implémentation du champ statut syndic, non vérifié via source officielle dans cette recherche (confiance MEDIUM sur ce point précis, le reste du raisonnement en dérive).

---
*Pitfalls research for: B2B tender broadcast bolted onto existing B2C lead marketplace (BÂTI-AXE v2.0)*
*Researched: 2026-09-04*
