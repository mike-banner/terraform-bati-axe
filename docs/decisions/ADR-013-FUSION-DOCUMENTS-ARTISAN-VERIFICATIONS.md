# ADR-013: `verifications` est l'unique modèle de justificatifs des pros (fusion de `documents_artisan`)

- **Statut** : Accepté
- **Date** : 2026-11-06

## Contexte
La phase 05.11 avait créé `documents_artisan` (Kbis / URSSAF / décennale) à côté de `verifications`, sans trancher entre étendre l'une ou remplacer l'autre. Aucun code n'a jamais écrit dans `documents_artisan` : table vide, vue admin vide, alertes décennale J-30/J-7 (06.3) qui lisaient cette table sans jamais rien envoyer. `verifications` est le seul modèle alimenté (upload R2, revue admin, triggers de garde, ADR-012).

## Décisions
1. `verifications` porte tous les justificatifs : `document_type` ∈ `kbis | decennale | rge | urssaf`. Ajouts : `issued_on` (date d'édition du Kbis), `alert_j30_sent_at` / `alert_j7_sent_at`. Une échéance est obligatoire pour l'URSSAF (CHECK), comme pour la RGE.
2. `documents_artisan`, ses enums, sa fonction d'expiration et la vue admin « Documents légaux » sont supprimés (migration `20261106000000`, refusée si la table contient des lignes).
3. **Verrou sous-traitance** (spec client « appels d'offres publics ») : `is_available_subcontracting` ne peut passer à `true` que si le dernier justificatif approuvé de chaque type est valide : Kbis édité il y a moins de 3 mois, décennale et URSSAF non échues, RGE valide si le pro déclare la rénovation énergétique. Règle unique dans `app/utils/subcontractingGate.ts`, appliquée par `PATCH /pro/profile/me` (422 + liste des pièces manquantes) et par le dashboard. Le job `sync-subcontracting` (horaire) coupe ensuite la capacité si une pièce devient invalide (miroir SQL de la règle).
4. La règle « Kbis < 3 mois » ne concerne **que** ce verrou : `is_verified` n'en dépend pas.
5. Devoir de vigilance : un justificatif approuvé dont `reviewed_at` a plus de 6 mois est signalé « à re-contrôler » ; le re-contrôle ré-approuve le justificatif sans toucher à son échéance.
6. `activities_subscribed` (activités couvertes par la décennale) est abandonné : à rajouter avec l'API de conformité (Once/Provigis), prévue en V2.

## Conséquences
- Règle dupliquée TS/SQL (verrou) : à garder alignée.
- Les pros dont le Kbis n'a pas de `issued_on` (dépôts antérieurs, ou dépôt direct par l'admin) ne sont pas éligibles tant qu'un Kbis daté n'est pas déposé.
- Complète ADR-012 (écritures serveur, RLS lecture seule) sans le modifier.
