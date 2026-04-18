

## Audit — Espace utilisateur (`/mon-compte`)

### Périmètre

| Fichier | LOC | État |
|---|---|---|
| `src/pages/UserDashboard.tsx` | 233 | OK structure, refonte UX nécessaire |
| `src/components/user/UserContributions.tsx` | **897** | Critique : monolithe à découper |
| `src/components/user/UserProfileSection.tsx` | 373 | Issues data + perf |
| `src/components/user/UserLandDisputes.tsx` | 362 | OK |
| `src/components/user/UserLandTitleRequests.tsx` | 322 | OK |
| `src/components/user/UserPreferences.tsx` | 274 | Issues sécurité (suppression compte) |
| `src/components/user/UserAccountSecurity.tsx` | 150 | Dette MFA (mémoire) |
| `src/components/user/NotificationBell.tsx` | 146 | OK avec petits bugs |
| `src/hooks/useNotifications.tsx` | 178 | OK |

---

### Lot 1 — Bugs / cohérence (haute priorité)

1. **Lien cassé `/carte-cadastrale`** (4 occurrences : `UserContributions` ×2, `UserBuildingPermits`, `UserLandTitleRequests`) — la route déclarée dans `App.tsx` est `/cadastral-map`. Tous ces liens "Contribuer" tombent en 404.
2. **Bouton "Vérifier email" ne marche pas** : `user?.email_confirmed_at !== null` est **toujours `true`** quand le champ est `undefined` (cas Supabase). Il faut tester `Boolean(user?.email_confirmed_at)`.
3. **Suppression compte = soft-delete frontend uniquement** (`UserPreferences.deleteAccount`) — pose `deleted_at` sur `profiles` puis `signOut`. ⚠️ L'utilisateur **peut se reconnecter immédiatement** (auth.users intact, RLS ne filtre pas `deleted_at`). Conformité RGPD non garantie.
4. **`getRoleBadge`** dans `UserProfileSection` ne couvre pas tous les rôles officiels (mémoire `gestion-roles-metier-fr` : 9 rôles, ici 6 traités → `moderator`, `verifier`, autres tombent en "Utilisateur").
5. **Mapping route obsolète unique** dans `NotificationBell.resolveActionUrl` : seul `/user-dashboard → /mon-compte` est mappé. Or il existe d'autres routes potentiellement obsolètes générées par d'anciennes notifications (à auditer côté `notificationHelper`).
6. **Onglet "Factures" rend `CadastralDashboardTabs`** (composant générique, probablement multi-onglets internes) — incohérent avec un onglet "Factures" pur. À vérifier/remplacer par un composant `UserInvoices` dédié.
7. **`UserBuildingPermits`** fait **2 requêtes séquentielles** sur `cadastral_contributions` puis merge côté client → peut être 1 seule requête avec `.or()`.
8. **`detectOriginalFormType`** (UserContributions L72-109) : heuristique fragile basée sur la présence de tableaux. Devrait être stocké en BD (`source_form_type` sur `cadastral_contributions`).

### Lot 2 — Performance & data

9. **Aucun `useQuery`** dans tout l'espace utilisateur (11 composants fetchent à chaque mount). À aligner sur le standard du projet (Lot Carte cadastrale a déjà introduit `useQuery`).
10. **`UserProfileSection` : 4 `count` queries en parallèle à chaque mount** sans cache (`contributions/titles/invoices/disputes`). → `useQuery(['user-stats', userId])` avec staleTime 2 min, ou RPC unique `get_user_dashboard_stats`.
11. **`UserContributions.fetchContributions` charge `select('*')`** sans pagination serveur → tout l'historique en mémoire, rendu paginé client. Au-delà de quelques centaines de contributions, page lente.
12. **`UserContributions.fetchCCCCode`** déclenche une requête à chaque ouverture de Dialog → batcher avec la liste initiale via join.
13. **Pas de realtime sur les contributions/demandes** alors que les statuts changent côté admin → l'utilisateur doit recharger pour voir "Approuvée".
14. **`profileCache` dans `useAuth`** : déjà optimisé (cf. fichier), mais `UserProfileSection` re-fetch quand même `stats` à chaque mount sans cache.

### Lot 3 — UX / a11y / contenu

