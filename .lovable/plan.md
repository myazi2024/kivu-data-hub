

## Audit de l'espace admin

### Vue d'ensemble — État global : **bon, sain, mais perfectible**

L'espace admin compte ~110 onglets répartis en 9 catégories, ~33 000 lignes au total. La sidebar est centralisée (`sidebarConfig.ts`), les compteurs viennent d'un RPC unique (`get_admin_pending_counts`), les routes sont lazy-loadées avec retry (`lazyWithRetry`), et un `ErrorBoundary` enveloppe le contenu. Les hubs transversaux sont en place (Demandes, Historiques, Lotissement, Config, Contenu, Système).

### Constats par sévérité

#### P0 — À corriger en priorité

1. **Aucun garde-fou de permissions granulaires sur les onglets**
   - `Admin.tsx` vérifie seulement `admin`/`super_admin` au montage, puis affiche **n'importe quel onglet** demandé via `?tab=`.
   - Conséquence : un `admin` standard peut accéder à `audit-logs`, `system-settings`, `roles`, `permissions`, `test-mode`, `fec-export`, etc., alors que `usePermissions` existe déjà côté DB.
   - Aucun composant (sauf `AdminPermissions`) ne consomme `usePermissions` pour gérer la visibilité.

2. **Onglets orphelins dans la sidebar (mais routables en URL)**
   - 6 routes lazy-loadées dans `Admin.tsx` ne sont **plus listées** dans `sidebarConfig.ts` :
     `subdivision-requests`, `subdivision-fees-config`, `subdivision-zoning-rules`, `subdivision-lots`, `subdivision-analytics`, `unified-payments`.
   - Voulu pour les 5 sous-onglets Lotissement (consolidés dans le hub) ; mais `unified-payments` semble vraiment orphelin → soit supprimer la route, soit la rajouter au menu.

#### P1 — Dette technique notable

3. **Fichiers monolithiques restants (>700 lignes)**
   - `AdminCCCContributions.tsx` : **1704 lignes** (déjà partiellement modulaire via `ccc/` mais l'orchestrateur reste énorme).
   - `AdminExpertiseRequests.tsx` (868), `AdminPaymentMethods.tsx` (846), `AdminContributionConfig.tsx` (820), `AdminLandTitleRequests.tsx` (804), `AdminAppearance.tsx` (735), `AdminAnalyticsChartsConfig.tsx` (707).
   - Pattern à appliquer (déjà établi sur Subdivision) : `Toolbar` + `Stats` + `List/Table` + `DetailsDialog` + `ActionDialog` + `helpers.ts` + `types.ts`.

4. **140 occurrences de `as any`** dans `src/components/admin/*.tsx`
   - Décalage entre types Supabase générés et schéma effectif (notamment colonnes nullables, JSON dynamiques).
   - Risque de régression silencieuse lors d'une regénération de types.

#### P2 — Cohérence UX & maintenabilité

5. **Hubs de tailles très inégales**
   - `AdminHistoryHub.tsx` : seulement **31 lignes** (squelette ?).
   - `AdminSubdivisionHub.tsx` : 74 lignes.
   - À comparer avec `AdminContentHub` (201) ou `AdminSystemHub` (182). Vérifier que le hub Historiques offre bien la valeur promise par la mémoire (timeline, alertes croisées).

6. **Liens legacy non migrés**
   - `InvoiceSourceLink.tsx` pointe encore vers `subdivision-requests` (legacy) au lieu de `subdivision-hub`.
   - `AdminRequestsHub.tsx` route aussi vers `subdivision-requests`. À harmoniser sur `subdivision-hub?tab=requests` (ou équivalent).

7. **Pas de breadcrumb pour les hubs à onglets internes**
   - Sur `subdivision-hub`, `requests-hub`, `config-hub` : le breadcrumb s'arrête à « Lotissement » sans afficher l'onglet actif (file/barème/zonage…).

#### P3 — Observabilité

8. **Absence de télémétrie sur la navigation admin**
   - Aucun event analytics tracé sur les transitions d'onglets ni sur les actions admin critiques (approbation, rejet, purge test). Utile pour audit interne et détection d'usage anormal.

9. **Pas de cache/invalidation centralisée** côté React-Query pour les compteurs sidebar (refetch manuel via `refreshCounts`).

### Plan d'action proposé (séquentiel, opt-in)

| Lot | Effort | Contenu |
|---|---|---|
| **L0** | S | Fix orphelin `unified-payments` ; redirections legacy `subdivision-requests` → `subdivision-hub` (InvoiceSourceLink, RequestsHub) |
| **L1** | M | Garde-fou `usePermissions` dans `Admin.tsx` : si l'onglet demandé n'est pas autorisé pour le rôle, fallback dashboard + toast. Filtrage `menuItems` côté sidebar. |
| **L2** | M | Modulariser `AdminCCCContributions.tsx` (1704→~300) selon le pattern Subdivision |
| **L3** | M | Modulariser `AdminExpertiseRequests`, `AdminLandTitleRequests`, `AdminPaymentMethods`, `AdminContributionConfig` |
| **L4** | S | Compléter `AdminHistoryHub` (timeline + alertes croisées promises par la mémoire) |
| **L5** | S | Breadcrumb à 4 niveaux pour les hubs (Admin > Catégorie > Hub > Onglet) |
| **L6** | M | Réduire `as any` : regénérer types Supabase, créer types narrow `subdivision/types.ts`-like par module |
| **L7** | S | Tracking analytics admin (page_view, action) + invalidation queryKey unifiée |

### Hors-périmètre confirmé
- Erreurs `PGRST002` et `ChunkLoadError` : déjà mitigées par `withSchemaRetry` + `lazyWithRetry`.
- Module Lotissement : déjà audité P0→P3.
- Sécurité 2FA admin : tracée séparément dans `mem://security/2fa-admin-debt-fr`.

**Question :** Lance-t-on **L0 + L1** (impact sécurité immédiat) en premier, ou tout enchaîner L0→L7 ?

