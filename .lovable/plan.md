

# Audit de l'Espace Admin

## Architecture Generale

L'espace admin est un SPA monolithique dans `src/pages/Admin.tsx` avec 63 onglets geres par un `switch` sur le query param `?tab=`. La sidebar (`AdminSidebar.tsx`) organise les modules en 8 categories. Tous les composants sont lazy-loaded via `React.lazy`.

---

## Problemes Identifies

### 1. CRITIQUE — Lien "Parametres" pointe vers un onglet inexistant

**Fichier** : `AdminDashboardHeader.tsx` ligne 290
Le menu utilisateur contient `navigate('/admin?tab=settings')` mais aucun `case 'settings'` n'existe dans le switch de `Admin.tsx`. Cliquer sur "Parametres" affiche le Dashboard par defaut (cas `default`).

**Fix** : Supprimer l'item ou le rediriger vers un onglet existant (ex: `test-mode` ou `parcel-actions-config`).

### 2. CRITIQUE — `refreshCounts` est une fonction vide

**Fichier** : `Admin.tsx` lignes 159-161
```tsx
const refreshCounts = () => {
  // Counts auto-refresh on mount via usePendingCount
};
```
Les composants `AdminUsers`, `AdminPayments`, `AdminPublications` recoivent cette callback mais elle ne fait rien. `usePendingCount` ne se re-execute que si `enabled` ou `table` changent (ses deps `useEffect`). Apres une action admin (bloquer un user, valider un paiement), les badges de la sidebar ne se mettent pas a jour sans rechargement de page.

**Fix** : Ajouter un state `refreshKey` incremente par `refreshCounts`, et l'inclure dans les deps de `usePendingCount`.

### 3. MOYEN — `usePendingCount` defini dans le fichier page, pas extrait

Le hook generique `usePendingCount` (lignes 79-112 de `Admin.tsx`) est defini directement dans le fichier de la page au lieu d'etre dans `src/hooks/`. Cela viole la convention du projet et empeche sa reutilisation.

**Fix** : Extraire dans `src/hooks/usePendingCount.tsx`.

### 4. MOYEN — 7 appels `useAdminStatistics` simultanes au chargement du Dashboard

`AdminDashboardOverview` instancie 5 appels `useAdminStatistics` + `useDashboardData` + `useEnhancedAnalytics` au montage. Chacun declenche un `useEffect` avec appel RPC. Cela genere 7+ requetes Supabase simultanees au chargement.

**Impact** : Latence perceptible, surtout sur mobile. Les RPCs `get_admin_statistics` sont appelees avec des `stat_type` differents — un seul appel RPC polyvalent reduirait la charge.

### 5. MOYEN — Duplication d'icones importees

`AdminUsers.tsx` importe `Users` et `User` deux fois (lignes 8 et 18) avec des alias differents (`Users`/`UsersIcon`, `User`/`UserIcon`). Pas d'erreur runtime mais code confus.

### 6. MINEUR — Verification admin cote client uniquement

`Admin.tsx` verifie le role admin via une requete client (lignes 122-133). C'est correct pour l'UX, mais la vraie securite repose sur les politiques RLS de Supabase. Cela est deja en place selon le contexte memoire, donc pas de faille, mais un commentaire clarifiant serait utile.

### 7. MINEUR — `useAdminStatistics` n'a pas de deps stables dans useEffect

Ligne 128 : `useEffect` depend de `startDate` et `endDate` qui sont des objets `Date`. A chaque re-render du parent, de nouvelles instances sont creees, ce qui peut provoquer des appels en boucle si le parent re-render frequemment.

**Fix** : Convertir les dates en strings ISO dans le `useEffect` deps, ou utiliser `useMemo` dans le parent.

### 8. MINEUR — Sidebar trop longue (60+ items)

La sidebar contient 60+ liens dans 8 categories. Sur un ecran standard, cela necessite un scroll important. Certaines categories comme "Cadastre & Services" ont 20+ items.

**Suggestion** : Ajouter des sous-menus repliables (accordeon) par categorie.

---

## Points Positifs

- Lazy-loading systematique de tous les composants admin
- Hook generique `usePendingCount` pour les badges de notification
- Recherche dans la sidebar via le header
- Indicateur visuel du mode test dans le header
- Notifications en temps reel avec Supabase Realtime
- Cache de profil (5 min) dans `useAuth`
- Bonne separation des responsabilites (1 composant = 1 module)
- Export CSV/JSON fonctionnel sur le dashboard

---

## Plan de Corrections Propose

| Priorite | Probleme | Fichier(s) | Action |
|---|---|---|---|
| P0 | Lien "Parametres" mort | `AdminDashboardHeader.tsx` | Supprimer ou rediriger |
| P0 | `refreshCounts` vide | `Admin.tsx` | Ajouter refresh key |
| P1 | `usePendingCount` non extrait | `Admin.tsx` → `hooks/` | Extraire le hook |
| P1 | 7 requetes simultanees | `AdminDashboardOverview.tsx` | Batch ou lazy-load par onglet |
| P2 | Imports dupliques | `AdminUsers.tsx` | Nettoyer |
| P2 | useEffect deps instables | `useAdminStatistics.tsx` | Stabiliser les deps |
| P3 | Sidebar trop longue | `AdminSidebar.tsx` | Accordeons repliables |

