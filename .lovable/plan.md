

# Audit detaille des visuels — Donnees foncieres (Analytics)

## Architecture globale

Le systeme comprend **14 blocs de visualisation** (onglets), chacun avec ses propres filtres, KPIs et graphiques. Les composants partages sont `ChartCard`, `KpiGrid`, `GeoCharts`, `AnalyticsFilters` et `chartInsights`.

---

## 1. Points positifs

- **Architecture modulaire** : chaque bloc est un composant `memo` independant avec son propre etat de filtre
- **Systeme de configuration admin** : `useAnalyticsChartsConfig` permet de masquer/renommer des graphiques depuis la BDD
- **Filtres hierarchiques CCC** : Pays → Province → Section → cascade urbaine/rurale correctement implementes
- **Insights automatiques** : `generateInsight()` produit des textes contextuels pertinents pour chaque graphique
- **Copie en image** : chaque graphique est copiable dans le presse-papiers (useCopyAsImage)
- **Watermark et date** : chaque graphique affiche un footer avec date et watermark configurable
- **Normalisation des donnees** : les types de construction, usages et titres sont normalises avant comptage

---

## 2. Problemes identifies

### 2.1. Doublons de graphiques

**MortgagesBlock** — Le graphique `trend` (Contrats/mois, ligne 81) et `evolution` (ligne 83) utilisent **exactement les memes donnees** (`trend`). C'est un doublon pur.

**ParcelsWithTitleBlock** — Ce bloc est un "mega-bloc" qui agglomere parcelles, taxes, hypotheques et permis dans un seul onglet. Cela cree des **doublons avec les blocs dedies** :
- `taxes`, `taxes-year`, `taxes-amount` → dupliquent `TaxesBlock`
- `mortgages`, `creditors`, `mortgage-status`, `mortgage-trend` → dupliquent `MortgagesBlock`
- `permits`, `permit-admin`, `permit-validity`, `permit-service` → dupliquent `BuildingPermitsBlock`

### 2.2. Incoherences de nommage des chart keys

**BuildingPermitsBlock** — Les cles de visibilite `request-type`, `construction-type`, `declared-usage` ne correspondent pas au contenu reel :
- `request-type` → affiche "En cours vs Expire" (devrait etre `current-status`)
- `construction-type` → affiche "Service emetteur" (devrait etre `issuing-service`)
- `declared-usage` → affiche "Periode de validite" (devrait etre `validity-period`)

Ceci signifie que si un admin masque `construction-type` depuis la config, il masque en realite le graphique "Service emetteur" — confusion totale.

### 2.3. GeoCharts dans la grille

Dans tous les blocs, `<GeoCharts records={filtered} />` est place directement dans un `grid grid-cols-1 md:grid-cols-2`. GeoCharts rend **jusqu'a 10 graphiques** (Province, Section, Commune, Quartier, Avenue, Territoire, Collectivite, Groupement, Village). Comme ce sont des fragments (`<>`), ils s'inserent dans la grille comme des enfants individuels — ce qui fonctionne, mais l'alignement des paires de colonnes peut etre casse si le nombre de graphiques geo est impair.

### 2.4. ChartCard hauteur fixe

`CHART_HEIGHT = 160px` est utilise pour tous les graphiques. Pour les bar-h avec des labels longs (labelWidth=120) et de nombreuses categories, le contenu peut etre tronque. Aucun mecanisme d'adaptation dynamique n'existe.

### 2.5. Donut/Pie labels tronques

Le `truncLabel` coupe a 12 caracteres. Pour des noms comme "Certificat d'enregistrement" ou "Zone inondable", le label est illisible (`Certificat d…`). Les pie/donut avec `labelLine={false}` (donut) et `outerRadius={55}` peuvent avoir des labels qui se chevauchent quand il y a plus de 4-5 categories.

### 2.6. Performance — re-renders

