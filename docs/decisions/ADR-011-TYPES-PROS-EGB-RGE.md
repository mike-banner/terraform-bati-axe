# ADR-011: Types de professionnels, validation des Entreprises Générales et qualification RGE

- **Statut** : Accepté
- **Date** : 2026-10-10 (décisions du 2026-09-15 et du 2026-10-09)

## Contexte
Le marché dynamique (phase 4.6) filtrait les chantiers sur les seules catégories d'un pro. La phase 05.19 introduit une arborescence de postes de travaux et deux profils d'entreprises, et la rénovation énergétique exige une qualification (RGE) et une assurance adaptée.

## Décisions
1. **Deux types de pros** (`professionals.professional_type`) : `specialiste` (1 à 2 métiers) et `entreprise_generale` (« Entreprise Générale du Bâtiment », EGB : plusieurs métiers, jusqu'à 9). Il n'existe pas de cas « reçoit tout » : l'EGB est matchée par recouvrement comme un spécialiste.
2. **9 catégories** (source unique `PROFESSIONAL_CATEGORIES`) : maçonnerie, toiture, électricité, plomberie, peinture, isolation, carrelage, menuiserie, rénovation énergétique. Un métier ajouté plus tard n'est **jamais** ajouté automatiquement (couverture décennale) : bandeau « Nouveau métier disponible », confirmation explicite.
3. **Une EGB doit être approuvée par un admin** (`egb_status`: none/pending/approved/rejected) avant toute réception de chantier ; le code NAF (41.20A, 41.20B, 43.99C) n'est qu'un indice affiché, jamais une décision automatique.
4. **Qualification RGE : un seul statut oui/non** (`rge_status` none/valid/expired), pour tous les pros. Il est dérivé d'un justificatif `rge` (date d'expiration obligatoire) validé par un admin. Les postes énergétiques (`ENERGY_ITEMS`) ne sont visibles, notifiés et débloquables que pour un pro `rge_status = valid` **et** décennale valide (`canDoEnergy`). Pas de RGE par domaine, pas de gestion de sous-traitance (une EGB sans RGE cherche son sous-traitant).
5. **Postes réservés aux EGB** (pompe à chaleur, géothermie, photovoltaïque, démolition, assainissement) : correspondance `egbMatches` vers les catégories (à valider par le client). Un projet mixte reste visible en entier pour un pro retenu par un autre poste.
6. **Règle unique** : liste, e-mails, détail et déblocage utilisent `proMatchesProject` / `canAccessLead`.

## Conséquences
- Le client doit valider la correspondance `egbMatches` et le périmètre RGE.
- `decennal_status` ne passe pas automatiquement à « expiré » : la règle RGE peut s'appuyer sur une décennale échue (dette connue).
