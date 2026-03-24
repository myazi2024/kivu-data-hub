

# Audit visuel — Accueil, Analytics, Carte RDC

## Résultat

L'accueil (Index), les blocs Analytics (`src/components/visualizations/`) et la carte DRC (`DRCInteractiveMap.tsx`) sont **globalement alignés** sur les indicateurs CCC. Les divergences résiduelles se trouvent dans des composants périphériques qui touchent ces zones.

## Divergences identifiées

### 1. `InteractiveMap.tsx` — Filtres de type de propriété (lignes 115-211)

Labels hardcodés avec les **anciennes valeurs** :
- `'residential' → 'Résidentiel'` au lieu de `'Habitation'`
- `'commercial' → 'Commercial'` au lieu de `'Commerce'`
- `'industrial' → 'Industriel'` au lieu de `'Industrie'`

Apparaît dans les labels de filtre ET les options du `<Select>`.

### 2. `CadastralMap.tsx` — Popup de lot (ligne 809)

Fallback hardcodé `'résidentiel'` pour `intended_use` :
```
Usage: ${lot.intended_use || 'résidentiel'}
```
Devrait être `'Habitation'` pour s'aligner sur le CCC.

### 3. `landTitleDeduction.ts` — Détection d'usage (lignes 84-88)

Compare les anciennes valeurs **sans utiliser le normaliseur** :
- `'Résidentiel'` au lieu de passer par `normalizeDeclaredUsage()`
- `'Commercial'`, `'Industriel'`, `'Mixte'` — idem

Devrait inclure les valeurs CCC (`'Habitation'`, `'Commerce'`, `'Industrie'`, `'Usage mixte'`) ou appeler le normaliseur en amont.

### 4. `testCadastralReport.ts` — Données de test (ligne 28)

`declared_usage: 'Résidentiel'` — devrait être `'Habitation'`.

### 5. `constructionUsageResolver.ts` — Clés de cascade (lignes 7-14)

Utilise `Résidentielle`, `Commerciale`, `Industrielle` pour les clés de `LOCATION_ELIGIBLE_KEYS`. Ces valeurs correspondent aux **types de construction** (pas aux usages), et proviennent du CCC (`construction_type`). A vérifier : si le CCC utilise bien ces mêmes valeurs pour `construction_type`, c'est correct. Sinon, divergence.

### Pas de divergence

- **Accueil** (`Index.tsx`, `HeroSection.tsx`, `ServicesSection.tsx`) : aucun indicateur CCC hardcodé
- **Analytics** (`src/components/visualizations/`) : aucune valeur hardcodée divergente
- **DRCInteractiveMap.tsx** : utilise des clés techniques (`residential`, `commercial`, `mixte`) dans `repartitionTypologique` qui alimentent un type TypeScript — pas affiché directement en UI
- **ZoneDetailsPanel.tsx** : `Densité résidentielle` est un libellé de KPI admin, pas un indicateur CCC

## Plan de correction

| Fichier | Correction |
|---------|-----------|
| `src/components/InteractiveMap.tsx` | Remplacer les labels : `Résidentiel→Habitation`, `Commercial→Commerce`, `Industriel→Industrie` |
| `src/pages/CadastralMap.tsx` | Fallback `'résidentiel'` → `'Habitation'` |
| `src/utils/landTitleDeduction.ts` | Ajouter les valeurs CCC dans les comparaisons (`'Habitation'`, `'Commerce'`, `'Industrie'`, `'Usage mixte'`) |
| `src/utils/testCadastralReport.ts` | `declared_usage: 'Résidentiel'` → `'Habitation'` |

4 fichiers à modifier, corrections mineures de chaînes de caractères.