15. **11 onglets horizontaux scrollables** sur 360px — pas d'indicateur visuel de scroll, pas de retour à l'onglet courant lors du `setSearchParams`. Sur mobile, l'utilisateur perd la trace.
16. **Pas de badge de count par onglet** (ex: "Litiges (2 actifs)", "Contributions (3 en attente)"). Friction pour l'utilisateur qui doit cliquer pour voir.
17. **`UserAccountSecurity` : 2FA "Bientôt disponible"** — déjà flaggé en mémoire (`2fa-admin-debt-fr`) pour les admins mais aucune piste pour l'utilisateur final. Décision produit à prendre.
18. **Validation mot de passe minimaliste** (6 caractères, pas de complexité, pas de détection de mot de passe compromis). Mémoire `security-baseline-fr` recommande durcissement.
19. **Avatar upload sans validation** : pas de limite de taille, pas de validation MIME côté client → upload accepté de gros fichiers / fichiers non-image.
20. **Suppression compte avec UNE seule confirmation** (AlertDialog) sans saisir le mot ou son email → trop facile en accidentel.
21. **`Helmet` import vs `react-helmet-async`** : `UserDashboard` utilise `Helmet` (sans Async), à harmoniser comme fait sur Accueil.
22. **`fileName = ${user.id}-${Date.now()}.${fileExt}`** dans avatar upload — viole la mémoire `file-storage-naming-standard-fr` qui impose `crypto.randomUUID()`.
23. **Pas de `prefers-reduced-motion`** sur le spinner (mineur).
24. **Lien parrainage** affiché en `<code>` mais aucune doc sur ce que fait `?ref=user_id` à l'inscription → vérifier que le param est traité dans `/auth`, sinon feature morte.
25. **Format date** "dd/MM" sur mobile sans année → ambigu pour contributions anciennes.

### Lot 4 — Architecture

26. **`UserContributions.tsx` 897 LOC** viole la règle "dialogs > 1000 LOC modularisés" (proche du seuil). Découper :
    - `useUserContributions` (fetch + mutations)
    - `useContributionEditPrep` (mapping snake→camel, lourd)
    - `UserContributionsList.tsx`, `UserContributionsStats.tsx`, `UserContributionDetailsDialog.tsx`, `UserContributionDeleteDialog.tsx`
27. **Duplication massive du pattern fetch** dans 8 composants `User*` (loading state + supabase + applyTestFilter + pagination). → Hook générique `useUserResourceList<T>(table, filters)`.
28. **Mapping snake_case ↔ camelCase à la main** dans `handleEditContribution` (L246-355) — 100+ lignes de mapping. Devrait être un util pur testé : `mapContributionToFormDraft()`.
29. **Casts `(contribution as any)` × 30+** dans `handleEditContribution` → typage manquant, à régénérer/compléter.
30. **`testUserDashboardIntegration.ts`** dans `src/utils/` — fichier de test/debug, à déplacer ou supprimer.
31. **Pas de tracking analytics** sur les actions clés (clic onglet, modif profil, suppression contribution, copie lien parrainage).

---

### Question pour cadrage

Quel périmètre veux-tu que j'implémente ?

- **(A) Lot 1 seul** — bugs critiques : 4 liens `/carte-cadastrale` cassés, `email_confirmed_at` boolean, suppression compte sécurisée (edge function + double confirmation), tous rôles dans `getRoleBadge`, vérification onglet Factures, fusion 2 queries `UserBuildingPermits`.
- **(B) Lots 1 + 2** — + migration `useQuery` (8 composants), RPC `get_user_dashboard_stats`, pagination serveur sur contributions, realtime statuts, batch `fetchCCCCode`.
- **(C) Lots 1 + 2 + 3** — + badges count par onglet, refonte onglets mobile (scroll indicator), validation avatar (taille/MIME) + `crypto.randomUUID`, double confirmation suppression compte avec saisie email, `react-helmet-async`, durcissement validation mot de passe.
- **(D) Plan complet 1+2+3+4** — + découpe `UserContributions.tsx` en 6 fichiers + 2 hooks, hook générique `useUserResourceList`, util `mapContributionToFormDraft` typé, suppression `testUserDashboardIntegration.ts`, analytics actions clés.

