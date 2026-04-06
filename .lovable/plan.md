

# Refonte complete du filtre "Lieu" — alignement CCC

## Probleme actuel

1. **Pas de filtre "Pays"** — la valeur "Rép. Dém. du Congo" est melangee dans le select Province comme option "Toutes"
2. **Section conditionnelle** — ne s'affiche que si la province est selectionnee ET qu'il existe des donnees urbaines/rurales ; devrait toujours s'afficher apres Province
3. **Sous-filtres conditionnes par geographicData** — `showUrbanSub` exige `villes.length > 0` depuis le fichier statique ; si la province n'a pas d'entrees dans geographicData, les cascades sont invisibles meme avec des donnees reelles
4. **GeoCharts** — manque le graphique "Par avenue" (supprime precedemment)

## Structure cible

```text
Pays (RDC fixe)
 └─ Province (Toutes les provinces)
     └─ Section (Toutes les sections)
         ├─ Urbaine
         │   └─ Commune (Toutes) → Quartier (Tous) → Avenue (Toutes)
         └─ Rurale
             └─ Territoire (Tous) → Collectivite (Toutes) → Groupement (Tous) → Village (Tous)
```

Note : le niveau "Ville" est supprime car dans le formulaire CCC la cascade urbaine apres Section est directement Commune (pas Ville). Les donnees `ville` dans la base correspondent en pratique au nom de la province ou de la section, pas a un niveau hierarchique distinct.

## Modifications

### 1. `AnalyticsFilters.tsx` — Refonte du Row 2 Lieu

- **Ajouter un select "Pays"** fixe a "Rép. Dém. du Congo" (non modifiable, purement visuel pour la hierarchie)
- **Province** : valeur par defaut "Toutes les provinces", liste depuis `getAllProvinces()`
- **Section** : toujours visible apres Province (meme sans province selectionnee), valeur par defaut "Toutes les sections"
- **Cascade urbaine** : visible des que `sectionType === 'urbaine'` (ou `'all'` sans donnees rurales). Niveaux : Commune → Quartier → Avenue. Options construites depuis geographicData + fallback extraction des donnees reelles
- **Cascade rurale** : visible des que `sectionType === 'rurale'` (ou `'all'` sans donnees urbaines). Niveaux : Territoire → Collectivite → Groupement → Village
- Supprimer le select "Ville" et le champ `ville` du filtre
- Corriger `showUrbanSub` / `showRuralSub` pour ne plus dependre de `villes.length > 0` ou `territoires.length > 0` — baser sur le `sectionType` du filtre

### 2. `analyticsHelpers.ts` — Mise a jour de l'interface et fonctions

- Retirer `ville` de `AnalyticsFilter`
- Adapter `matchesLocation()` : retirer le check sur `ville`
- Adapter `buildFilterLabel()` : retirer `ville`, ajouter "Rép. Dém. du Congo" en tete de la chaine lieu

### 3. `GeoCharts.tsx` — Ajouter "Par avenue", retirer "Par ville"

- Retirer le chart "Par ville"
- Ajouter un chart "Par avenue" apres "Par quartier" dans la cascade urbaine
- Ordre final : Province → Section → (Commune, Quartier, Avenue) ou (Territoire, Collectivite, Groupement, Village)

### 4. Nettoyage des references a `ville`

- Retirer `filter.ville` des resets dans `AnalyticsFilters.tsx`
- Verifier qu'aucun autre composant ne reference `filter.ville`

### Fichiers modifies
- `src/components/visualizations/filters/AnalyticsFilters.tsx` — refonte Row 2
- `src/utils/analyticsHelpers.ts` — retirer `ville` du filtre, adapter `matchesLocation` et `buildFilterLabel`
- `src/components/visualizations/shared/GeoCharts.tsx` — retirer "Par ville", ajouter "Par avenue"

