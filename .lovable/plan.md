

# Audit des fonctionnalités intuitives — Plan d'intégration

## Résultat de l'audit

### A. Fonctionnalités ABSENTES à ajouter

| # | Fonctionnalité | Impact | Fichiers |
|---|---------------|--------|----------|
| 1 | **Bouton "Retour en haut"** | Aucun `ScrollToTop` dans l'app. Les pages longues (Legal, Articles, Services, About, Publications) n'ont aucun moyen de remonter rapidement. | Nouveau : `src/components/ScrollToTopButton.tsx`, intégrer dans `App.tsx` ou les pages longues |
| 2 | **Scroll-to-top automatique au changement de route** | Aucun `useScrollToTop` sur changement de route — l'utilisateur navigue et reste au milieu de la page. | Nouveau : `src/hooks/useScrollToTop.ts`, appeler dans `App.tsx` |
| 3 | **SEO / `<Helmet>` manquant sur 10+ pages** | Seules 5 pages ont des balises `<Helmet>` (Map, Articles, ArticleDetail, Verify, Pitch). Pages sans : Index, Services, Publications, About, AboutCCC, AboutDiscountCodes, Partnership, Legal, Auth, UserDashboard, Admin, NotFound. | Ajouter `<Helmet>` avec `<title>` + `<meta description>` dans chaque page |
| 4 | **Services non cliquables** | Les cartes sur `/services` sont purement décoratives — aucun lien, aucun `onClick`. L'utilisateur ne peut pas naviguer vers le service. | `src/pages/Services.tsx` — ajouter `Link` ou `onClick` vers `/cadastral-map` |
| 5 | **Skeleton/loading manquant** sur Articles (liste), Services, About, Partnership | Seules Publications et ArticleDetail ont des skeletons. Les autres pages affichent un vide pendant le chargement. | Ajouter des skeletons dans les pages concernées |
| 6 | **Confirmation de suppression (AlertDialog)** | Aucune page publique n'utilise `AlertDialog` pour confirmer les actions destructives. Les actions admin semblent aussi utiliser `window.confirm` ou rien. | Audit ciblé admin + remplacement par `AlertDialog` |
| 7 | **Tooltips sur boutons d'action icon-only** | La plupart des boutons icon-only (copier, partager, supprimer) dans le dashboard utilisateur n'ont pas de tooltip. | Wrapper les boutons icon-only avec `<Tooltip>` |
| 8 | **Fil d'Ariane (Breadcrumbs)** | Le composant `breadcrumb.tsx` existe mais n'est utilisé que dans Admin (et en version custom, pas le composant UI). Pages UserDashboard, ArticleDetail n'ont pas de breadcrumb. | Ajouter breadcrumbs dans UserDashboard et ArticleDetail |
| 9 | **Raccourci clavier global (Ctrl+K)** | Existe uniquement dans l'admin (`AdminDashboardHeader`). Aucun raccourci de recherche rapide côté public. | Nouveau : `src/components/CommandPalette.tsx` — recherche rapide parcelles/articles/services |
| 10 | **Feedback visuel sur actions réussies — animation** | Les toasts sont présents, mais aucune micro-animation de succès (checkmark animé, confetti, etc.) sur les soumissions majeures (contribution CCC, paiement). | Optionnel — ajouter une animation de succès dans `FormSummaryStep` |

### B. Fonctionnalités DÉJÀ présentes (aucune action)

| Fonctionnalité | Statut |
|---------------|--------|
| Loading spinners (auth, admin, dashboard) | ✅ |
| Skeleton publications | ✅ |
| Skeleton article detail | ✅ |
| Copy-to-clipboard avec feedback | ✅ 16 fichiers |
| Empty states ("Aucun X trouvé") | ✅ 36+ fichiers |
| Share (Web Share API) article | ✅ |
| Keyboard shortcuts (canvas, admin search) | ✅ |
| Progress bars (CCC form) | ✅ |
| Toast notifications | ✅ Partout |
| Responsive tables | ✅ |
| Dark mode support | ✅ |

## Plan d'implémentation (par priorité)

### Priorité 1 — Navigation & UX de base

**1. `src/components/ScrollToTopButton.tsx`** (nouveau)
- Bouton flottant `fixed bottom-4 right-4` avec `ChevronUp`, visible après scroll > 300px
- Apparition avec `animate-fade-in`, disparition progressive
- Z-index inférieur aux modales (`z-30`)

**2. `src/hooks/useScrollToTop.ts`** (nouveau)
- Hook appelé dans `App.tsx` qui scroll en haut à chaque changement de `location.pathname`

**3. `src/pages/Services.tsx`** — Cartes cliquables
- Ajouter un mapping service → route/action (ex: "Recherche cadastrale" → `/cadastral-map`)
- Wrapper chaque `Card` dans un `Link` ou ajouter `cursor-pointer` + `onClick`

### Priorité 2 — SEO

**4. Ajouter `<Helmet>` dans 10 pages** :
- Index, Services, Publications, About, AboutCCC, AboutDiscountCodes, Partnership, Legal, Auth, UserDashboard, NotFound
- Template : `<title>{Page} | {appName}</title>` + `<meta name="description" ...>`

### Priorité 3 — Feedback & accessibilité

**5. Tooltips sur boutons icon-only** dans UserDashboard tabs et actions
- Identifier les boutons sans texte ni tooltip
- Wrapper avec `<Tooltip><TooltipTrigger>...<TooltipContent>`

**6. Breadcrumbs** dans UserDashboard (Accueil > Mon compte > [onglet]) et ArticleDetail (Articles > [titre])

**7. Skeletons** pour Articles (liste) et Services pendant le chargement initial

### Priorité 4 — Avancé (optionnel)

**8. CommandPalette (Ctrl+K)** côté public — recherche rapide parcelles/pages
**9. Micro-animations de succès** sur soumissions majeures

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/ScrollToTopButton.tsx` | **Nouveau** — bouton retour en haut |
| `src/hooks/useScrollToTop.ts` | **Nouveau** — reset scroll au changement de route |
| `src/App.tsx` | Intégrer `useScrollToTop` + `ScrollToTopButton` |
| `src/pages/Services.tsx` | Cartes cliquables avec liens |
| `src/pages/Index.tsx` | Helmet SEO |
| `src/pages/About.tsx` | Helmet SEO |
| `src/pages/AboutCCC.tsx` | Helmet SEO |
| `src/pages/AboutDiscountCodes.tsx` | Helmet SEO |
| `src/pages/Partnership.tsx` | Helmet SEO |
| `src/pages/Legal.tsx` | Helmet SEO |
| `src/pages/Auth.tsx` | Helmet SEO |
| `src/pages/Publications.tsx` | Helmet SEO + skeleton amélioration |
| `src/pages/Services.tsx` | Helmet SEO |
| `src/pages/UserDashboard.tsx` | Helmet SEO + breadcrumb |
| `src/pages/NotFound.tsx` | Helmet SEO |
| `src/pages/ArticleDetail.tsx` | Breadcrumb |

