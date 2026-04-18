
## Audit détaillé — Espace admin "Utilisateurs & Sécurité"

### Périmètre (4 onglets, ~2 700 LOC)

| Onglet | Fichier | LOC | Hooks | État |
|---|---|---|---|---|
| Utilisateurs | `AdminUsers.tsx` + dossier `users/` (6 sous-comp.) | 354 + ~900 | `useUserManagement`, `useUserFiltering`, `useBulkUserActions`, `useAdminUserStatistics`, `useUserActivity`, `useAdminNotes` | OK fonctionnel, plusieurs frictions |
| Rôles | `AdminUserRolesEnhanced.tsx` | 663 monolithique | direct supabase | Doublons avec `AdminUsers`, surface large |
| Permissions | `AdminPermissions.tsx` + `usePermissions` | 187 + 137 | `usePermissions` | Fonctionne (51 perms, matrice OK) |
| Détection Fraude | `AdminFraudDetection.tsx` | 559 | direct | OK mais isolé |

État BD : 3 profiles, 1 admin / 2 user, 0 notes, 0 activity_logs, 53 fraud_attempts (10 critiques, 21 high).

---

### A. Sécurité RLS (P0 — bloquant)

1. **`profiles` SELECT/UPDATE excluent les super_admin** — politiques `Admins can view/update all profiles` utilisent `get_current_user_role() = 'admin'` (string). `get_current_user_role()` retourne *un seul* rôle ; un super_admin sans rôle 'admin' associé ne peut ni lister ni bloquer les utilisateurs. Pareil pour `fraud_attempts` SELECT. Doit utiliser `has_any_role(auth.uid(), ARRAY['admin','super_admin'])`.
2. **PII non masquée** dans `AdminUsers` export CSV et `topUsers` analytics (audit précédent) — emails bruts. Conserver brut côté admin authentifié OK, mais l'export CSV devrait être tracé dans `audit_logs` (`pii_export`).
3. **`AdminUserRolesEnhanced.fetchAllUsers`** charge `profiles` sans pagination → fuite progressive d'emails côté front à mesure que la base grandit ; aucun masquage. Ajouter recherche server-side + limite.

### B. Bugs & incohérences (P0/P1)

4. **Doublon Rôles vs Utilisateurs** — onglet "Rôles" duplique l'attribution de rôles déjà gérée dans `UserDetailsDialog` ; deux sources d'historique (`audit_logs WHERE table_name='user_roles'` côté Rôles, `useUserActivity` côté Utilisateurs).
5. **Hiérarchie de tri incorrecte** dans `AdminUserRolesEnhanced.tsx:599` — l'ordre local omet `notaire/geometre/urbaniste` (fallback `99`) → mauvais "rôle dominant" affiché. Doit utiliser `getHighestRole` de `src/constants/roles.ts`.
6. **Filtre rôle dans `AdminUsers`** — le sélecteur omet `notaire/geometre/urbaniste` (lignes 184-197) ; impossible de filtrer ces 3 rôles métier officiels.
7. **`useUserManagement.fetchUsers`** charge tous les profils sans pagination ni tri serveur (limit Supabase 1000) ; à 1 001 utilisateurs, données silencieusement tronquées.
8. **`removeRole` super_admin** : `window.prompt('CONFIRMER')` bloquant et accessible aussi à un admin (qui ne peut pas supprimer super_admin par RLS) → toast d'erreur muet ensuite. Doit être désactivé côté UI si non super_admin.
9. **`AdminFraudDetection.fetchData`** : 1 000 fraud_attempts chargés sans pagination serveur, puis JOIN local sur contributions → coût O(n) côté client.
10. **`stats.detection_rate`** dans Fraude = `usersWithStrikes / totalAttempts × 100` — formule métier incorrecte (mélange utilisateurs et tentatives) → toujours faux.
11. **Realtime subscribe** dans `AdminUsers` se ré-abonne à chaque changement de référence `fetchUsers` (dépendance inutile) → reconnexions cycliques au websocket.
12. **`UserStatsDisplay`** appelle `refetch(start, end)` mais `useAdminUserStatistics` cache 2 min ne tient pas compte des dates → stats périodiques peuvent être stales.

### C. UX & fonctionnel (P1)

