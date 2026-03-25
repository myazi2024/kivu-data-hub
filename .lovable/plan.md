

# Compléter la couverture admin pour Carte RDC et Analytics

## Constat

Le module admin "Configuration graphiques" (`AdminAnalyticsChartsConfig`) gère actuellement :
- **Onglets Analytics** : visibilité, ordre, renommage (13 onglets)
- **Graphiques/KPIs par onglet** : visibilité, ordre, titre, couleur, type de graphique
- **Carte RDC (tab `rdc-map`)** : visibilité/renommage des KPIs tooltip et panneau détails (23 entrées)

**Éléments NON configurables actuellement :**

| Élément | Zone | Statut |
|---------|------|--------|
| Paliers choroplèthes (seuils 30/100/500, couleurs) | Carte RDC | Non configurable |
| Titre de la légende choroplèthe | Carte RDC | Hardcodé |
| Note descriptive (texte d'en-tête carte) | Carte RDC | Hardcodé |
| Watermark ("BIC - Tous droits réservés") | Carte RDC + Analytics | Hardcodé |
| KPIs de la légende contextuelle (zoom) | Carte RDC | Suit `detail-*` mais pas configurable séparément |
| Bouton "Copier en image" (visibilité) | Carte RDC | Toujours visible |
| Texte du watermark/footer | Analytics (ChartFooter) | Hardcodé dans `ChartCard.tsx` |

## Plan

### Etape 1 : Enrichir le registre `rdc-map` dans `useAnalyticsChartsConfig.ts`

Ajouter des entrées de type `chart` (utilisées comme config, pas comme graphique) pour les éléments manquants :

- `map-legend-title` : titre légende choroplèthe (défaut : "Densité parcelles cadastrées")
- `map-header-note` : note descriptive de la carte
- `map-watermark` : texte du watermark (défaut : "BIC - Tous droits réservés")
- `map-copy-button` : visibilité du bouton copier
- `map-tier-1` à `map-tier-4` : les 4 paliers choroplèthes (titre = label, `custom_color` = couleur)

### Etape 2 : Enrichir le registre global pour Analytics

Ajouter une entrée globale dans un pseudo-onglet `_global` :
- `global-watermark` : texte du watermark partagé par tous les graphiques (défaut : "BIC - Tous droits réservés")

### Etape 3 : Consommer les nouvelles configs dans `DRCInteractiveMap.tsx`

- Lire `map-legend-title`, `map-header-note`, `map-watermark` via `getChartConfig()`
- Lire `map-tier-1` à `map-tier-4` pour construire `DENSITY_TIERS` dynamiquement (couleur + label)
- Conditionner le bouton copier sur `isChartVisible('map-copy-button')`

### Etape 4 : Consommer le watermark global dans `ChartCard.tsx`

- Importer `useTabChartsConfig` pour lire `global-watermark`
- Utiliser le texte configuré dans `ChartFooter`

### Etape 5 : Adapter l'UI admin `AdminAnalyticsChartsConfig.tsx`

- Pour l'onglet `rdc-map` : séparer visuellement les sections (Tooltip, Panneau détails, Paramètres carte) au lieu d'un seul listing KPI
- Afficher un éditeur de couleur pour les entrées `map-tier-*`
- Afficher un champ texte élargi pour `map-watermark` et `map-header-note`

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/hooks/useAnalyticsChartsConfig.ts` | Enrichir `rdc-map` + ajouter `_global` |
| `src/components/DRCInteractiveMap.tsx` | Consommer configs dynamiques |
| `src/components/visualizations/shared/ChartCard.tsx` | Watermark configurable |
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | UI enrichie pour `rdc-map` |

4 fichiers modifiés.