Chaque bloc fait un `useState` pour son filtre et un `useMemo` pour les donnees filtrees. Cependant, le `useEffect` qui reinitialise le filtre sur `mapProvince` :
```typescript
useEffect(() => { setFilter(f => ({ ...defaultFilter, province: mapProvince || undefined })); }, [mapProvince]);
```
Ecrase **tous les filtres** (temps, statut, paiement) a chaque changement de province sur la carte. Si l'utilisateur a configure un filtre temporel precis, il est perdu.

### 2.7. Manque de type safety

`LandAnalyticsData` utilise `any[]` pour toutes les collections. Aucune interface typee pour les enregistrements (parcels, contributions, etc.). Les acces comme `r.fraud_score`, `r.dispute_nature` sont non-types.

### 2.8. AnalyticsFilters — imports inutilises

`getVillesForProvince` est importe et utilise pour obtenir `implicitVille` qui sert de cle de lookup intermediaire. Ce hack silencieux suppose que la premiere ville de la liste geographique correspond toujours a la section urbaine de la province — potentiellement faux.

### 2.9. OwnershipHistoryBlock — filtre de date

Le bloc utilise `dateField="ownership_start_date"` mais aussi `hideStatus` et `hidePaymentStatus`. Les donnees de transfert de propriete n'ont pas de `created_at` standard, ce qui fait que le filtre temporel par defaut peut ne filtrer aucun enregistrement si `ownership_start_date` est null.

### 2.10. Pas de gestion d'erreur de chargement

Si `useLandDataAnalytics` echoue (erreur reseau, timeout), les blocs recoivent des tableaux vides silencieusement. Aucun message d'erreur n'est affiche a l'utilisateur.

---

## 3. Corrections recommandees

### Priorite haute

| # | Correction | Fichier(s) |
|---|-----------|------------|
| 1 | Supprimer le doublon `trend`/`evolution` dans MortgagesBlock | `MortgagesBlock.tsx` |
| 2 | Renommer les chart keys dans BuildingPermitsBlock (`request-type` → `current-status`, `construction-type` → `issuing-service`, `declared-usage` → `validity-period`) | `BuildingPermitsBlock.tsx` + `useAnalyticsChartsConfig.ts` registry |
| 3 | Corriger le useEffect mapProvince pour ne reseter que la province (pas tous les filtres) | Tous les 14 blocs |

### Priorite moyenne

| # | Correction | Fichier(s) |
|---|-----------|------------|
| 4 | Retirer les sous-graphiques taxes/hypotheques/permis de ParcelsWithTitleBlock pour eliminer les doublons avec les blocs dedies | `ParcelsWithTitleBlock.tsx` |
| 5 | Augmenter `truncLabel` max de 12 a 16 caracteres pour les pie/donut | `ChartCard.tsx` |
| 6 | Adapter CHART_HEIGHT dynamiquement pour les bar-h avec beaucoup de categories (ex: min(160, items * 28)) | `ChartCard.tsx` |

### Priorite basse

| # | Correction | Fichier(s) |
|---|-----------|------------|
| 7 | Typer les collections dans `LandAnalyticsData` au lieu de `any[]` | `useLandDataAnalytics.tsx` |
| 8 | Supprimer le hack `implicitVille` dans AnalyticsFilters et utiliser directement les communes depuis les donnees | `AnalyticsFilters.tsx` |
| 9 | Ajouter un etat d'erreur visible quand le chargement des donnees echoue | `ProvinceDataVisualization.tsx` |

---

## 4. Resume

Les visuels sont fonctionnellement complets et bien structures. Les problemes principaux sont : **doublons de graphiques** (MortgagesBlock trend/evolution, ParcelsWithTitleBlock qui duplique 3 blocs), **nommage incorrect des chart keys** dans BuildingPermitsBlock (qui casse la configuration admin), et le **useEffect mapProvince qui ecrase les filtres** de l'utilisateur. Les corrections 1-3 sont critiques et necessitent environ 30 minutes d'implementation.

