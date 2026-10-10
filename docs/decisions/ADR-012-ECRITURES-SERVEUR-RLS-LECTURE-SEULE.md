# ADR-012: Écritures serveur uniquement et RLS en lecture seule pour les tables de confiance

- **Statut** : Accepté
- **Date** : 2026-10-10

## Contexte
La politique `manage_own_professional` (`FOR ALL`) permettait à un pro de modifier sa propre ligne depuis le navigateur, donc de s'auto-valider (`is_verified`, `subscription_status`, `egb_status`) ; la politique `manage_own_verifications` lui permettait d'approuver ses propres justificatifs.

## Décisions
1. `professionals` : le jeton d'un utilisateur n'a que `SELECT` sur sa propre ligne (`select_own_professional`). Toute écriture passe par Nitro en **service role**, bornée à `user.id`.
2. `verifications` : un non-admin ne peut déposer qu'une ligne `pending` ; il ne modifie ni statut, ni dates, ni type (trigger `trg_guard_verification_review_fields`). La console admin écrit depuis le navigateur avec un jeton portant `app_metadata.role = 'admin'`.
3. Les états dérivés (`rge_status`) sont calculés par trigger SQL (`SECURITY DEFINER`, fonctions non exécutables par `anon`/`authenticated`), jamais par le code applicatif.
4. Un `UPDATE` bloqué par la RLS ne renvoie aucune erreur : chaque écriture serveur vérifie qu'une ligne a été modifiée (404 sinon) et possède un test de non-régression.

## Incident à l'origine de la règle 4
Après la migration `20260918`, `PATCH /api/v1/pro/profile/me` (écriture avec le jeton du pro) répondait 200 sans rien enregistrer. Corrigé le 2026-10-10 (hotfix `e9f0762`, test `tests/unit/profile-patch-service-role.test.ts`).

## Conséquences
- Tout nouvel endpoint qui écrit sur `professionals` ou `verifications` utilise le service role.
- Autres politiques `FOR ALL` à auditer : `completed_projects`, `consents`.