13. Pas de **vue agrégée "Sécurité"** : fraude, blocages, audit role-changes, échecs login (auth_logs) sont éclatés dans 3 onglets. Manque un hub.
14. **Aucun lien** entre Détection Fraude et `UserDetailsDialog` (bouton "Voir profil" absent côté Fraude).
15. **Pas de filtre par sévérité ni par date** sur fraud_attempts.
16. **`AdminUserNotes` et `AdminUserActivity`** existent mais ne sont **pas montés** dans `UserDetailsDialog` — composants orphelins (cf. doc `VERIFICATION_GESTION_UTILISATEURS.md`).
17. **Aucune** détection des **comptes inactifs** (last_sign_in via auth.users ou `user_activity_logs`). Pas de bouton "Désactiver inactifs > 90 j".
18. **Permissions**: pas d'effet visible pour l'utilisateur final — la matrice modifie `role_permissions` mais aucune partie de l'app n'appelle `user_has_permission` (test rapide à confirmer). Risque "permissions cosmétiques".
19. **2FA admin absent** : `UserAccountSecurity` affiche "Bientôt disponible" — admin/super_admin sans 2FA est un risque P0 produit (à signaler comme dette).
20. **Pas d'export CSV** dans Rôles ni Permissions.
21. **Bulk add_role** propose `partner` comme défaut, mais aucun garde-fou contre l'attribution massive de rôles métier sensibles (notaire, geometre).

### D. Architecture & dette (P2)

22. `AdminUserRolesEnhanced.tsx` 663 lignes monolithique → extraire `RoleHierarchyGrid`, `RoleAssignForm`, `RoleHistoryDialog`, `UserRolesList` (≤ 150 lignes chacun).
23. `AdminFraudDetection.tsx` 559 lignes : extraire `FraudStats`, `SuspiciousUsersTable`, `FraudAttemptsTable`.
24. Trois définitions locales de `roleConfig` (Users, Roles, Permissions) → centraliser dans `src/constants/roles.ts` (étendre avec icon/color/description).
25. Pas de typage strict des retours `audit_logs` (`as any` dans 4 endroits).
26. Pas de **tests** sur `useBulkUserActions`, ni protection idempotence (re-cliquer "Exécuter" peut doubler les notifications).

---

### Plan d'action proposé

**Lot 1 — P0 sécurité & correctness (~2 migrations + 5 fichiers)**
- Migration : remplacer politiques `profiles` (SELECT/UPDATE all) et `fraud_attempts` SELECT par `has_any_role(auth.uid(), ARRAY['admin','super_admin'])`.
- Audit log automatique sur export CSV utilisateurs (RPC `log_pii_export`).
- `useUserManagement` : pagination serveur (`range`), tri serveur, exclusion `is_blocked` filtrable côté requête.
- `AdminUserRolesEnhanced` : utiliser `getHighestRole`, ajouter notaire/geometre/urbaniste au filtre `AdminUsers`.
- Désactiver bouton retirer super_admin pour non super_admin (UI + RLS déjà OK).

**Lot 2 — P1 UX & cohérence (~6 fichiers)**
- Monter `AdminUserNotes` + `AdminUserActivity` comme onglets dans `UserDetailsDialog`.
- Bouton "Voir profil" dans `AdminFraudDetection` ouvrant `UserDetailsDialog`.
- Filtres sévérité + date dans Fraude, pagination serveur.
- Corriger formule `detection_rate` (= blocked / usersWithStrikes).
- Hub "Sécurité" : nouvel onglet `AdminSecurityHub` agrégeant alertes fraude high/critical, blocages 7 j, modifications de rôle 7 j, échecs login auth_logs.
- Cache `useAdminUserStatistics` clé sur (userId, start, end).

**Lot 3 — P2 architecture & dette (~7 fichiers)**
- Découpe `AdminUserRolesEnhanced` → 4 fichiers ≤ 150 LOC.
- Découpe `AdminFraudDetection` → 3 fichiers.
- Centraliser `roleConfig` dans `src/constants/roles.ts` (ajouter icon/color/description).
- Implémenter `useUserPermissions` + appliquer `user_has_permission` dans 2 zones critiques (export CSV PII, suppression notes) pour rendre la matrice opérationnelle.
- Détection inactifs : RPC `get_inactive_users(threshold_days)` + action "Désactiver inactifs".
- Documenter dette 2FA admin dans memory `security/2fa-admin-debt-fr`.

---

### Quel périmètre dois-je implémenter ?

- **(A) Lot 1 seul** — corrige RLS super_admin, pagination profils, hiérarchie rôles, audit PII. Rapide, débloquant.
- **(B) Lots 1 + 2** — + monte notes/activity orphelins, hub Sécurité, lien fraude→profil, filtres.
- **(C) Plan complet 1+2+3** — + découpe composants, centralisation `roleConfig`, permissions opérationnelles, détection inactifs.
