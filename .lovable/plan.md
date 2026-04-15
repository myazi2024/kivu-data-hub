
# Audit détaillé de l'espace Admin

## Architecture générale

```text
Admin.tsx (orchestrateur)
  ├── AdminSidebar.tsx (navigation, 10 catégories, 65+ onglets)
  ├── AdminDashboardHeader.tsx (barre recherche ⌘K, notifications, profil)
  └── tabComponents{} (lazy-loaded, 66 composants)
      ├── Vue d'ensemble (3)
      ├── Utilisateurs & Sécurité (4)
      ├── Contributions CCC (5)
      ├── Paiements (7)
      ├── Facturation & Commerce (8)
      ├── Carte & Configuration (9)
      ├── Demandes & Procédures (10)
      ├── Historiques & Litiges (7)
      ├── Contenu (6)
      └── Système (6)
```

Total : **~32 700 lignes** dans `src/components/admin/*.tsx` + ~9 700 dans sous-dossiers = **~42 400 lignes** de code admin.

## Points positifs

1. **Lazy loading** systématique de tous les onglets — bon temps de chargement initial
2. **Recherche globale** (⌘K) avec résultats menus + DB (utilisateurs, parcelles, factures)
3. **Badges en temps réel** pour 9 files d'attente (CCC, paiements, litiges, hypothèques, etc.)
4. **Sidebar collapsible** avec recherche par mots-clés et totaux de badges par catégorie
5. **Export CSV/JSON** sur le dashboard + plusieurs sous-modules
6. **Breadcrumb** dynamique catégorie → label
7. **Mode Test** avec génération/nettoyage de données de test
8. **Vérification admin** côté client via `user_roles` (pas localStorage)

---

## Anomalies détectées

### Sévérité CRITIQUE

| # | Localisation | Problème |
|---|-------------|----------|
| 1 | `AdminPayments.tsx:90-95` | **Mise à jour directe du statut de paiement** depuis le client (`supabase.update`). Viole la règle projet : les paiements doivent passer par des Edge Functions avec `SERVICE_ROLE_KEY`. Risque de manipulation de statuts. |
| 2 | Toutes les requêtes admin (Payments, CCC, Mutations, LandTitle, Expertise) | **Aucun `.limit()`** sur les `SELECT`. Supabase tronque silencieusement à 1000 lignes. Un admin avec >1000 enregistrements verra des données incomplètes sans aucun avertissement. |

### Sévérité MAJEURE

| # | Localisation | Problème |
|---|-------------|----------|
| 3 | `Admin.tsx:45` | **Doublon de route** : `map-legend` et `contribution-config` chargent le même composant `AdminContributionConfig`. Le tab `map-legend` reçoit `{ initialTab: 'map', scrollToLegend: true }` mais `AdminContributionConfig` n'accepte peut-être pas ces props — à vérifier. |
| 4 | `AdminCCCContributions.tsx` | **1762 lignes** — très au-dessus du seuil de 1000 lignes. Contient validation, approbation, rejet, galerie docs, appels, et autorisations dans un seul fichier. Candidat urgent à la modularisation. |
| 5 | `AdminContributionConfig.tsx` | **1620 lignes** — même problème. |
| 6 | `AdminMutationRequests.tsx` | **1123 lignes** — même problème. |
| 7 | `AdminExpertiseRequests.tsx` | **1113 lignes** — même problème. |

### Sévérité MINEURE

| # | Localisation | Problème |
|---|-------------|----------|
| 8 | `AdminUserRoles.tsx` (388 lignes) | **Composant orphelin** : remplacé par `AdminUserRolesEnhanced.tsx` mais jamais supprimé. Code mort. |
| 9 | `AdminDocumentVerifications.tsx` (190 lignes) | **Composant orphelin** : n'apparaît ni dans le sidebar ni dans `tabComponents`. Inaccessible. |
| 10 | `AdminSearchConfig.tsx` (230 lignes) | **Composant orphelin** : le tab `search-config` charge `AdminSearchBarConfig`, pas `AdminSearchConfig`. |
| 11 | `Admin.tsx:104-116` | **Vérification admin client-side uniquement** : la requête `user_roles` est faite côté client avec la clé anon. Les RLS doivent protéger les données des onglets admin, mais si une table a des policies trop permissives, un non-admin pourrait accéder aux données via l'API directe. |
| 12 | `AdminPayments.tsx:46-48` | **`useEffect(() => { fetchPayments(); }, [])`** sans cleanup ni gestion d'abort. Si le composant se démonte avant la réponse, risque de `setState` sur composant démonté (warning React). Même pattern dans 6+ composants admin. |

### INFO

| # | Observation |
|---|-------------|
| 13 | **66 onglets** dans le sidebar — la densité est élevée. L'UX pourrait bénéficier d'un regroupement ou d'une hiérarchie plus profonde. |
| 14 | Le `REFRESHABLE_TABS` (ligne 81) ne contient que `users`, `payments`, `publications`. D'autres onglets avec des files d'attente (CCC, mutations, etc.) ne bénéficient pas du refresh automatique après une action. |
| 15 | Pas de gestion d'erreur globale (error boundary) autour du `Suspense` pour les composants lazy-loadés. Un composant qui crash affiche un écran blanc. |

---

## Plan de corrections proposé

### Phase 1 — Sécurité & Données (prioritaire)

| Action | Fichier | Détail |
|--------|---------|--------|
| A1 | `AdminPayments.tsx` | Remplacer `supabase.update` par un appel Edge Function pour la mise à jour de statut |
| A2 | 5+ composants admin | Ajouter pagination serveur ou `.limit()` explicite + indicateur "résultats tronqués" |
| A3 | `Admin.tsx` | Ajouter un `ErrorBoundary` autour du `Suspense` |

### Phase 2 — Nettoyage code mort

| Action | Fichier | Détail |
|--------|---------|--------|
| A4 | `AdminUserRoles.tsx` | Supprimer (remplacé par Enhanced) |
| A5 | `AdminDocumentVerifications.tsx` | Supprimer ou intégrer dans le sidebar |
| A6 | `AdminSearchConfig.tsx` | Supprimer (remplacé par SearchBarConfig) |
| A7 | `Admin.tsx:45` | Corriger le doublon `map-legend` |

### Phase 3 — Modularisation (maintenabilité)

| Action | Fichier | Détail |
|--------|---------|--------|
| A8 | `AdminCCCContributions.tsx` | Extraire en sous-composants (validation, détail, galerie) |
| A9 | `AdminContributionConfig.tsx` | Même approche |
| A10 | `AdminMutationRequests.tsx` | Même approche |
| A11 | `AdminExpertiseRequests.tsx` | Même approche |

---

## Résumé

| Catégorie | Count |
|-----------|-------|
| Critique (sécurité/données) | 2 |
| Majeur (maintenabilité) | 5 |
| Mineur (code mort, patterns) | 5 |
| Info | 3 |

**Recommandation** : Commencer par la Phase 1 (sécurité), puis Phase 2 (nettoyage rapide), puis Phase 3 (modularisation progressive).
