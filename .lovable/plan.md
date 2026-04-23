

## Élargir ton compte au rôle `super_admin`

### Objectif

Ajouter le rôle `super_admin` à ton compte utilisateur courant pour bypasser toutes les vérifications de permissions granulaires et débloquer instantanément l'accès à 100% des onglets admin.

### Pourquoi ça marche

`useAdminTabAccess` court-circuite la matrice de permissions dès qu'il détecte `super_admin` dans `user_roles` (`isSuperAdmin → return true`). Aucune entrée à seeder dans `permissions` ni `role_permissions`.

### Action

**1. Identifier ton `user_id`**

Récupération via une requête sur `profiles` filtrée sur ton email (tu me le donnes après approbation, ou je le déduis de la session courante via les logs auth).

**2. Insérer le rôle `super_admin`**

Une seule ligne dans `user_roles` (idempotent grâce à la contrainte unique `(user_id, role)`) :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<TON_USER_ID>', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Tu conserves ton rôle `admin` existant — les deux coexistent, `getHighestRole` remontera `super_admin`.

### Validation post-action

1. Recharger `/admin` (pas besoin de logout — `useAdminTabAccess` recharge à chaque mount du provider).
2. Tous les onglets accessibles : Mode test, Sécurité, RH, Comptabilité, Paramètres système, Apparence, Audit, Permissions, Rôles.
3. Badge utilisateur dans la sidebar : passe de "Administrateur" à "Super Admin" (gradient violet→rose).
4. La 2FA reste exigée (AdminMfaGate ne change pas de comportement).

### Précautions

- **MFA obligatoire** : tu l'as déjà activée → OK. Sans 2FA, super_admin serait un risque majeur.
- **Réversibilité** : pour redescendre plus tard, simple `DELETE FROM user_roles WHERE user_id='...' AND role='super_admin';`.
- **Recovery** : note ton `user_id` quelque part — si tu te bloques (perte 2FA), tu auras besoin d'aide via SQL pour réinitialiser.

### Question avant exécution

Donne-moi ton **email** (celui utilisé pour te connecter en admin actuellement) pour que je récupère ton `user_id` exact avant l'insertion. Ou si tu préfères, copie-colle directement ton `user_id` depuis l'onglet **Auth → Users** du dashboard Supabase.

### Hors périmètre

- Pas de modification de `adminTabPermissions.ts` ni de la matrice (intacts pour les autres admins).
- Pas de migration de schéma (juste un INSERT data).
- Plan B disponible plus tard si tu veux finalement seeder la matrice complète pour les autres admins.

