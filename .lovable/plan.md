## Objectif
Permettre l’accès immédiat à `/admin` avec un compte `admin` ou `super_admin`, sans passer par la vérification 2FA, de façon provisoire et réversible.

## Plan
1. Modifier uniquement le routage admin dans `src/App.tsx`.
2. Retirer temporairement le wrapper `<AdminMfaGate>` autour de la page `<Admin />`.
3. Conserver `<ProtectedRoute requiredRoles={['admin', 'super_admin']}>` pour que seuls les comptes admin/super_admin puissent accéder à l’espace admin.
4. Ne pas supprimer le système 2FA existant : `MfaGuardProvider`, les dialogues d’enrôlement/challenge et les actions sensibles restent en place pour pouvoir réactiver rapidement le garde admin.

## Résultat attendu
`/admin` sera accessible aux admins authentifiés sans popup 2FA, tout en gardant la protection par rôle.