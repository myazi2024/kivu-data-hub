## Problème

Quand vous cliquez « Désactiver le mode test », l'UI affiche « Configuration enregistrée » mais le switch revient à **Actif** : le mode test refuse de se désactiver.

## Cause racine

Votre compte a deux rôles dans `user_roles` : `user` + `super_admin` (pas `admin`).

La fonction `get_current_user_role()` renvoie le rôle de plus haute priorité → **`'super_admin'`**.

La RLS de `cadastral_search_config` n'autorise les écritures qu'à `'admin'` :

```sql
USING (get_current_user_role() = 'admin')
```

Conséquences observées en base :
- 5 tentatives de désactivation aujourd'hui (13:53–14:08) ont écrit `TEST_MODE_DISABLED` dans `audit_logs` (RPC SECURITY DEFINER → contourne la RLS).
- Mais la ligne `cadastral_search_config.test_mode` n'a **plus bougé depuis le 22 avril** (`updated_at` figé), `enabled: true` toujours.
- L'UPDATE PostgREST n'affecte 0 ligne et **ne jette aucune erreur** → faux toast de succès, puis `refreshConfiguration()` recharge `enabled: true` et le switch se rebascule.

Le même bug touche silencieusement **toutes** les écritures de config faites par un super_admin pur (test_mode, search_config, results_config, etc.) — c'est juste qu'ici le rollback visuel rend le bug évident.

## Plan de correction

### 1. Migration SQL — élargir les policies aux super_admins

Remplacer toutes les policies `get_current_user_role() = 'admin'` sur les tables de configuration par un test couvrant **admin + super_admin**, en utilisant `has_role()` (pattern déjà standard dans le projet, évite la récursion RLS) :

```sql
-- Exemple cadastral_search_config
DROP POLICY "Admins can manage search config" ON public.cadastral_search_config;
CREATE POLICY "Admins manage search config"
ON public.cadastral_search_config FOR ALL
TO authenticated
USING  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
```

Audit à faire dans la migration : balayer toutes les policies dont l'expression contient `get_current_user_role() = 'admin'` (sans clause `OR ... 'super_admin'`) et les réécrire au même pattern. Cibles probables : `cadastral_search_config`, `cadastral_results_config`, `cadastral_search_bar_config`, `system_settings`, etc.

### 2. Hardening client — détecter les UPDATE 0-ligne

Dans `src/utils/supabaseConfigUtils.ts`, faire que `upsertSearchConfig` :
- demande `.select()` après l'UPDATE pour récupérer le nombre de lignes affectées,
- lance une erreur explicite si `data.length === 0` ("Mise à jour bloquée par RLS — vérifiez vos rôles").

Ça évite qu'un futur trou de RLS provoque encore un faux succès silencieux.

### 3. Vérification post-correction

- Recharger la page → cliquer « Désactiver », confirmer dans l'AlertDialog.
- Vérifier que `cadastral_search_config.test_mode.config_value.enabled` passe à `false` et que `updated_at` est mis à jour.
- Le switch reste sur Inactif après refresh.

### Hors scope

- Pas de changement à l'edge function `cleanup-test-data-batch` (elle utilise déjà service_role, n'est pas affectée).
- Pas de modification du hook `useTestMode`.
- Aucune donnée de test n'est touchée.

## Détails techniques

| Élément | Avant | Après |
|---|---|---|
| Policy `cadastral_search_config` (ALL) | `get_current_user_role() = 'admin'` | `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')` |
| `upsertSearchConfig` UPDATE | `.update().eq()` (silencieux si 0 ligne) | `.update().eq().select()` + throw si vide |
| `useTestMode` | inchangé | inchangé |
| Edge function purge | inchangé | inchangé |

Mémoire à mettre à jour : `mem/security/security-baseline-fr.md` — ajouter règle "policies admin doivent inclure super_admin (utiliser `has_role()`, jamais `get_current_user_role() = 'admin'` seul)".
