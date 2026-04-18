
Plan d'achèvement Lot 2 + Lot 3 — Utilisateurs & Sécurité.

## Lot 2 — UX & cohérence

1. **Monter notes/activité dans `UserDetailsDialog`** — ajouter 2 onglets (`Notes`, `Activité`) qui rendent `AdminUserNotes` et `AdminUserActivity` (composants déjà existants mais orphelins).
2. **Lien fraude → profil** — bouton "Voir profil" dans `AdminFraudDetection` qui ouvre `UserDetailsDialog` sur le `user_id` cliqué.
3. **Filtres fraude** — sélecteurs `severity` (low/medium/high/critical) + plage de dates + pagination serveur (`range`) dans `AdminFraudDetection`.
4. **Correction formule `detection_rate`** = `blocked_users / users_with_strikes × 100` (au lieu de `usersWithStrikes / totalAttempts`).
5. **Hub Sécurité** — nouveau composant `AdminSecurityHub.tsx` agrégeant : fraude high/critical 7 j, blocages 7 j, modifications de rôle 7 j (depuis `audit_logs`), top utilisateurs à risque. Ajouté comme onglet dans la section admin Utilisateurs & Sécurité.
6. **Cache stats par dates** — clé `useAdminUserStatistics` = `(userId, start, end)` au lieu de `userId` seul.

## Lot 3 — Architecture & dette

7. **Découpe `AdminFraudDetection.tsx`** (559 LOC) → `FraudStats.tsx`, `SuspiciousUsersTable.tsx`, `FraudAttemptsTable.tsx` (≤ 200 LOC chacun).
8. **Permissions opérationnelles** — nouveau hook `useUserPermissions(resource, action)` qui appelle RPC `user_has_permission`. Appliqué à 2 zones critiques :
   - Bouton "Exporter CSV" dans `AdminUsers` (perm `users.export_pii`).
   - Bouton "Supprimer" dans `AdminUserNotes` (perm `notes.delete`).
   Migration : insérer ces 2 permissions dans `permissions` + lier à `super_admin`/`admin` dans `role_permissions`.
9. **Détection inactifs** — RPC `get_inactive_users(threshold_days)` (déjà créée au Lot 1). Ajouter un panneau `InactiveUsersPanel.tsx` dans le Hub Sécurité avec bouton "Bloquer sélection".
10. **Mémoire dette 2FA** — créer `mem://security/2fa-admin-debt-fr` documentant l'absence 2FA admin/super_admin comme risque produit.

## Fichiers

**Migrations** (1) : insertion permissions `users.export_pii` + `notes.delete` + `role_permissions` super_admin/admin.

**Créés** (~9) :
- `src/components/admin/security/AdminSecurityHub.tsx`
- `src/components/admin/security/InactiveUsersPanel.tsx`
- `src/components/admin/fraud/FraudStats.tsx`
- `src/components/admin/fraud/SuspiciousUsersTable.tsx`
- `src/components/admin/fraud/FraudAttemptsTable.tsx`
- `src/hooks/useUserPermissions.ts`
- `mem://security/2fa-admin-debt-fr.md`
- (mise à jour `mem://index.md`)

**Édités** (~6) :
- `src/components/admin/users/UserDetailsDialog.tsx` (onglets Notes + Activité)
- `src/components/admin/AdminFraudDetection.tsx` (refactor + filtres + lien profil + formule)
- `src/components/admin/AdminUsers.tsx` (gate export CSV par permission)
- `src/components/admin/AdminUserNotes.tsx` (gate suppression par permission)
- `src/hooks/useAdminUserStatistics.tsx` (clé cache datée)
- `src/pages/Admin.tsx` ou équivalent (montage onglet Hub Sécurité)

## Notes
- Commencer par fix build (déjà fait au tour précédent — vérifier qu'il n'y a pas d'autre import cassé après refactor `roleConfig`).
- Pas de breaking change RLS — Lot 1 déjà appliqué.
- Toutes les requêtes paginées utilisent `.range()` + `count: 'exact'`.
