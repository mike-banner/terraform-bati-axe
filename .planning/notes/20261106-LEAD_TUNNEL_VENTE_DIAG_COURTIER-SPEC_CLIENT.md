# 📄 Note — Tunnel de capture de leads multi-acheteurs (artisan / vendeur / diagnostiqueur / courtier)

> **Statut : NOTE, non planifiée.** Rangée le 2026-11-06 sur demande de Mike. Aucune ligne de code écrite.
> Nom conforme à la règle `YYYYMMDD-[SUJET]-SPEC_CLIENT.md` (CLAUDE.md projet). Gabarit : `.planning/templates/`.

## 📌 Metadata
- **Projet** : BÂTI-AXE
- **Sujet** : monétiser le simulateur d'aides en revendant des leads qualifiés à 4 types d'acheteurs
- **Date de réception** : 2026-11-06
- **Auteur / Client** : demande client transmise par Mike (le texte d'origine est un brainstorming IA : trois échanges successifs, repris en annexe)
- **Outil IA** : non précisé (annexe A)
- **Document voisin** : une note d'analyse d'Antigravity (`~/.gemini/antigravity-ide/brain/…/lead_tunnel_spec.md`, hors dépôt) résume cette demande ; ses erreurs sont listées en §5.

---

## 🎯 1. Ce que demande le client
Faire du simulateur un « tunnel de lead » qui qualifie le propriétaire, puis classe le contact et le revend :

| Lead | Déclencheur | Acheteur | Valeur annoncée (non vérifiée) |
|---|---|---|---|
| ARTISAN | DPE A à D, objectif habiter/louer | réseau RGE (existant) | 15–30 € |
| DIAGNOSTIQUEUR | DPE absent, ancien (avant juillet 2021) ou « je ne sais pas » + besoin (aides, vente, location) | diagnostiqueur certifié | 20–40 € |
| ARBITRAGE | DPE F/G, objectif « évaluer avant travaux ou vente », pas de volonté de vendre explicite | bilan « valeur verte » | 30–50 € |
| VENDEUR | DPE F/G + intention de vendre (Q5 ou Q6) | agent / mandataire immo | 80–150 € |
| COURTIER | besoin de financement (éco-PTZ, prêt relais, achat-revente) | courtier en crédit | 30–60 € |

**Parcours en 4 étapes** (détail et libellés exacts en annexe A) : (1) bien : type, surface, classe DPE, statut du DPE ; (2) intention : occupation, objectif principal, motif du DPE ; (3) arbitrage travaux vs revente : réaction face au reste à charge, valeur du bien, financement ; (4) adresse, coordonnées, consentements.

**Page de résultat** : bloc « bilan énergie » (aides, reste à charge), bloc « opportunité immobilière » (décote, valeur en l'état / rénovée, conseil, CTA expert immo), encadré « incertitude sur votre DPE » avec case de commande de DPE pré-cochée.

---

## 🔗 1 bis. Recouvrement avec le suivi existant (à lire en premier)
**Cette demande étend la Phase 13 « Data Immo & Lead Vendeur DPE »** (ROADMAP + `REQUIREMENTS.md`, 0 plan écrit, dépend de 05.9), déjà validée côté client :
- **déjà prévu** : objectif du projet (IMMO-01), question d'arbitrage « vendre en l'état » pour le vendeur DPE F/G (IMMO-02), consentement RGPD d'avis de valeur par un agent partenaire + restitution hybride reste à charge / plus-value (IMMO-03), **moteur d'estimation DVF Open Data Notaires** (IMMO-DVF-01). Cela couvre les filières VENDEUR et ARBITRAGE, y compris la source de la valorisation.
- **nouveau dans cette demande** : classe et statut du DPE, type de bien, surface, occupation ; la filière **DIAGNOSTIQUEUR** ; la filière **COURTIER** (= **P6 / US-PAR-02**, déjà au backlog, ❌ absent) ; le scoring multi-acheteurs ; l'encadré « incertitude sur votre DPE ».
- **voisin, indépendant** : Phase 14 (sous-tuiles par catégorie, « projets complémentaires », SMS OTP) agit sur le même simulateur ; la coordination des deux est à prévoir à la planification.

---

## 🔍 2. État du code au 2026-11-06 (vérifié)
- Simulateur : `app/pages/simulateur.vue`, tunnel en 6 étapes (catégorie, postes, fork aides, lead wall). **Aucun champ DPE, surface, occupation ni objectif de vente** n'existe aujourd'hui (grep « DPE » : 0 résultat dans les composants du simulateur).
- Stockage : table `projects` (nom, e-mail, téléphone, catégorie, description, budget, code postal, `location`). **Pas de colonne DPE/surface/occupation.** La table `leads` n'existe qu'au déblocage par un pro (Phase 4.6) : y écrire des leads « de capture », comme le propose la note d'Antigravity, casse cet invariant.
- Consentements : table `consents` (lecture seule côté pro, écriture serveur). Pas de consentement par type de destinataire.
- Aides : proxy `/api/v1/aides-reno` + route `/calculateur-aides` (05.9) donnent déjà aides et reste à charge ; « compléments DPE/parcours » sont marqués *Deferred* dans `clients/STATUS_SPECS_CLIENT.md`.
- Diagnostiqueurs : profil partenaire déjà accepté dans le tunnel B2B (05.17). **Il n'existe aucun flux d'envoi de leads vers un diagnostiqueur, un agent ou un courtier.**
- Courtier : `US-PAR-02` / **P6** = « ❌ absent ». Outil diagnostiqueur `US-DIA-01/02` = « écarté » dans le suivi des specs.
- Estimation immobilière (valeur en l'état / après travaux, décote de 12 %) : aucun code aujourd'hui ; la source prévue est le DVF Open Data Notaires (IMMO-DVF-01, Phase 13).

---

## ⚠️ 3. Points à trancher / risques avant de planifier
1. **Chiffres inventés.** Les prix de leads (15 à 150 €), la conversion (8–12 %), la part de vendeurs (10–15 %), la décote de 12 % et les exemples 240 000 € / 285 000 € viennent d'une conversation IA, sans source. À ne jamais afficher tels quels : toute « valeur estimée » doit sortir du moteur DVF (IMMO-DVF-01) avec ses mentions légales, sinon c'est une promesse trompeuse.
2. **Aucun acheteur n'est contracté.** Sans agents, diagnostiqueurs et courtiers partenaires, un lead « vendeur » n'a personne à qui aller. Le modèle économique n'est validé par aucun contrat.
3. **Consentements.** Deux cases ne suffisent pas : transmettre le contact à un tiers de chaque catégorie demande un consentement explicite et distinct par catégorie de destinataire, avec identification du destinataire. Le texte « partenaire immobilier local » est trop vague. Aucun envoi ne doit partir sans cette base. *À valider par le conseil juridique du client.*
4. **Courtier en crédit.** Le courtage et l'intermédiation en crédit sont réglementés (immatriculation, rémunération d'apporteur). Je n'en suis pas sûr à 100 % : point à faire confirmer avant toute mise en relation ou rémunération.
5. **Positionnement.** Le lead vendeur est déjà voulu par le client (Phase 13). Restent deux points à confirmer : (a) le recentrage v1 sur le B2C simple (2026-08-30) — Phase 13 est hors v1 ; (b) la filière diagnostiqueur : `US-DIA-01/02` (outil diagnostiqueur) est « écarté » ; ici il s'agit seulement de leur envoyer des demandes de DPE, ce qui est différent mais à faire confirmer.
6. **Tension de produit.** Pousser « vendez plutôt que rénover » dans un site d'artisans RGE entre en conflit avec l'intérêt des artisans abonnés qui paient pour recevoir des chantiers.

---

## 🧭 4. QUAND la faire (recommandation)

**Pas maintenant.** Ordre proposé :

| Étape | Condition | Contenu | Rattachement |
|---|---|---|---|
| **0 — Prérequis** | Phase 05.21 close (recette de Mike), puis 05.20 et 06.4 | rien de ce document | en cours |
| **1 — Collecte de la donnée, sans revente** | après la Phase 10 (DNS/e-mail `bati-axe.com`) et un pilote 78 avec du trafic réel ; **à planifier avec la Phase 14** (même simulateur) | classe et statut DPE, type de bien, surface, occupation, objectif (IMMO-01) : colonnes sur `projects` (migration, `maxlength`/CHECK, règle input du projet). Profite tout de suite aux leads artisans | **Phase 13, premier plan** |
| **2 — Vendeur / arbitrage** | accord du client sur le hors-v1, moteur DVF, mentions légales de l'estimation, consentement par destinataire validé, 1 agent ou réseau partenaire | IMMO-02, IMMO-03, IMMO-DVF-01, restitution hybride | **Phase 13** (existante) |
| **3 — Diagnostiqueur** | 1 diagnostiqueur partenaire signé (profil 05.17 déjà en base) + consentement dédié | lead « besoin de DPE » + encadré « incertitude DPE » | **à ajouter à Phase 13** ou nouvelle phase (décision du client) |
| **4 — Courtier** | statut réglementaire confirmé + 1 courtier partenaire | CTA « étude de financement » après le reste à charge | **P6 / US-PAR-02** |

Chaque étape passe par `/gsd-discuss-phase` puis un plan ; rien n'est planifié tant que le client n'a pas répondu à §3.1 (chiffres), §3.3 (consentements) et §3.5 (périmètre). Contrairement à ce que j'avais d'abord écrit, le vendeur n'est **pas** « en dernier » par risque produit : il est déjà au backlog en Phase 13 ; c'est le consentement par destinataire et l'estimation qui conditionnent son démarrage.

**Estimation « 2 semaines dev + 1 semaine QA + 3 jours docs » de la note d'Antigravity : non retenue** (non étayée par une lecture du code). À rechiffrer par étape.

---

## 🧱 5. Erreurs de la note d'Antigravity à ne pas reprendre
- « Nuxt 3 » : le projet est en Nuxt 4 (ADR-008).
- Persister dans `leads` : à proscrire, utiliser `projects` (invariant Phase 4.6).
- Migration dans `schema/20231106_add_lead_tunnel.sql` : les migrations sont dans `supabase/migrations/`, horodatées.
- Gabarits `email/lead_*.html` : les e-mails passent par `renderEmail` (`server/utils/emailLayout`) et `sendEmail`.
- « Sous-phase de 05.10 » : 05.10 est close ; le bon rattachement est la Phase 13 (existante) et P6.
- Page `app/pages/simulateur/lead-tunnel.vue` : le simulateur existe déjà (`simulateur.vue`, 6 étapes) ; il faut l'étendre, pas le dupliquer.
- Oubli : la Phase 13 déjà prévue (IMMO-01/02/03, DVF), les consentements par destinataire, les acheteurs contractés.

---

## 📎 Annexe A — Texte reçu (verbatim)

### A.1 Tunnel vendeur

Pour transformer un simple curieux qui calcule ses aides en un lead vendeur qualifié et monétisable auprès d'un agent immobilier, la mécanique du tunnel doit être chirurgicale.

Si tu demandes direct "Voulez-vous vendre ?", la personne va se braquer ou quitter le site. L'objectif est de lui faire prendre conscience progressivement du coût/effort des travaux pour amener l'option de la revente comme une solution naturelle.

Voici le tunnel étape par étape, avec les questions exactes à poser et la logique de scoring derrière.

**1. Étape 1 : Qualification du bien (L'amorce)** — Données techniques de base - Aucun engagement perçu.
L'utilisateur pense qu'il remplit un formulaire standard de prime énergie. Tu ne parles pas encore de vente.

1. Quel est le type de bien concerné ? — [ ] Maison individuelle · [ ] Appartement
2. Quelle est la surface habitable approximative (m²) ? — (Champ numérique)
3. Quelle est la classe DPE actuelle du logement ? — [ ] A / B / C (Lead rénovation classique) · [ ] D / E (Zone neutre) · [ ] F / G - Passoire thermique (Lead à très haut potentiel d'arbitrage / revente) · [ ] Je ne sais pas

**2. Étape 2 : L'intention réelle (Le pivot stratégique)** — Identification de la posture du propriétaire. C'est ici que tu découvres le profil exact de l'utilisateur.

4. Quelle est la situation d'occupation de ce logement ? — [ ] Ma résidence principale · [ ] Un bien mis en location (Résidence secondaire / Investissement) (Très fort risque de revente si DPE F/G à cause des interdictions de louer)
5. Quel est votre objectif principal avec cette simulation ? — [ ] Réduire mes factures d'énergie / Améliorer mon confort · [ ] Mettre aux normes pour continuer à louer · [ ] Évaluer la faisabilité financière avant d'engager des travaux ou de VENDRE le bien

**3. Étape 3 : Le test d'arbitrage Travaux vs Revente** — Créer le déclic psychologique chez le propriétaire. Tu positionnes la revente comme un choix rationnel face aux contraintes du chantier.

6. Si le reste à charge (après aides) pour atteindre une bonne note DPE s'avère élevé, quelle serait votre réaction ? — [ ] Je réaliserai les travaux progressivement · [ ] J'abandonnerai le projet de rénovation · [ ] J'envisagerai de vendre le bien en l'état (sans réaliser les travaux)
7. Avez-vous déjà une idée de la valeur actuelle de votre bien sur le marché ? — [ ] Oui, parfaitement · [ ] Non, pas précisément · [ ] Je souhaite connaître sa valeur actuelle vs sa valeur après travaux

**4. Étape 4 : La capture de coordonnées et Consentement RGPD** — Verrouillage juridique et qualification géographique. Pour débloquer son rapport détaillé d'aides + l'analyse d'arbitrage, l'utilisateur doit laisser ses coordonnées.

- Adresse du bien : Rue, Code Postal, Ville (Indispensable pour l'attribution géographique de la donnée)
- Coordonnées : Prénom, Nom, Téléphone, Email
- Opt-in RGPD personnalisé (Obligatoire) :
  - [x] Case à cocher : "J'accepte de recevoir mon bilan d'aides énergétiques."
  - [x] Case à cocher spécifique (Optionnelle ou conditionnelle) : "Je souhaite recevoir l'estimation de valeur de mon bien (en l'état vs rénové) par notre partenaire immobilier local."

**La logique d'Aiguillage (Scoring & Valorisation de la Data)** — une fois la simulation validée, le backend classe le lead :

```
                              [ Entrée du Lead ]
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
            DPE A, B, C ou D                      DPE F ou G
       (Objectif : Habiter/Louer)           (Passoire Thermique)
                    │                                     │
                    ▼                                     ▼
              [ LEAD ARTISAN ]                Réponse Q5 ou Q6 = "Vendre"
          Vente à un réseau RGE                            │
          (Valeur : 15€ - 30€)            ┌────────────────┴────────────────┐
                                          ▼                                 ▼
                                        OUI                                NON
                                         │                                  │
                                         ▼                                  ▼
                                [ LEAD VENDEUR PUR ]              [ LEAD ARBITRAGE ]
                                Vente à un agent local             Proposer un bilan
                               (Valeur : 80€ - 150€)              Valeur Verte / Immo
                                                                  (Valeur : 30€ - 50€)
```

**Page de résultats (le hook d'engagement)** — deux blocs :

- Le bilan Énergie : « Estimation de vos aides (MaPrimeRénov' + CEE) : 12 500 € sur un projet global de 38 000 €. Reste à charge estimé : 25 500 €. »
- Le bilan Opportunité Immobilier (l'amorce pour l'agent immo) : « Analyse d'arbitrage immobilier : Dans votre secteur, la décote moyenne d'un bien DPE F/G est de 12%. Valeur estimée en l'état (Passoire) : 240 000 € · Valeur estimée après rénovation (DPE C) : 285 000 €. Le conseil de l'expert : Compte tenu du reste à charge (25 500 €) et de la durée moyenne du chantier (4 mois), la revente en l'état à un investisseur ou un acheteur prêt à faire les travaux peut être financièrement plus avantageuse. » — [ Bouton CTA : Mettre en relation avec notre expert immo partenaire ]

**Résumé des chiffres clés pour le Business Model**
- Conversion globale du tunnel : viser 8 à 12 % de complétion entre la première étape et la saisie du téléphone.
- Proportion de leads vendeurs : sur un simulateur d'énergie, environ 10 à 15 % des répondants propriétaires de passoires thermiques (F/G) cochent la case « envisage de vendre ».
- Prix de revente : un lead qualifié « propriétaire d'une passoire F/G souhaitant vendre sans faire les travaux » se négocie facilement entre 80 € et 150 € auprès d'un mandataire indépendant (SAFTI, IAD) ou d'une agence de quartier, car le taux de transformation en mandat exclusif y est très élevé.

### A.2 Prompt : « Rajoute un tunnel pour capter du lead pour le diagnostiqueur également »

Ajouter le diagnostiqueur immobilier dans la boucle est un coup stratégique parfait. Le diagnostic (DPE) est le premier acte obligatoire avant toute mise en vente ou location, et avant même d'engager des travaux d'ampleur. C'est l'élément déclencheur en amont de toute la chaîne.

**1. Les nouvelles questions à injecter dans le tunnel** — 2 questions ciblées à l'étape du bien et du projet.

*Étape A : Statut du DPE actuel* (en étape 1, juste après le type de bien et la surface) — Où en êtes-vous avec le Diagnostic de Performance Énergétique (DPE) de votre bien ?
- [ ] J'ai un DPE valide de moins de 3 ans
- [ ] Mon DPE est ancien ou expiré (réalisé avant juillet 2021) (Lead Diagnostiqueur très chaud)
- [ ] Je n'ai jamais réalisé de DPE officiel (Lead Diagnostiqueur pur)
- [ ] Je ne sais pas

*Étape B : Déclencheur du Diagnostic* (si pas de DPE récent, en étape 2) — Pour quelle raison devez-vous réaliser ou mettre à jour votre DPE ?
- [ ] Obtenir mes aides financières à la rénovation (Audit / DPE obligatoire pour MaPrimeRénov')
- [ ] Mettre en vente mon bien prochainement
- [ ] Mettre en location mon bien
- [ ] Simple curiosité / Bilan personnel

**2. Tri automatique et triple monétisation** : projet travaux (DPE valide) → LEAD ARTISAN/RGE (15–30 €) ; DPE expiré/inexistant → LEAD DIAGNOSTIQUEUR (20–40 €) ; projet de vente explicite (DPE F/G + option vente) → LEAD AGENT IMMO (80–150 €).

**3. Vente du lead au diagnostiqueur** : un pack de diagnostics complet (DPE, amiante, plomb, électricité, termites) coûte entre 200 € et 500 € au propriétaire. Type de lead : demande de réalisation de DPE / pack diag. Prix de revente : 20 à 40 € l'unité (environ 10 % de la prestation). Argument : clients au moment exact du besoin, avant qu'ils ne passent par une agence.

**4. Hook de la page de résultats** — encadré d'alerte réglementaire :
« ⚠️ Incertitude sur votre DPE : sans DPE officiel réalisé après juillet 2021, le montant de vos aides MaPrimeRénov' ne peut pas être garanti par l'État, et votre bien ne peut pas être mis en vente/location. Option recommandée : [ ] Commander un DPE officiel / Bilan diag auprès d'un partenaire certifié près de chez vous. (Bouton pré-coché) »

**Impact annoncé** : meilleur taux de monétisation (même sans travaux ni vente, le DPE reste utile) ; double vente possible (agent immo 120 € + diagnostiqueur 25 €) soit environ 100 à 190 € par utilisateur qualifié.

### A.3 Prompt : « t'as pas oublié le courtier »

Le courtier en prêt immobilier (ou courtier en éco-prêt) est la pièce manquante : il débloque le financement du reste à charge des travaux ou du futur achat de celui qui vend.

**1. Deux profils de leads**
- Lead « Éco-PTZ / reste à charge travaux » : le propriétaire a 25 000 € de reste à charge sans trésorerie ; besoin d'un éco-PTZ ou d'un prêt travaux lissé sur son crédit actuel.
- Lead « Prêt relais / achat-revente » : le propriétaire vend sa passoire F/G pour racheter ; besoin d'un crédit immobilier global + prêt relais.

**2. Question à injecter** (étape du bilan financier, avant la saisie des coordonnées) — Comment comptez-vous financer le reste à charge de vos travaux ou votre futur projet immobilier ?
- [ ] Épargne personnelle disponible
- [ ] Besoin d'un financement / Éco-PTZ (Prêt à taux zéro)
- [ ] Besoin d'un montage financier pour revendre et racheter un bien
- [ ] Je ne sais pas encore

**3. Matrice finale — 4 acheteurs sur 1 formulaire** : besoin de travaux → LEAD ARTISAN/RGE (15–30 €) ; besoin de diagnostic → LEAD DIAGNOSTIQUEUR (20–40 €) ; projet de vente → LEAD AGENT IMMO (80–150 €) ; besoin de financement → LEAD COURTIER (30–60 €).

**4. Valeur du lead courtier** : personnes en recherche active de financement avec un patrimoine immobilier en garantie ; revente du contact qualifié 30 à 60 € (ou partenariat au pourcentage / apporteur d'affaires si la réglementation de la banque le permet).

**Exemple « super lead »** : propriétaire d'un bien DPE F, 30 000 € de travaux, préfère vendre, pas de DPE récent, besoin d'un prêt relais → revente (en conformité RGPD) à l'agent immo (100 €), au diagnostiqueur (30 €), au courtier (45 €) : 175 € pour un seul utilisateur. Hypothèse annoncée : 50 à 100 « super leads » par mois.
