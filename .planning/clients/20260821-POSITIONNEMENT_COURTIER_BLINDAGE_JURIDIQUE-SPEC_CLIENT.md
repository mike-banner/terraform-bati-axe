# 📄 Cahier des Charges & Synthèse IA Client — Positionnement Courtier & Blindage Juridique (Plateforme B2B)

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Positionnement « Hub des Artisans Certifiés » (courtier / tiers de confiance), tunnel par type de lot, blindage juridique, modèle 2 piliers + tarifs
- **Date** : 2026-08-21
- **Auteur / Client** : Hermann Avlessi (Lead PM) — 2 emails consolides (analyse tarifs + positionnement courtier)
- **Statut** : **Cadré — à implémenter** (positionnement/copy, blindage juridique, tunnel sinistres). Pricing → P7/P17.

---

## 🎯 1. Positionnement : « Le Hub des Artisans Certifiés »
- **On ne dit plus** « Nous réalisons vos travaux » → **on dit** : « Nous sélectionnons, certifions et connectons les meilleurs artisans du bâtiment pour vos projets. »
- **Rôle** : courtier / tiers de confiance digitalisé haut de gamme — **zéro risque opérationnel** (pas d'ouvrier à payer, pas de décennale BTP à souscrire, pas d'engin à louer).
- **Valeur vendue** : SÉCURITÉ + GAIN DE TEMPS (artisans déjà vérifiés solvabilité + assurances).
- **Analogie** : « l'Uber / Doctolib de la rénovation haut de gamme et technique pour les professionnels ».

---

## 🔀 2. Tunnel par Apporteur d'Affaires (Version Plateforme)
1. **Étape 1 — Qualification du prescripteur** : « Je suis un Professionnel (Archi, Agent Immo, Syndic, Expert) » + bénéfice : « Accédez à notre réseau d'artisans audités (décennales vérifiées, santé financière validée). »
2. **Étape 2 — Niveau de Risque / Type de Lot** (routage chirurgical) :
   - **Gros Œuvre / Structure** (ingénieurs/archis → maçons décennale spécifique).
   - **Second Œuvre / Finitions** (agents immo/décorateurs).
   - **Dépannage / Sinistre** (syndics/assureurs → artisans locaux **sous astreinte**).
3. **Étape 3 — Dépôt du Dossier Technique** : bouton massif « Déposer le dossier de consultation » (plans, CCTP, photos sinistre). Promesse : « sélection de l'artisan idéal sous 48h. »

---

## 🛡️ 3. Blindage Juridique de la Plateforme
1. **Acceptation CGU dans le tunnel (case obligatoire)** : « En validant, vous acceptez que Bâti Axe agisse exclusivement en qualité de courtier/intermédiaire et que la responsabilité civile/décennale soit portée uniquement par l'artisan sélectionné. »
2. **Double vérification automatisée** : bloquer automatiquement les artisans du réseau dont la **décennale expire le mois en cours** → n'envoyer jamais un artisan non assuré (sinon la plateforme meurt commercialement, surtout auprès des experts assurance).
3. **Transparence de rémunération** : soit l'apporteur dépose gratuitement et l'artisan paie une commission (**5-10 % du montant des travaux**) s'il signe ; soit vente du lead (Hello Artisan) — mais sur le haut de gamme, **le pourcentage au succès est plus attractif des deux côtés**.
4. **Anti-contournement « Saut de Puce »** : contrat d'apport d'affaires signé **avant** envoi du dossier ; clause interdisant la contractualisation directe pendant **12-24 mois** sous peine de pénalités + exclusion définitive ; l'apporteur (archi/agent) = **allié** qui confirme la signature du devis → déclenche la facturation.

---

## 🚨 4. Cas spécifique des Assureurs / Sinistres
- L'expert dépose le **rapport de sinistre** → la plateforme matche avec l'**électricien/plombier disponible le plus proche** → l'artisan contractualise directement avec l'assuré/assurance → Bâti Axe prend sa **commission au passage** (matching + flux sécurisé).
- Les assureurs adorent : la plateforme gère le « bruit de fond » (paperasse + recherche d'artisans).

---

## 💰 5. Modèle 2 Piliers & Tarifs (consolidé avec l'analyse tarifs)
```
SITE BÂTI AXE
├── FLUX B2C (particuliers) → Tunnel de qualification → ABONNEMENT MENSUEL FIXE (MRR Stripe)
│      - Basic : 150-200 €/mois (5-10 leads exclusifs)
│      - Premium : 300 €/mois (« flux total »)
│      - Exclusivité = Département + MÉTIER (ex. « Plomberie dans le 78 »)
│      - Clause anti-piège « illimité » : si > 40 leads/mois × 3 mois → palier supérieur
└── FLUX B2B (apporteurs) → Dépôt de plans → COMMISSION AU SUCCÈS (5-10 %)
       - Zéro risque pour l'artisan ; jackpot sur les gros volumes (8 % sur 100 k€ = 8 000 €)
```

---

## 🧭 6. Fait / Restant (vérification 2026-08-21)

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Copy « Hub des Artisans Certifiés » / courtier | ❌ | Phase 05.10 (landing) |
| Tunnel par type de lot (Gros œuvre / Second œuvre / Sinistre) | ⚠️ partiel (05.10 n'a pas la dimension « lot/risque ») | Phase 05.10 (à étendre) |
| Cas sinistres / assureurs (matching + astreinte) | ❌ nouveau | Phase 05.10 (extension) |
| CGU clause courtier (case obligatoire) | ❌ | Légal (CGU) + Phase 05.10 |
| Blocage auto décennale expirante | ❌ (couvert par 05.11) | Phase 05.11 |
| Commission au succès 5-10 % | 📝 doc only | P10 |
| Anti-contournement (contrat apport + clause 12-24 mois) | ❌ | Légal + P10/P11 |
| Tarifs Basic 150-200 € / Premium 300 € | ❌ | P7 |
| Exclusivité Département + Métier | ❌ | P7 |
| Clause anti-illimité (40 leads × 3 mois) | ❌ | P8 (jauge déjà prévue) |
| Modèle 2 piliers (MRR + commission) | 📝 doc | P17 |

---

## 📋 7. Rattachement ROADMAP
- **Positionnement + tunnel par lot + sinistres** → **Phase 05.10** (Espace Partenaires) — à enrichir (nouvelle étape « type de lot/risque » + flux sinistre).
- **Blindage juridique (CGU courtier)** → CGU + tunnel 05.10 (case obligatoire) ; **blocage décennale** → **Phase 05.11** (déjà prévue).
- **Commission 5-10 %** → **P10** ; **tarifs + exclusivité métier** → **P7** ; **anti-illimité** → **P8** ; **2 piliers** → **P17**.
