

# Audit — Carte RDC : Affichage, Transitions et Données

## Architecture actuelle

```text
DRCInteractiveMap (orchestrateur)
├── DRCMapWithTooltip       — SVG provinces (drc-provinces.svg)
├── DRCTerritoiresMap       — GeoJSON territoires (drc-territoires.geojson)
├── DRCCommunesMap          — GeoJSON communes (drc-communes.geojson)
└── DRCQuartiersMap         — GeoJSON quartiers (goma-quartiers.geojson)
```

4 composants de carte distincts, sélectionnés par des branches conditionnelles (lignes 377-424).

---

## 1. Problemes de transition entre cartes

### 1A. Transition Province → Territoires : **CASSEE**
Quand on passe de `DRCMapWithTooltip` (carte provinces SVG) à `DRCTerritoiresMap` (mode rurale), le composant provinces est **detruit** et le composant territoires est **monté** — aucune animation de transition. L'utilisateur voit un saut brutal.

### 1B. Transition Province → Communes : **CASSEE**
Même problème. Le passage de la carte provinces à `DRCCommunesMap` (quand une ville est sélectionnée) détruit/remonte un composant entièrement différent.

### 1C. Transition Communes → Quartiers (Goma) : **CASSEE**
Le passage de `DRCCommunesMap` à `DRCQuartiersMap` (sélection d'une commune de Goma) est aussi un remontage complet.

### 1D. Transition interne Territoires (showAll → province → territoire) : **OK**
Grâce à l'unification en une seule instance `DRCTerritoiresMap` + animation bbox via `requestAnimationFrame` (400ms easeOutQuad), cette transition est fluide.

### 1E. Transition interne Provinces (zoom viewBox) : **OK**
`DRCMapWithTooltip` anime le viewBox SVG via `requestAnimationFrame` (600ms easeOutCubic).

### 1F. `DRCCommunesMap` et `DRCQuartiersMap` : **PAS D'ANIMATION**
Ces deux composants calculent le `bbox` directement dans un `useMemo` sans interpolation. Quand on sélectionne une commune ou un quartier, le zoom est instantané — pas de transition animée.

---

## 2. Duplication de code

Les fonctions `flatCoords`, `projectFeature`, `centroid` sont dupliquées dans 3 fichiers :
- `DRCTerritoiresMap.tsx`
- `DRCCommunesMap.tsx`
- `DRCQuartiersMap.tsx`

Code identique (~70 lignes x 3). Devrait être dans un module utilitaire partagé.

---

## 3. Données alimentant les cartes

| Carte | Source | Type | Chargement |
|-------|--------|------|------------|
| Provinces | `/drc-provinces.svg` | SVG statique (26 paths avec `id`) | fetch + DOMParser |
| Territoires | `/drc-territoires.geojson` | GeoJSON (164 features) | fetch → JSON |
| Communes | `/drc-communes.geojson` | GeoJSON (filtré par `is_in_admi`) | fetch → JSON |
| Quartiers | `/goma-quartiers.geojson` | GeoJSON (filtré par `commune`) | fetch → JSON |

**Problèmes identifiés :**
- Chaque composant fait son propre `fetch` à chaque montage. Si un composant est démonté puis remonté, les données sont re-téléchargées.
- Pas de cache partagé — le GeoJSON territoires (probablement lourd) est rechargé à chaque passage rurale→urbaine→rurale.
- Les quartiers ne sont disponibles que pour Goma (`goma-quartiers.geojson`). Toute autre ville affichera un message vide.

---

## 4. Données analytics (KPIs)

Les indicateurs sont calculés côté client via `computeIndicators()` en filtrant les tableaux bruts (`parcels`, `titleRequests`, etc.) fournis par `useLandDataAnalytics`. Le scope géographique est appliqué via `buildScopePredicate` (comparaison case-insensitive sur `province`, `ville`, `commune`, `quartier`, `territoire`).

**Problème potentiel** : Le filtre `territoire` dans `buildScopePredicate` exige aussi `province` (ligne 115), mais en mode `showAll` sans province, le predicate retourne `() => false` (ligne 117) — les stats scoped sont nulles pour "Tous les territoires".

---

## 5. Plan de correction proposé

### Priorité 1 — Ajouter l'animation bbox à CommunesMap et QuartiersMap
Appliquer le même pattern d'interpolation animée que `DRCTerritoiresMap` (state `animBbox` + `requestAnimationFrame` + `easeOutQuad`) à :
- `DRCCommunesMap.tsx` — zoom animé quand une commune est sélectionnée
- `DRCQuartiersMap.tsx` — zoom animé quand un quartier est sélectionné

### Priorité 2 — Transition fade entre types de cartes
Ajouter un wrapper CSS `transition-opacity` dans le conteneur carte de `DRCInteractiveMap.tsx` pour un fade-out/fade-in quand on bascule entre composants (provinces → territoires, provinces → communes, communes → quartiers). Durée : 200ms.

### Priorité 3 — Extraire les utilitaires SVG partagés
Créer `src/lib/mapProjection.ts` avec `flatCoords`, `projectFeature`, `centroid`, `BBox`, `bboxEqual`, `animateBbox` (hook). Remplacer les copies dans les 3 composants GeoJSON.

### Priorité 4 — Cache GeoJSON partagé
Créer un hook `useGeoJsonData(url)` avec un cache module-level (Map) pour éviter les re-téléchargements quand un composant est remonté.

### Priorité 5 — Corriger buildScopePredicate pour showAll
Quand `territoire` est défini sans `province`, le predicate devrait filtrer uniquement sur `territoire` (sans exiger `province`).

### Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/lib/mapProjection.ts` | **Nouveau** — utilitaires partagés + hook animBbox |
| `src/components/DRCCommunesMap.tsx` | Animation bbox + import utilitaires |
| `src/components/DRCQuartiersMap.tsx` | Animation bbox + import utilitaires |
| `src/components/DRCTerritoiresMap.tsx` | Import utilitaires (suppression code dupliqué) |
| `src/components/DRCInteractiveMap.tsx` | Fade transition CSS + fix buildScopePredicate |

