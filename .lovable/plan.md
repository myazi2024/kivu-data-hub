

## Fix — `get_user_statistics` accessible aux admins

### Problème

La fonction RPC `get_user_statistics` rejette toute requête où `auth.uid() != target_user_id`. Conséquence : même connecté en `super_admin`, impossible de consulter les statistiques d'un autre utilisateur depuis le panneau admin (`useAdminUserStatistics`).

### Correctif

Migration SQL : remplacer le `CREATE OR REPLACE FUNCTION public.get_user_statistics(...)` pour autoriser l'accès si :
- `auth.uid() = target_user_id` (le user lui-même), **OU**
- `has_role(auth.uid(), 'super_admin')`, **OU**
- `has_role(auth.uid(), 'admin')`

Le reste du corps de la fonction (calculs des 9 KPIs sur la fenêtre `start_date`/`end_date`) reste strictement identique. On conserve `SECURITY DEFINER`, `SET search_path = public`, et la signature exacte (`target_user_id uuid, start_date date, end_date date`) pour ne casser ni `useUserStatistics` ni `useAdminUserStatistics`.

### Validation post-migration

1. Connecté en `super_admin` (`myazi2024@gmail.com`), ouvrir n'importe quel utilisateur dans la gestion admin → les KPIs s'affichent (factures, dépenses, contributions, CCC…).
2. Connecté en user standard, `useUserStatistics` continue de fonctionner pour son propre `user_id`.
3. Un user standard tentant un appel RPC avec un `target_user_id` ≠ son uid → rejet (sécurité préservée).

### Hors périmètre

- Pas de changement de signature ni des champs retournés → zéro impact frontend.
- Pas de modification des autres RPC PII (qui ont leur propre logique d'accès payant).
- Pas de touche aux hooks (`useUserStatistics`, `useAdminUserStatistics`) — ils marcheront tels quels.

