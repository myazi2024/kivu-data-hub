

# Audit — Espace Utilisateur (/mon-compte)

## Architecture

```text
UserDashboard.tsx
 ├─ NotificationBell (useNotifications hook)
 └─ Tabs (11 onglets)
     ├─ profile       → UserProfileSection
     ├─ contributions → UserContributions (897 lignes)
     ├─ titles        → UserLandTitleRequests
     ├─ permits       → UserBuildingPermits
     ├─ expertise     → UserExpertiseRequests
     ├─ mutations     → UserMutationRequests
     ├─ mortgages     → UserMortgageRequests
     ├─ subdivisions  → UserSubdivisionRequests
     ├─ disputes      → UserLandDisputes (seul avec Realtime)
     ├─ invoices      → CadastralDashboardTabs
     └─ settings      → UserPreferences + UserAccountSecurity
```

16 fichiers dans `src/components/user/`.

---

## Problemes identifies

### 1. CRITIQUE — Parametre `?tab=` jamais lu

**Fichier** : `UserDashboard.tsx` ligne 49
**Probleme** : `<Tabs defaultValue="profile">` est statique. Le composant n'utilise pas `useSearchParams`. Or, 125+ occurrences dans 18 fichiers envoient des `action_url` avec `?tab=contributions`, `?tab=mutations`, `?tab=building-permits`, etc. La page Admin utilise correctement `useSearchParams` (ligne 117 de `Admin.tsx`), mais le dashboard utilisateur ne le fait pas.
**Impact** : Cliquer sur une notification "Votre mutation a ete approuvee" amene sur l'onglet Profil au lieu de Mutations. Les 30+ types de notifications sont concernes.

### 2. CRITIQUE — Route `/user-dashboard` dupliquee et liens hardcodes

**Fichiers** : `App.tsx` (2 routes identiques), 18 fichiers avec `action_url: '/user-dashboard?tab=...'`, 4 fichiers avec `navigate('/user-dashboard')`
**Probleme** : `/user-dashboard` et `/mon-compte` rendent le meme composant. `NotificationBell` contient un mapping de conversion, mais les `navigate()` directs dans `MortgageFormDialog`, `PermitConfirmationStep`, `CancellationConfirmationStep` et `AdminDashboardHeader` ne passent pas par ce mapping — ils naviguent vers `/user-dashboard` directement.
**Impact** : URL inconsistantes. Le mapping dans `NotificationBell` ne couvre que les clics sur notifications, pas les redirections programmatiques.

### 3. MOYEN — `getRoleBadge` ignore `super_admin`

**Fichier** : `UserProfileSection.tsx` lignes 91-99
**Probleme** : Le switch ne gere que `admin` et `partner`. Les roles `super_admin`, `notaire`, `geometre`, `agent_urbanisme` tombent dans le `default` → badge "Utilisateur".
**Impact** : Un super_admin ou un geometre voit un badge incorrect.

### 4. MOYEN — `deleteAccount` = soft-delete insuffisant

**Fichier** : `UserPreferences.tsx` lignes 124-149
**Probleme** : Met `deleted_at` sur le profil puis `signOut()`. Le compte Auth reste actif (reconnexion possible). Aucune suppression de donnees (contributions, litiges, factures, codes CCC). Le message dit "irreversible" et "toutes vos donnees seront supprimees" — c'est faux.
**Impact** : Non-conformite RGPD. L'utilisateur croit ses donnees supprimees.

### 5. MOYEN — Statistiques profil incompletes

**Fichier** : `UserProfileSection.tsx` lignes 28-33, 46-72
**Probleme** : 4 compteurs seulement (Contributions, Titres, Factures, Litiges). Il manque Mutations, Hypotheques, Expertises, Lotissements, Autorisations — soit 5 categories presentes comme onglets mais absentes des stats.
**Impact** : Vue partielle de l'activite.

### 6. MOYEN — Pas de Realtime sur 10 onglets sur 11

**Fichiers** : Tous sauf `UserLandDisputes`
**Probleme** : Seul `UserLandDisputes` souscrit aux changements Realtime. Les autres onglets chargent les donnees au montage uniquement. Si un admin approuve une mutation pendant que l'utilisateur est sur le dashboard, le statut ne se met pas a jour.
**Impact** : L'utilisateur doit recharger la page.

### 7. MOYEN — `UserSubdivisionRequests` utilise `(supabase as any)`

**Fichier** : `UserSubdivisionRequests.tsx` ligne 40
**Probleme** : Cast `as any` pour contourner le typage. La table `subdivision_requests` n'est pas dans les types generes.
**Impact** : Aucune verification TypeScript sur les colonnes.

### 8. MOYEN — `UserContributions` monolithique (897 lignes)

**Fichier** : `UserContributions.tsx`
**Probleme** : Listing, details, edition (4 types de formulaires), suppression, pagination, recherche, formatage — tout dans un fichier.
**Impact** : Maintenabilite degradee.

### 9. MINEUR — Lien de parrainage non fonctionnel

**Fichier** : `UserProfileSection.tsx` ligne 198
**Probleme** : Le lien genere `/auth?ref=${user.id}` mais la page `Auth.tsx` ne traite pas le parametre `ref` (confirme par recherche — 0 match). Le parrainage n'est jamais comptabilise.
**Impact** : Fonctionnalite affichee mais inoperante.

### 10. MINEUR — Navigation mobile difficile

**Fichier** : `UserDashboard.tsx` lignes 51-131
**Probleme** : 11 onglets dans un scroll horizontal. Les derniers (Litiges, Factures, Reglages) sont invisibles sans scroller.
**Impact** : UX degradee sur petit ecran.

### 11. MINEUR — `export_user_data` RPC non verifiable

**Fichier** : `UserPreferences.tsx` ligne 96
**Probleme** : Appel a `supabase.rpc('export_user_data')`. Si la fonction n'existe pas cote Supabase, l'export echoue avec un toast d'erreur generique.

---

## Recommandations

### Corrections prioritaires

1. **Lire `?tab=` dans `UserDashboard.tsx`** avec `useSearchParams` (comme `Admin.tsx` le fait deja). Utiliser la valeur comme `value` controlé du `<Tabs>` au lieu de `defaultValue`.

2. **Unifier les routes** : remplacer la route `/user-dashboard` par un `<Navigate to="/mon-compte" replace />` dans `App.tsx`. Mettre a jour les 4 fichiers qui utilisent `navigate('/user-dashboard')`.

3. **Ajouter `super_admin`** et les roles metier (`notaire`, `geometre`, `agent_urbanisme`) dans `getRoleBadge`.

### Ameliorations

4. **Enrichir les stats du profil** avec les 5 compteurs manquants (mutations, hypotheques, expertises, lotissements, autorisations).

5. **Ajouter Realtime** sur les onglets critiques (Mutations, Titres, Autorisations) ou au minimum un bouton "Rafraichir".

6. **Refactorer `UserContributions`** en sous-composants.

7. **Corriger la suppression de compte** : soit implementer une edge function qui supprime reellement les donnees, soit reformuler le message en "desactivation".

8. **Supprimer le lien de parrainage** ou implementer le tracking du `ref` dans `Auth.tsx`.

### Technique

- Fichiers a modifier pour les corrections 1-3 : `UserDashboard.tsx`, `App.tsx`, `UserProfileSection.tsx`, `MortgageFormDialog.tsx`, `PermitConfirmationStep.tsx`, `CancellationConfirmationStep.tsx`, `AdminDashboardHeader.tsx`

