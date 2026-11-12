# ADR-014: Qualifications en catalogue fermé et suppression de la restitution B2B

- **Statut** : Accepté
- **Date** : 2026-11-12

## Contexte
Le workflow « DirCo » (05.10-08) laissait le chargé d'affaires saisir les qualifications en texte libre et choisir 3 sous-traitants, présentés au partenaire par e-mail (« restitution »). Les qualifications n'avaient aucun effet hors de cet e-mail. Or le partenaire voit déjà les artisans qui se positionnent sur l'AO, et choisit lui-même (05.23).

## Décisions
1. **La restitution et les sous-traitants recommandés sont supprimés** : redondants avec le flux de candidature, et un choix orienté par BÂTI-AXE (qui perçoit la commission) prête au soupçon de favoritisme. Le choix de l'artisan appartient au partenaire.
2. **Les qualifications requises forment un catalogue fermé** (`app/utils/qualifications.ts`), validé par Zod à l'intake et au PATCH admin, affiché aux artisans sur l'AO avant le claim (donnée non identifiante, ADR-004 inchangé).
3. **« Donneur d'ordres » et « partenaire » sont un seul rôle** dans le modèle ; on dit « partenaire ».
4. Colonne `b2b_requests.recommended_pros` supprimée (migration `20261111000000`). La valeur d'audit `b2b_restitution_sent` est conservée pour l'historique.

## Conséquences
- Une exigence hors catalogue passe par la description ou les notes ; ajouter une qualification = modifier le catalogue (une seule source, TS partagé client/serveur).
- Les qualifications **ne filtrent pas** l'accès à l'AO : le matching reste `proMatchesProject` / `canAccessLead` (ADR-011). Les brancher est une décision séparée.
- Complète ADR-011 et 05.23 sans les modifier.
