

# Alignement du filtre "Lieu" et des visuels geographiques sur la structure CCC

## Probleme

Le composant `GeoCharts` affiche systematiquement tous les niveaux geographiques (urbain ET rural) en meme temps, sans respecter le filtre de section ni la hierarchie du formulaire CCC. Il manque aussi un graphique "Par section" (Urbaine/Rurale) entre Province et les sous-niveaux.

La structure CCC est : **Province → Section → (Urbaine: Ville, Commune, Quartier) ou (Rurale: Territoire, Collectivite, Groupement, Village)**. Les visuels doivent suivre cette meme logique.

## Modifications

### 1. `GeoCharts.tsx` — Restructurer les visuels geographiques

**Ajouter un graphique "Par section"** (Urbaine vs Rurale) juste apres "Par province". Ce chart montre la repartition entre sections.

**Conditionner l'affichage des sous-niveaux** en fonction des donnees presentes :
- Si uniquement des donnees urbaines : afficher Ville → Commune → Quartier (pas les niveaux ruraux)
- Si uniquement des donnees rurales : afficher Territoire → Collectivite → Groupement → Village (pas les niveaux urbains)
- Si les deux : afficher d'abord Section, puis les deux cascades

**Supprimer le graphique "Par avenue"** — trop granulaire et non pertinent en analytics (le formulaire CCC l'inclut mais il n'apporte pas de valeur analytique)

### 2. Aucun changement dans `AnalyticsFilters.tsx`

Le filtre "Lieu" suit deja la bonne structure (Province → Section → cascade dependante). Le probleme est uniquement cote visuels.

### 3. Aucun changement dans `analyticsHelpers.ts`

`matchesLocation` et `buildFilterLabel` gerent deja correctement la hierarchie.

### Detail technique

```typescript
// GeoCharts.tsx — ajout du graphique section
const bySection = useMemo(() => {
  const counts: { name: string; value: number }[] = [];
  if (urbanRecords.length > 0) counts.push({ name: 'Urbaine', value: urbanRecords.length });
  if (ruralRecords.length > 0) counts.push({ name: 'Rurale', value: ruralRecords.length });
  return counts;
}, [urbanRecords, ruralRecords]);

// Rendu : Province → Section → sous-niveaux conditionnels
<ChartCard title="Par section" data={bySection} type="donut" ... />
// Puis urban charts seulement si urbanRecords.length > 0
// Puis rural charts seulement si ruralRecords.length > 0
```

### Fichier modifie
- `src/components/visualizations/shared/GeoCharts.tsx` — ajout chart "Par section", suppression chart "Par avenue", reordonnancement des charts

