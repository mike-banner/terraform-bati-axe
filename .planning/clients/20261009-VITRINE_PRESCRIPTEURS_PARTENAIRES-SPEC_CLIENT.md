# 🚀 Brief Dev — Restructuration Espace Pro & Vitrine Prescripteurs / Partenaires

**Priorité :** Élevée  
**Cible :** Header Navigation + Section `/pro`  

---

## 📌 Problème identifié
Le tunnel partenaire actuel renvoie directement vers un formulaire sans page de présentation de la valeur ("Vitrine"). Les prescripteurs (Agents immobiliers, Architectes, Syndics, Courtiers) n'ont pas de landing page dédiée leur expliquant les fonctionnalités SaaS (Réagenceur 3D, Chiffreur Flash, Comparateur AG) et le modèle d'apport d'affaires.

---

## 🗂️ Architecture de Navigation Recommandée (Header)

Restructurer le menu principal comme suit :

1. **Particuliers** (`/particuliers`) -> Accès aux 3 grands tunnels de projets (Globale, Énergétique, Prestations).
2. **Espace Pro** (`/pro`) -> Subdivisé en 2 Landing Pages distinctes :
   - `/pro/artisans` : Vitrine pour les PME/Artisans BTP (Abonnements SaaS, Bourse aux Leads, Réception de chantiers).
   - `/pro/prescripteurs-partenaires` : Vitrine d'acquisition pour les professionnels de l'immo, de la gestion et du financement.

---

## 📄 Contenu Requis sur la Landing Page `/pro/prescripteurs-partenaires`

La page doit présenter de manière visuelle les 4 piliers d'outils/bénéfices par métier avant d'afficher le CTA vers le tunnel d'inscription :

1. **Section Agents Immobiliers :**
   - *Punchline :* "Débloquez les ventes de vos passoires énergétiques."
   - *Features :* Réagenceur 3D / Home Staging IA, Chiffreur Flash post-visite, Export PDF "Dossier Visite VIP".
2. **Section Syndics de Copropriété :**
   - *Punchline :* "Passez du PPPT au vote des travaux en 1 clic."
   - *Features :* Import PDF PPPT/DPE Collectif, Matrice comparatrice de devis pour AG, Pack de conformité artisans.
3. **Section Architectes & Diagnostiqueurs :**
   - *Punchline :* "Gagnez 5h par semaine sur la gestion terrain."
   - *Features :* Dictaphone IA pour rapports DPE, Planning GANTT avec signature mobile.
4. **Section Courtiers & Financiers :**
   - *Punchline :* "Monétisez et financez le reste à charge de vos clients."
   - *Features :* Réception de leads travaux pré-qualifiés (> 10 000 € reste à charge), Commission d'apport d'affaires sécurisée.

---

## 🔄 Flux de Navigation (User Flow)
`Page Vitrine Prescripteurs (/pro/prescripteurs-partenaires)` 
  └─> Cliquez sur `Rejoindre le réseau` 
        └─> Redirection vers le `Tunnel de Qualification Partenaire` (déjà créé).
