

# Audit détaillé — Espace Utilisateur (/user-dashboard, /mon-compte)

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│ UserDashboard (page)                                  │
│  ├─ Navigation + NotificationBell                     │
│  └─ Tabs (11 onglets)                                 │
│      ├─ Profil        → UserProfileSection            │
│      ├─ Données       → UserContributions (897 lignes)│
│      ├─ Titres        → UserLandTitleRequests         │
│      ├─ Autorisations → UserBuildingPermits            │
│      ├─ Expertises    → UserExpertiseRequests          │
│      ├─ Mutations     → UserMutationRequests           │
│      ├─ Hypothèques   → UserMortgageRequests           │
│      ├─ Lotissements  → UserSubdivisionRequests        │
│      ├─ Litiges       → UserLandDisputes               │
│      ├─ Factures      → CadastralDashboardTabs         │
│      └─ Réglages      → UserPreferences + Security     │
└──────────────────────────────────────────────────────┘
```

11 onglets, 16 fichiers dans `src/components/user/`.

---

## Problèmes identifiés

### 1. CRITIQUE — Paramètre `?tab=` des notifications jamais lu

**Fichiers** : `UserDashboard.tsx`, `NotificationBell.tsx`, 11+ fichiers envoyant des notifications
**Problème** : Les notifications (mutations, litiges, autorisations, lotissements) envoient des `action_url` avec `?tab=mutations`, `?tab=disputes`, `?tab=building-permits`, etc. Le `NotificationBell` résout correctement la route (`/user-dashboard` → `/mon-compte`), mais **le `UserDashboard` ne lit jamais le paramètre `tab` de l'URL**. Le `<Tabs>` a toujours `defaultValue="profile"`.
**Impact** : Quand un utilisateur clique sur une notification « Votre mutation a été approuvée » → il arrive sur l'onglet Profil au lieu de l'onglet Mutations. L'utilisateur doit manuellement naviguer vers le bon onglet. Toutes les 30+ notifications envoyées par le système sont concernées.

### 2. CRITIQUE — Route dupliquée `/user-dashboard` et `/mon-compte`

**Fichier** : `App.tsx` lignes 86-95
**Problème** : Les deux routes rendent le même composant `UserDashboard`. De plus, toutes les `action_url` des notifications pointent encore vers `/user-dashboard` (ancienne route), et `NotificationBell` contient un mapping de conversion. Mais les liens directs dans les dialogs (ex: `MutationRequestDialog`, `PermitConfirmationStep`, `MortgageFormDialog`) utilisent `window.location.href = '/user-dashboard?tab=...'` ou `navigate('/user-dashboard')`.
**Impact** : Incohérence de navigation, URL obsolètes dans le navigateur, et effort de maintenance pour maintenir le mapping.

### 3. MOYEN — Rôle affiché depuis `profile.role` (lecture client)

**Fichier** : `UserProfileSection.tsx` ligne 278
**Problème** : Le badge de rôle est affiché via `profile?.role` qui est calculé côté client dans `useAuth.tsx` (lecture de la table `user_roles` + hiérarchisation). C'est correct pour l'affichage, mais `getRoleBadge` ne gère pas le rôle `super_admin` — il tombe dans le `default` et affiche « Utilisateur ».
**Impact** : Un super_admin voit le badge « Utilisateur » au lieu de « Super Admin ».

### 4. MOYEN — `deleteAccount` fait un soft-delete insuffisant

**Fichier** : `UserPreferences.tsx` lignes 124-149
**Problème** : La suppression de compte met simplement `deleted_at` sur le profil puis fait un `signOut`. Le compte Supabase Auth reste actif — l'utilisateur peut se reconnecter. Aucune suppression réelle des données (contributions, litiges, factures, codes CCC, etc.). Le message dit « irréversible » alors que c'est un simple flag.
**Impact** : Violation potentielle du RGPD. L'utilisateur pense que ses données sont supprimées alors qu'elles restent intactes.

### 5. MOYEN — Statistiques du profil incomplètes

**Fichier** : `UserProfileSection.tsx` lignes 46-72
**Problème** : Le profil affiche 4 compteurs (Contributions, Titres, Factures, Litiges) mais l'utilisateur a aussi des Mutations, Hypothèques, Expertises, Lotissements et Autorisations. Ces 5 catégories ne sont pas comptées.
**Impact** : Le profil donne une vue partielle de l'activité de l'utilisateur.

### 6. MOYEN — `UserContributions` : composant monolithique (897 lignes)

**Fichier** : `UserContributions.tsx`
**Problème** : Ce composant gère listing, détails, édition (4 types de formulaires), suppression, pagination, recherche, et formatage — tout dans un seul fichier de 897 lignes.
**Impact** : Difficile à maintenir, tester et refactorer.

### 7. MOYEN — Pas de Realtime sur la plupart des onglets

**Fichiers** : `UserLandTitleRequests`, `UserMutationRequests`, `UserBuildingPermits`, `UserExpertiseRequests`, `UserMortgageRequests`, `UserSubdivisionRequests`
**Problème** : Seul `UserLandDisputes` utilise un abonnement Realtime pour les mises à jour. Les autres onglets ne se rafraîchissent qu'au montage du composant. Si un admin approuve une mutation pendant que l'utilisateur consulte son dashboard, le statut ne se met pas à jour.
**Impact** : L'utilisateur doit recharger la page pour voir les changements.

### 8. MOYEN — `UserSubdivisionRequests` utilise `(supabase as any)`

**Fichier** : `UserSubdivisionRequests.tsx` ligne 40
**Problème** : La table `subdivision_requests` n'est probablement pas dans les types générés, d'où le cast `as any`. Cela contourne toute vérification TypeScript.
**Impact** : Erreurs silencieuses si la table ou les colonnes changent.

### 9. MINEUR — Pas de lien « Retour » ou navigation entre onglets

**Fichier** : `UserDashboard.tsx`
**Problème** : La barre d'onglets a 11 éléments dans un scroll horizontal. Sur mobile, c'est difficile à naviguer — l'utilisateur doit scroller horizontalement pour trouver les derniers onglets (Litiges, Factures, Réglages).
**Impact** : UX dégradée sur mobile.

### 10. MINEUR — Liens de parrainage non traçables

**Fichier** : `UserProfileSection.tsx` ligne 198
**Problème** : Le lien de parrainage est construit avec `window.location.origin/auth?ref=${user.id}`. Mais rien dans le code d'authentification ne traite le paramètre `ref`. Le parrainage n'est pas comptabilisé.
**Impact** : Fonctionnalité affichée mais non fonctionnelle.

### 11. MINEUR — `export_user_data` RPC non vérifiable

**Fichier** : `UserPreferences.tsx` ligne 96
**Problème** : L'export de données appelle `supabase.rpc('export_user_data', { target_user_id: user.id })`. Cette fonction RPC doit être définie côté Supabase mais n'est pas vérifiable ici. Si elle n'existe pas, l'export échoue silencieusement avec un toast d'erreur.
**Impact** : Fonctionnalité RGPD potentiellement non fonctionnelle.

---

## Recommandations

### Corrections prioritaires

1. **Lire le paramètre `?tab=` de l'URL** dans `UserDashboard.tsx` et l'utiliser comme `defaultValue` des `<Tabs>`. Utiliser `useSearchParams` de react-router-dom.

2. **Ajouter `super_admin`** dans `getRoleBadge` de `UserProfileSection.tsx`.

3. **Rediriger `/user-dashboard` vers `/mon-compte`** au lieu de dupliquer la route. Mettre à jour les `action_url` des notifications pour utiliser `/mon-compte`.

### Améliorations

4. **Enrichir les statistiques du profil** avec les compteurs manquants (mutations, expertises, hypothèques, lotissements, autorisations).

5. **Implémenter le Realtime** sur les onglets critiques (Mutations, Titres, Autorisations) ou au minimum ajouter un bouton "Rafraîchir".

6. **Refactorer `UserContributions`** en sous-composants (ContributionsList, ContributionDetails, ContributionEditDialog).

7. **Corriger la suppression de compte** : soit supprimer réellement les données via une edge function, soit clarifier dans le message que c'est une désactivation.

8. **Supprimer le lien de parrainage** ou implémenter le tracking du paramètre `ref` à l'inscription.
