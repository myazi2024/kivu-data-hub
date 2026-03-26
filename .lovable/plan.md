

# Diagnostic complet de l'espace Admin — Résultats et orientations

## Synthese

L'espace admin comprend **50+ modules** avec une architecture solide (données réelles Supabase, filtres temporels, pagination). Cependant, le diagnostic révèle **3 catégories de problèmes** : des indicateurs fictifs/calculés artificiellement, des composants non connectés à leurs données, et des fonctionnalités structurelles absentes.

---

## Problemes identifies

### Categorie 1 — Indicateurs fictifs dans le Dashboard

**Bug 1 — CAC (Cout d'Acquisition Client) invente**
- **Fichier** : `useEnhancedAnalytics.tsx` L244-246
- **Code** : `const cac = ltv * 0.25` — Le CAC est estimé à 25% du LTV sans aucune donnée réelle de dépenses marketing
- **Composant** : `BusinessMetrics.tsx` affiche ce CAC et un "Ratio LTV/CAC" et une "Période de remboursement" tous dérivés de cette valeur inventée
- **Impact** : 3 KPI sur 6 dans l'onglet "Métriques Business" sont fictifs

**Bug 2 — Edge Functions toujours "Degradé"**
- **Fichier** : `AdminSystemHealth.tsx` L88-92
- **Code** : Le statut Edge Functions est hardcodé `status: 'degraded'` sans aucun test réel
- **Impact** : Le statut global du système affiche toujours "Dégradé" même si tout fonctionne. Cela rend le monitoring inutile.

**Bug 3 — "Tables surveillées" ne montre que 5 tables**
- **Fichier** : `AdminSystemHealth.tsx` L44
- **Code** : `const tables = ['profiles', 'cadastral_parcels', 'cadastral_contributions', 'payments', 'notifications']`
- **Impact** : Le KPI "Tables surveillées" affiche "5" alors que l'application en utilise ~25+. Nombre trompeur.

### Categorie 2 — Composants non connectes a leurs donnees

**Bug 4 — ComparativeAnalysis reçoit toujours des données vides**
- **Fichier** : `AdminDashboardOverview.tsx` L370
- **Code** : `<ComparativeAnalysis loading={enhancedLoading} />` — pas de props `currentPeriodData` ni `previousPeriodData`
- **Impact** : L'onglet "Comparatif" du dashboard affiche toujours 0 partout. Les données existent dans `useAdminStatistics` (période courante et précédente) mais ne sont pas transmises.

**Bug 5 — CohortAnalysis ne reçoit pas ses données**
- **Fichier** : `AdminDashboardOverview.tsx` L373
- **Code** : `<CohortAnalysis loading={enhancedLoading} />` — pas de prop `cohorts`
- **Impact** : L'onglet "Cohortes" du dashboard est toujours vide malgré le calcul réel dans `useEnhancedAnalytics` (`cohortData`)

**Bug 6 — AutomatedReports utilise des rapports fictifs hardcodés**
- **Fichier** : `AutomatedReports.tsx` L28-50
- **Code** : `defaultReports` contient 3 rapports fictifs avec des dates fabriquées. Les boutons "Télécharger" et "Email" affichent un toast mais ne font rien.
- **Impact** : L'onglet "Rapports" donne l'illusion d'une fonctionnalité automatisée qui n'existe pas.

### Categorie 3 — Fonctionnalites manquantes ou incompletes

**Bug 7 — Alertes du dashboard sans compteur de litiges en attente**
- Le `AlertsPanel` surveille contributions, paiements, utilisateurs bloqués, codes expirés, revendeurs inactifs — mais **pas les litiges en attente**, les **demandes de titre**, ou les **demandes d'expertise** qui ont toutes un flux d'approbation admin.

**Bug 8 — Sidebar "Litiges" sans badge compteur**
- Les litiges (`land-disputes`) n'ont pas de badge compteur dans la sidebar contrairement aux mutations, expertises et permis.

**Bug 9 — Pas de compteur pour les demandes de mortgage (hypothèques)**
- Les demandes d'inscription/radiation d'hypothèques (`mortgage_requests`) ont un flux d'approbation mais aucun compteur dans la sidebar ni alerte dashboard.

---

## Orientations recommandees

### Correction 1 — Supprimer les indicateurs fictifs (3 fichiers)

| Action | Fichier |
|--------|---------|
| Supprimer le calcul CAC inventé (`ltv * 0.25`) et la Période de remboursement. Garder LTV, ARPU, Retention, Churn (calculs réels). | `useEnhancedAnalytics.tsx` |
| Retirer les cartes CAC et Période de remboursement (4 KPI restants au lieu de 6) | `BusinessMetrics.tsx` |
| Tester réellement les Edge Functions (ping d'une function connue comme `cleanup-test-data`) au lieu du statut hardcodé. Élargir la liste des tables surveillées. | `AdminSystemHealth.tsx` |

### Correction 2 — Connecter les composants a leurs donnees (1 fichier)

| Action | Fichier |
|--------|---------|
| Passer `currentPeriodData`/`previousPeriodData` à `ComparativeAnalysis` depuis les stats déjà chargées. Passer `cohorts={enhancedData?.cohortData}` à `CohortAnalysis`. | `AdminDashboardOverview.tsx` |

### Correction 3 — Remplacer les rapports fictifs (1 fichier)

| Action | Fichier |
|--------|---------|
| Remplacer les rapports hardcodés par un vrai export (réutiliser `exportToCSV`/`exportToJSON` existants). Supprimer les boutons Email/Planification non fonctionnels. | `AutomatedReports.tsx` |

### Correction 4 — Completer les alertes et compteurs sidebar (2 fichiers)

| Action | Fichier |
|--------|---------|
| Ajouter compteurs litiges en attente et hypothèques en attente dans les fetchs `Admin.tsx`. Ajouter les badges correspondants dans la sidebar. | `Admin.tsx`, `AdminSidebar.tsx` |
| Ajouter les alertes litiges et hypothèques dans `AlertsPanel` et `useDashboardData` | `AlertsPanel.tsx`, `useDashboardData.tsx` |

---

## Resume

| Categorie | Problèmes | Fichiers impactés |
|-----------|-----------|-------------------|
| Indicateurs fictifs | 3 (CAC, Edge Functions, tables surveillées) | 3 |
| Composants non connectés | 3 (Comparatif, Cohortes, Rapports) | 2 |
| Fonctionnalités manquantes | 3 (alertes litiges, badge sidebar, compteur hypothèques) | 4 |
| **Total** | **9 problèmes** | **~8 fichiers** |

