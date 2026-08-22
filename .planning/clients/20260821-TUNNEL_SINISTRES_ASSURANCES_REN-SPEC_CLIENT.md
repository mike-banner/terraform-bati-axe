# 📄 Cahier des Charges & Synthèse IA Client — Tunnel Sinistres & Assurances (REN)

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Marché REN (Réparation En Nature), tunnel sinistre/assurance dédié, devis aux normes assureurs, positionnement Contractant Général
- **Date** : 2026-08-21
- **Auteur / Client** : Hermann Avlessi (Lead PM)
- **Statut** : **Cadré — à implémenter** (3ᵉ flux, distinct du tunnel apporteurs 05.10). → P21.

---

## 🎯 1. Marché REN (Réparation En Nature) & Deux Portes d'Entrée
Marché captif, financé (l'assurance paie), le client ne discute pas le devis.
- **Porte principale — Plateformes de gestion de sinistres (tiers payant)** : IMH (Inter Mutuelles Habitat), Saretec, Texa, Multiassistance. → inscription entreprise agréée, volume de chantiers, **mais grilles tarifaires basses**.
- **Porte dérobée (la plus rentable) — Experts d'assurance locaux** : l'expert mandate le devis ; en relation directe, il oriente le sinistré vers Bâti Axe (« leur devis passera crème »). On reste sur **nos prix marché**.

---

## 🔴 2. Tunnel Sinistre / Assurance (parcours dédié, pas le tunnel apporteurs)
- **Entrée accueil** : bouton rouge « **Déclarer un Sinistre / Réparation Assurance** ».
1. **Étape 1 — Urgence majeure** : « logement inhabitable / risque d'aggravation » (bouton urgence → appel direct / rappel **< 2h**) vs « sinistre stabilisé, je cherche un devis assurance ».
2. **Étape 2 — Infos assurances** : déroulant assureur (AXA, GMF, Allianz, Maif, Generali, Autre…), n° de sinistre (optionnel), « rapport d'expert déjà disponible ? Oui/Non ».
3. **Étape 3 — Dépôt de preuves** : glisser-déposer mobile (photos des dégâts) + compte-rendu d'expert / lettre de l'assureur.
4. **Étape 4 — SLA spécial assurance** : « Dossier Sinistre priorisé. Devis conforme aux normes de chiffrage des assurances sous **48h ouvrées**. »

---

## 🧱 3. Arguments Massue (pour closer assureurs & experts)
1. **Maîtrise des prix du marché (bordereaux de prix)** : les assureurs chiffrent via Sedgwick/Sia. Devis Bâti Axe **structuré comme leurs rapports** (Démolition / Évacuation / Fourniture / Pose, unités m²/m³) → validé en 30 s sans négociation.
2. **« Chantier en un seul interlocuteur »** : positionnement **Entreprise Générale / Contractant Général** (maçon + élec + plaquiste + peintre, un seul devis global) → on coordonne tout de A à Z.
3. **Réassurance Décennale + RGE visible** : attestations ultra-visibles ; un assureur ne confie jamais un dossier à une décennale floue/périmée.

---

## 🧭 4. Réseau de Prescripteurs B2B2C (vision complète)
- **Architectes / Ingénieurs** → projets à forte valeur esthétique/technique.
- **Agents Immo / Syndics** → récurrence (transactions, copro).
- **Assureurs / Experts** → chantiers d'urgence / reconstruction post-sinistre, budget garanti par la compagnie.

---

## 🧭 5. Fait / Restant (vérification 2026-08-21)

| Élément | Statut | Rattachement |
| :--- | :--- | :--- |
| Tunnel sinistre 4 étapes + bouton rouge | ❌ nouveau | P21 |
| Partenariat plateformes (IMH/Saretec/Texa/Multiassistance) | ❌ (business) | P21 |
| Relation experts locaux (porte dérobée) | ❌ (business) | P21 |
| Devis normes assurance (bordereaux Sedgwick/Sia) | ❌ | P21 |
| Positionnement Contractant Général (1 interlocuteur) | ❌ (scope) | P21 |
| Décennale + RGE visibles | ⚠️ partiel (badges Phase 5) | Phase 5 + P21 |

---

## 📋 6. Rattachement ROADMAP
- **3ᵉ flux** (en plus du B2C particulier et du B2B apporteurs) : le **flux Sinistre** (B2C urgent + assureurs/experts comme apporteurs).
- Étend **Phase 05.10** (un tunnel de plus) + s'appuie sur **Phase 05.11** (décennale/RGE vérifiés pour la réassurance).
- Le « Contractant Général » implique une coordination multi-lots → à cadrer en phase dédiée (pas un simple formulaire).
