---
name: Security baseline
description: Règles RLS, rôles et hardening client pour les écritures admin
type: constraint
---

## RLS — politiques admin doivent inclure super_admin

**Règle absolue** : toute policy qui autorise un rôle admin à écrire DOIT couvrir `admin` ET `super_admin`. Utiliser `has_role()` (jamais `get_current_user_role() = 'admin'` seul).

```sql
-- ✅ CORRECT
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))

-- ❌ INTERDIT — exclut les super_admins, UPDATE silencieusement ignoré (0 lignes, pas d'erreur)
USING (get_current_user_role() = 'admin')
```

**Pourquoi** : `get_current_user_role()` renvoie le rôle de plus haute priorité (`super_admin` > `admin` > `partner` > `user`). Un compte purement super_admin échoue donc le test `= 'admin'`. PostgREST ne jette aucune erreur sur un UPDATE 0-ligne → faux toast de succès, switch UI qui rebascule, bug invisible.

Migration `20260429141936` corrige 22 policies historiques (cadastral_*, articles, audit_logs, notifications, payments, publications, resellers, discount_codes).

## Hardening client — détecter UPDATE 0-ligne

`upsertSearchConfig` (et tout helper d'écriture admin sensible) doit chaîner `.select()` sur l'UPDATE et lever une erreur explicite si `data.length === 0`. Évite que d'éventuels futurs trous de RLS provoquent un faux succès.

## Rôles

- Stockage : table `public.user_roles` séparée (jamais sur `profiles`).
- Lecture : `public.has_role(_user_id, _role)` SECURITY DEFINER, search_path = public.
- Hub Sécurité : fraude/blocages/rôles 7j, top risque, inactifs RPC.
- Permissions opérationnelles : `users.export_pii`, `notes.delete`.
