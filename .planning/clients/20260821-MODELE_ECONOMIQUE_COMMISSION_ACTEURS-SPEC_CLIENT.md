# 📄 Cahier des Charges & Synthèse IA Client — Modèle Économique B2B2C, Process de Commission & Acteurs

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Cloisonnement des flux B2C/B2B, process de commission (milestones/SEPA/contrat tripartite), diagnostiqueurs, matrice de monétisation, axes `/espace/profil`
- **Date** : 2026-08-21
- **Auteur / Client** : Hermann Avlessi (Lead PM) — email « process commission + profil + diagnostiqueurs + monétisation »
- **Statut** : **Cadré — à implémenter**, avec ⚠️ **3 conflits à trancher** (commission %, diagnostiqueurs, séquençage Stripe Connect).

---

## 🔀 1. Cloisonnement des Flux (étanchéité B2C / B2B)
- **Flux B2C (Abonnement/Zonage)** = **Push** : alertes SMS/Email/Notification dès qu'un particulier poste dans le département + catégorie du pro.
- **Flux B2B (Projets Archi/Immo)** = **Pull** : catalogue séparé, jamais mélangé au B2C. Un pro B2C **voit** les projets B2B (teasing) mais les infos clés (nom archi, plans, CCTP) sont **verrouillées**.
- **Passerelles payantes** (2 options) :
  - **Option A — Ticket à l'Acte (Pay-per-View)** : 79 € / ticket pour débloquer un dossier et postuler. Filtre les profils sérieux (évite 50 candidatures sur 1 projet).
  - **Option B — Pack Elite/Corporate** : **450 €/mois** = Flux Max B2C **+** accès illimité aux projets B2B (sans ticket). La **commission reste due** (l'abonnement paie le droit de chiffrer, la commission paie le résultat).

---

## 💰 2. Process de Commission (automatisé via Stripe Connect)
```
[Architecte valide l'artisan — « Attribuer le marché »]
   → [App génère un Ordre de Mission / Contrat Tripartite] (signature électronique des 2 côtés)
   → [Facturation du chantier par l'artisan] → [Prélèvement SEPA automatique de la commission]
```
- **Étape 1 — Validation du match** : l'archi clique « Attribuer le marché » → contrat tripartite (artisan ↔ archi ↔ plateforme), validation électronique obligatoire avant de démarrer.
- **Étape 2 — Commission en milestones (jalons)** : alignée sur les encaissements de l'artisan (acompte 30 % → situations 40 % → solde 30 %). Ex : 3 % de 100 k€ = 3 000 €, prélevé 900 € à la signature puis au fil des étapes validées par l'archi.
- **Étape 3 — Prélèvement SEPA** : mandat B2B obligatoire à l'inscription au flux B2B ; l'app débite le compte pro dès validation d'une étape.

### 🛠️ Recadrage PM (⚠️ important pour le séquençage)
> **Ne pas automatiser en phase 1.** Pour les **10 premiers chantiers B2B**, faire le flicage + facturation **à la main** (appeler l'archi, contrat Word, facture Stripe). N'automatiser Stripe Connect/SEPA qu'après avoir validé que les artisans paient réellement. **Priorise l'action et le cash immédiat.**

---

## 🔍 3. Diagnostiqueurs Immobiliers (⚠️ RÉVERSAL — GO)
- **Rôle** : **apporteur d'affaires** (pas un abonné). Premier acteur dans le logement (DPE, amiante, élec), cartographie des faiblesses (élec dangereuse, plomb, passoire F/G), tiers de confiance neutre.
- **Modèle 1 — Apporteur d'affaires (cash)** : accès « Partenaire » gratuit ; au diagnostic avec anomalies → propose de transférer le dossier → devis travaux. **Bati-Axe reverse 15-20 €/lead qualifié**.
- **Modèle 2 — Échange de bons procédés** : agences/archis commandent un diagnostic en 2 clics auprès des diagnostiqueurs partenaires ; en échange, le diag renvoie ses particuliers à travaux.
- **Implémentation `/espace/profil`** : type de compte « Diagnostiqueur » (certification obligatoire + zone d'intervention), bouton **« Déposer un rapport / un projet »** (coordonnées client avec accord + cocher les lots : isolation, électricité…).
- **⚠️ vs spec Arti-Box §3** : le « rejeté (niche) » concernait les **outils IA dictaphone/fiche** (US-DIA-01/02, toujours différés). Le **diagnostiqueur comme apporteur** passe en **GO** → P19.

---

## 🧭 4. Matrice Finale des Flux & Monétisation

| Acteur | Rôle | Accès leads | Comment Bati-Axe gagne |
| :--- | :--- | :--- | :--- |
| Particulier (B2C) | Source de projets | Gratuit | matière première du réseau |
| Diagnostiqueur | Apporteur leads (DPE) | Gratuit | reverse **15-20 €/lead** |
| Agent immobilier | Apporteur leads (ventes) | Gratuit | reverse **50 €/acheteur qui dépose un projet** |
| Architecte | Concepteur / prescripteur | Gratuit | apporte ses projets B2B → commission artisans |
| Artisan / Ingénieur | Exécutant | **PAYANT** | abonnement (B2C) + commission (B2B) |

> **Règle marketplace** : celui qui a/amène le client ne paie jamais ; celui qui exécute et encaisse paie pour acquérir son client.

---

## 🖥️ 5. Axes `/espace/profil` (vs Houzz / Hello Artisans) — fait/restant

| Axe | Statut | Référence |
| :--- | :--- | :--- |
| Badge SIRET synchrone (API Insee, « Société Vérifiée ») | ✅ fait | Phase 5 + 05.8 |
| Jauge crédit/abonnement + bouton « Upgrader » | ⚠️ partiel | `/espace/premium` |
| Portfolio par projets (avant/après, budget, SEO local) | ✅ fait | Phase 5.5 |
| Cloisonnement profils B2C vs B2B (certifs vs avis) | ⚠️ partiel | profil public non dynamique par type |
| Tunnel traitement leads (statut en 1 clic) | ✅ fait | CRM Minimaliste 4.5-08 |
| « Mes chantiers partagés » + déclencheur commission | ❌ nouveau | → B2B (P10/P11) |
| Onboarding express (SIRET + catégorie + département) | ✅ fait | claim |
| Avis certifiés (non modifiables + droit de réponse) | ❌ | Phase 7 |
| Mobile First absolu | ⚠️ partiel | P9 |

---

## ✅ 6. Conflits tranchés (résolus 2026-08-21)
1. ✅ **Commission %** : **(a) commission artisan B2B = grille dégressive par volume** (référence cahier §4.3 : 8 % ≤25 k€ → 2,5 % >200 k€ ; variante Majors 5→2-3 % à harmoniser pour P22) ; **(b) rétrocession apporteur = 3-5 %** (sous déontologie Art. 27, cf. §8).
2. ✅ **Diagnostiqueur** : apporteur d'affaires = GO (P19) ; l'outil dictaphone = différé.
3. ✅ **Séquençage Stripe Connect** : **manuel pour les 10 premiers chantiers** → P10/P11 non prioritaires en phase 1.

---

## 📋 7. Rattachement ROADMAP
- **Ticket à l'acte + Pack Elite** → **P20** (avec P7/P8).
- **Diagnostiqueurs apporteurs** → **P19**.
- **« Mes chantiers partagés » + contrat tripartite + commission milestones/SEPA** → **P10/P11** (différés tant que manuel).
- **Avis certifiés** → **Phase 7** ; **Mobile QA** → **P9**.

---

## ⚖️ 8. Déontologie & Rétrocession Légale (archis)
⚠️ **Article 27 décret n°80-217** : interdiction formelle des commissions masquées pour les **archis DPLG/DE** (Ordre des Architectes). 3 options légales :
- **Option A — Transparence tripartite** : le client est informé + **accord écrit** ; la rétrocession est contractualisée (« coordination de la mise en relation / préparation du dossier technique »).
- **Option B — Fonds de Concours (remise client)** : la part est reversée **en remise au client** (2-3 % sur le devis), pas à l'archi → l'archi valorise son dossier, reste conforme.
- **Option C — Co-courtage (archis d'intérieur / décorateurs, hors Ordre)** : rétrocession directe classique par facture de prestation.
- **Ascenseur (sans cash)** : échange de leads (Bâti Axe envoie ses clients B2C → archi partenaire).
- **Ciblage** : rétrocession directe pour archis d'intérieur/décorateurs/paysagistes ; **remise partenaire ou ascenseur** pour archis DPLG/ingénieurs.
