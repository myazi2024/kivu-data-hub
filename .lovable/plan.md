

# Afficher les territoires sur la carte quand filtre = Rurale

## Contexte

Quand l'utilisateur sélectionne `Rurale > Tous les territoires` dans le filtre analytique, la carte RDC (panneau gauche) continue d'afficher la carte des provinces. Elle ne bascule vers `DRCTerritoiresMap` que si un territoire spécifique est sélectionné ET une province est choisie.

**Objectif** : Quand le filtre de section est `rurale`, afficher automatiquement la couche des 164 territoires (depuis `drc-territoires.geojson` existant) sur la carte RDC.

## Modifications

### 1. Créer un `SectionTypeContext` — `AnalyticsFilters.tsx`

Ajouter un nouveau contexte `SectionTypeContext` et `SectionTypeChangeContext` pour propager le type de section sélectionné dans les filtres vers la carte.

### 2. Propager le contexte — `ProvinceDataVisualization.tsx`

- Ajouter une prop `onSectionTypeChange` et `selectedSectionType` à l'interface
- Envelopper le contenu avec les nouveaux providers de section type

### 3. Connecter dans `DRCInteractiveMap.tsx`

- Ajouter un state `selectedSectionType` (string)
- Passer `onSectionTypeChange={setSelectedSectionType}` au composant `ProvinceDataVisualization`
- Modifier la logique conditionnelle de la carte (lignes ~371-405) :

```text
Logique actuelle :
  territoire + province → DRCTerritoiresMap
  ville + commune (goma) → DRCQuartiersMap
  ville → DRCCommunesMap
  sinon → DRCMapWithTooltip (provinces)

Nouvelle logique :
  territoire + province → DRCTerritoiresMap (inchangé)
  sectionType === 'rurale' + province → DRCTerritoiresMap (NOUVEAU)
     avec tous les territoires de la province, aucun sélectionné
  sectionType === 'rurale' + pas de province → DRCTerritoiresMap (NOUVEAU)
     avec les 164 territoires, vue complète RDC
  ville + commune (goma) → DRCQuartiersMap (inchangé)
  ville → DRCCommunesMap (inchangé)
  sinon → DRCMapWithTooltip (inchangé)
```

### 4. Adapter `DRCTerritoiresMap.tsx`

- Modifier le filtrage : quand `territoireNames` est vide/undefined mais `showAll` est true, afficher toutes les features
- Ajouter une prop optionnelle `showAll?: boolean` pour le mode tous-territoires
- Adapter le bbox pour cadrer sur la RDC entière quand `showAll` est actif

### 5. Propager le sectionType depuis les filtres — `AnalyticsFilters.tsx`

Quand le select de section change, appeler le callback `SectionTypeChangeContext` pour informer la carte.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | +2 contextes (SectionType, SectionTypeChange), appeler le callback |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | +props sectionType, providers |
| `src/components/DRCInteractiveMap.tsx` | +state sectionType, logique conditionnelle carte |
| `src/components/DRCTerritoiresMap.tsx` | +prop showAll, afficher tous les territoires |

