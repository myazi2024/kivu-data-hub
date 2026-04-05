

# Audit du bloc "Utilisateurs & Securite"

Le bloc comprend 4 onglets : Utilisateurs, Roles, Permissions, Detection Fraude. Voici les resultats de l'audit.

---

## Points positifs

1. **Trigger de protection** : `protect_profile_sensitive_fields` empeche les non-admins de modifier `role`, `is_blocked`, `fraud_strikes` — bien implemente avec `SECURITY DEFINER`
2. **Fonctions SQL securisees** : `has_role()` et `has_any_role()` avec `search_path = public`
3. **Cache de profil** (5 min) dans `useAuth` et cache de stats (2 min) dans `useAdminUserStatistics`
4. **Audit trail** : trigger automatique sur changement de `is_blocked`
5. **Protection super_admin** : verification avant blocage (simple et en masse)
6. **Pagination** : presente sur les 3 listes (utilisateurs, fraudes, utilisateurs suspects)
7. **Debounce** sur la recherche utilisateurs
8. **Export CSV** sur les deux vues (utilisateurs et fraudes)
9. **Real-time** : listener Supabase sur la table `profiles` pour rafraichir la liste

---

## Problemes identifies

### P1 — Securite

**1. Hierarchie de roles incoherente entre useAuth et useUserManagement**
- `useAuth.tsx` ligne 75 : `['super_admin', 'admin', 'partner', 'user']` — manque `expert_immobilier`, `mortgage_officer`, `notaire`, `geometre`, `urbaniste`
- `useUserManagement.tsx` ligne 20 : `['super_admin', 'admin', 'expert_immobilier', 'mortgage_officer', 'partner', 'user']` — manque `notaire`, `geometre`, `urbaniste`
- **Impact** : Un notaire/geometre/urbaniste sera vu comme simple `user` dans l'auth et dans la liste admin. Un expert_immobilier sera vu comme `user` dans l'auth (ProtectedRoute pourrait le bloquer a tort).

**2. ProtectedRoute ne connait que 4 roles**
- Ligne 8 : `requiredRoles?: Array<'super_admin' | 'admin' | 'partner' | 'user'>` — les roles metier sont absents du type
- Un expert_immobilier ou notaire ne pourra jamais passer un `requiredRoles` check meme si l'intention est de l'autoriser

**3. BulkActionsDialog permet d'ajouter le role `admin` en masse**
- Ligne 119 de `BulkActionsDialog.tsx` : `<SelectItem value="admin">Administrateur</SelectItem>` — n'importe quel admin peut s'octroyer des super-pouvoirs en creant d'autres admins en masse. Il manque une verification `super_admin` requise pour attribuer le role `admin`.

**4. AdminFraudDetection : blocage/deblocage sans verification de role**
- `handleBlockUser` (ligne 129) ne verifie pas si la cible est admin/super_admin avant de la bloquer
- Contrairement a `useUserManagement.blockUser` qui a cette verification

**5. UserDetailsDialog.getRoleBadge manque les roles metier**
- Ligne 140-147 : `notaire`, `geometre`, `urbaniste` absents — afficheront "Utilisateur" par defaut

### P2 — Bugs fonctionnels

**6. Limit 500 sur fraud_attempts sans avertissement**
- Ligne 72 de `AdminFraudDetection.tsx` : `.limit(500)` — si plus de 500 tentatives, les stats seront fausses et l'utilisateur ne le saura pas

**7. Pagination inconsistante sur les seuils d'affichage**
- Fraud attempts : pagination visible si `> 20` (ligne 525)
- Suspicious users : pagination visible si `> 10` (ligne 407)
- Users : pagination visible si `totalPages > 1` (ligne 331)
- Devrait etre uniforme

**8. `useAdminUserStatistics` ne se declenche pas automatiquement**
- Le hook ne fait pas de `useEffect` pour appeler `fetchStatistics` — il faut que le parent appelle `refetch()` manuellement. Dans `UserDetailsDialog`, c'est bien fait (ligne 47), mais c'est fragile.

**9. AdminUsers : real-time listener trop agressif**
- Chaque modification de n'importe quel profil (meme le sien) declenche un `fetchUsers()` complet. Avec beaucoup d'utilisateurs, cela provoque des rechargements inutiles.

### P3 — UX

**10. BulkActionsDialog : pas de roles metier**
- Le select ne propose pas `notaire`, `geometre`, `urbaniste` — impossible de les attribuer en masse

**11. Pas de confirmation avant export CSV**
- L'export telecharge immediatement sans avertissement — les donnees sensibles (emails, raisons de blocage) sont exportees sans friction

**12. AdminPermissions : pas de verification d'acces admin**
- Contrairement a `AdminUserRolesEnhanced` qui verifie `has_role` dans un `useEffect`, `AdminPermissions` ne verifie rien — elle compte sur le routing mais un appel direct pourrait exposer la matrice de permissions

---

## Plan de corrections

### Phase 1 — Securite (prioritaire)

**1. Unifier la hierarchie de roles** dans un fichier partage `src/constants/roles.ts`
- Definir `ROLE_HIERARCHY` complet : `['super_admin', 'admin', 'expert_immobilier', 'mortgage_officer', 'notaire', 'geometre', 'urbaniste', 'partner', 'user']`
- Importer dans `useAuth.tsx`, `useUserManagement.tsx`, `ProtectedRoute.tsx`

**2. Mettre a jour le type de `ProtectedRoute`**
- Ajouter tous les roles metier au type `requiredRoles`

**3. Securiser BulkActionsDialog**
- Retirer `admin` de la liste des roles attribuables en masse
- Ou ajouter une verification : seul un `super_admin` peut attribuer le role `admin`

**4. Ajouter la verification de role cible dans AdminFraudDetection.handleBlockUser**
- Empecher le blocage de `super_admin` et `admin`

### Phase 2 — Coherence

**5. Ajouter les roles metier manquants** dans `UserDetailsDialog.getRoleBadge` et `AdminUsers.getRoleBadge`

**6. Ajouter les roles metier dans BulkActionsDialog** (notaire, geometre, urbaniste)

**7. Uniformiser les seuils de pagination** — utiliser `totalPages > 1` partout

**8. Retirer la limite de 500** sur `fraud_attempts` ou ajouter un avertissement si le total atteint la limite

### Phase 3 — Robustesse

**9. Optimiser le real-time listener** dans `AdminUsers` : filtrer les evenements pour ne recharger que si le changement concerne un champ visible (is_blocked, full_name, etc.)

**10. Ajouter un useEffect dans useAdminUserStatistics** pour declencher automatiquement le fetch

### Fichiers concernes
- `src/constants/roles.ts` (nouveau)
- `src/hooks/useAuth.tsx`
- `src/hooks/useUserManagement.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/admin/users/BulkActionsDialog.tsx`
- `src/components/admin/users/UserDetailsDialog.tsx`
- `src/components/admin/AdminUsers.tsx`
- `src/components/admin/AdminFraudDetection.tsx`
- `src/hooks/useAdminUserStatistics.tsx`

