# CONTEXT.md : Phase 5 (Espace Client & Messagerie)

## Décisions d'Implémentation

### 1. Base de données (`messages`)
- **Structure simple :** La table `messages` est liée directement au `lead_id` (qui fait le pont unique entre un `project_id` et un `pro_id`).
- **Auteur :** Utilisation d'une simple colonne booléenne `is_pro_sender` (true = Pro, false = Client). 

### 2. Expérience Pro (Responsive Messagerie)
- **Desktop :** Le chat est intégré directement en bas de la fiche détaillée du lead (`/espace/leads/[id]`). Zéro clic supplémentaire.
- **Mobile :** Ajout d'un onglet "Messages" (`/espace/messages`) dans la navigation du bas. Cet onglet liste les "cartes projets" pour lesquels une discussion a été entamée. Sur la fiche d'un lead, un bouton "Envoyer un message" redirige vers cette interface dédiée.

### 3. "Le Verrou Concurrentiel" (Protection anti-spam / Garantie Premium)
- **Le Problème :** Un lead payant où l'on est en concurrence avec 10 autres pros perd toute sa valeur. Le client finit harcelé et déçu.
- **La Décision (Cap à 3) :** Un projet ne peut être débloqué que par **3 artisans maximum**. Dès que le 3ème artisan débloque les coordonnées (via Premium ou lead gratuit), le projet disparaît du dashboard "Marché local" pour tous les autres pros.
- **Espace Client :** Le particulier ne verra donc au maximum que 3 conversations. S'il ne signe avec aucun d'entre eux, il aura un bouton "Je n'ai pas trouvé mon bonheur : relancer ma recherche" dans son espace, ce qui remettra le projet sur le marché pour 3 nouveaux pros.

## Mocks & Notifications
- Pas de Twilio/Resend dans cette phase. 
- Les liens Magic Link et les alertes de nouveaux messages sont loggués dans le terminal Node (via `console.log`) pour simuler le comportement du provider d'email final.

---
*Fin de l'analyse. Prêt pour la planification.*
