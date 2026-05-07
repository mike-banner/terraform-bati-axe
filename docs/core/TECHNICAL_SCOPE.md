# 📋 SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES

## 1. Module de Capture (Simulateur Astro)
### Étapes du Tunnel :
1. **Nature du Projet** : Sélection par icônes (Gros œuvre, Rénovation, Extension, etc.).
2. **Détails Techniques** : Questions dynamiques selon le choix 1.
3. **Localisation** : Code postal (Focus 78).
4. **Budget Estimé** : Tranches de prix (Essentiel pour le SMS Teasing).
5. **Délai Souhaité** : Immédiat, 3 mois, 6 mois.
6. **Coordonnées** : Nom, Email, Téléphone (Données qui seront floutées).

---

## 2. Le Verrou (Logique de Floutage)
### Mécanisme technique :
- **API Response** : Si l'utilisateur n'est pas `PRO_PREMIUM`, le backend remplace les champs sensibles par `***`.
- **Champs floutés** :
    - `customer_full_name`
    - `customer_phone`
    - `customer_email`
    - `exact_address` (Seule la ville reste visible).

---

## 3. Système de "Revendication" (Claim)
### Pour les 7 000 profils importés :
- Un pro arrive sur sa page `/pro/macon-poissy-jean-dupont`.
- Il voit un bouton **"C'est mon profil : le revendiquer"**.
- Processus :
    1. Création de compte Auth.
    2. Upload de la pièce d'identité + Kbis.
    3. Upload de la décennale.
    4. Passage du profil en `verified: true` après validation admin.

---

## 4. Notifications SMS (Teasing)
### Structure du message :
> "BÂTI-AXE : Nouveau projet de Rénovation à Carrières-sous-Poissy ! Budget estimé : 45 000€. Déjà 2 pros sur le coup. Accédez au lead : https://app.batiaxe.fr/l/[id]"

### Logique d'envoi :
- Le SMS est envoyé instantanément aux pros `PREMIUM` de la zone.
- Le SMS est envoyé avec un délai de 30 min aux pros `BASIC` pour inciter à l'upgrade.

---

## 5. Administration (Back-office)
- **Validation Documents** : Interface pour visualiser les PDF sur R2 et valider d'un clic.
- **Modération Leads** : Supprimer les faux leads avant envoi aux pros.
- **Analytics** : Taux d'ouverture des SMS vs Taux de clic.
