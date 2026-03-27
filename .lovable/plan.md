

# Fix "Impossible de charger les rôles" + Amélioration du bloc Rôles

## Diagnostic

### Cause racine de l'erreur
La requête `fetchUserRoles` utilise un JOIN `profiles!inner(full_name, email)` mais il n'existe **aucune clé étrangère directe** entre `user_roles` et `profiles`. Les deux tables référencent `auth.users(id)` indépendamment. PostgREST ne peut pas résoudre ce JOIN indirect, ce qui provoque une erreur 400 et déclenche le toast "Impossible de charger les rôles".

### Autres problèmes identifiés

| Problème | Impact |
|----------|--------|
| JOIN `profiles!inner` impossible (pas de FK directe) | **Erreur bloquante** — les rôles ne se chargent pas |
| RLS : seuls les `super_admin` ont INSERT/DELETE sur `user_roles`, mais l'UI laisse les `admin` essayer | Admin voit le formulaire d'ajout mais l'insertion échoue silencieusement |
| `get_current_user_role()` CASE incomplet — manque `expert_immobilier` (5) et `mortgage_officer` (6) | Ces rôles retournent NULL, bloquant potentiellement l'accès aux profiles |
| Colonne `created_by` jamais renseignée lors de l'ajout d'un rôle | Pas de traçabilité de qui a attribué le rôle |
| Pas de pagination — tous les utilisateurs chargés d'un coup | Lent avec beaucoup d'utilisateurs |

## Plan de correction

### 1. Corriger `fetchUserRoles` — deux requêtes séparées

Remplacer le JOIN impossible par :
1. Fetch `user_roles` (id, user_id, role, created_at)
2. Fetch `profiles` pour les user_ids récupérés
3. Merger côté client

Même logique pour `fetchAllUsers` — déjà fonctionnel (pas de JOIN).

### 2. Corriger `get_current_user_role()` — ajouter les rôles manquants

Migration SQL pour recréer la fonction avec le CASE complet :
```sql
CASE role
  WHEN 'super_admin' THEN 1
  WHEN 'admin' THEN 2
  WHEN 'expert_immobilier' THEN 3
  WHEN 'mortgage_officer' THEN 4
  WHEN 'partner' THEN 5
  WHEN 'user' THEN 6
END
```

### 3. Ajouter une policy INSERT pour les admins sur `user_roles`

Actuellement seuls les `super_admin` peuvent insérer/supprimer des rôles. Ajouter des policies pour que les `admin` puissent aussi gérer les rôles (sauf `super_admin`) :
- INSERT pour admin (avec restriction : ne peut pas attribuer `super_admin`)
- DELETE pour admin (avec restriction : ne peut pas retirer `super_admin`)

### 4. Renseigner `created_by` lors de l'ajout

Modifier `addRole` pour inclure `created_by: user.id` dans l'insert.

### 5. Afficher `created_by` dans l'historique

Afficher le nom de l'admin qui a attribué chaque rôle dans la liste et l'historique.

## Fichiers modifiés

| Action | Fichier |
|--------|---------|
| Migration SQL | Fix `get_current_user_role()`, ajouter policies INSERT/DELETE pour admin |
| Modifié | `src/components/admin/AdminUserRolesEnhanced.tsx` — fix fetch, ajout `created_by`, UI améliorée |

