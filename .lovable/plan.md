

# Filigrane logo sur les visuels Analytics

## Objectif

Ajouter une filigrane du logo BIC (image `src/assets/bic-logo.png`) en bleu ciel, superposee sur chaque visuel (ChartCard, StackedBarCard, MultiDataPieCard, MultiAreaChartCard). La configuration (taille, opacite, position) se fait dans l'admin Config graphiques, sous l'onglet Global.

## Modifications

### 1. `src/hooks/useAnalyticsChartsConfig.ts` — Registre `_global`

Ajouter 3 entrees de configuration dans `_global.charts` :

| item_key | custom_title (defaut) | Description |
|---|---|---|
| `logo-watermark-opacity` | `0.06` | Opacite (0.01 a 0.3) |
| `logo-watermark-size` | `80` | Taille en px (30 a 200) |
| `logo-watermark-position` | `center` | Position : `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right` |

### 2. `src/components/visualizations/shared/ChartCard.tsx` — Composant `LogoWatermark`

Creer un nouveau Context `WatermarkConfigContext` qui transporte `{ opacity: number; size: number; position: string }`.

Creer un composant interne `LogoWatermark` :
- Importe `bicLogo` depuis `@/assets/bic-logo.png`
- Lit la config depuis `WatermarkConfigContext`
- Rendu : `<img>` en `position: absolute` avec `pointer-events-none`, `opacity` dynamique, filtre CSS `brightness(0) sepia(1) saturate(5) hue-rotate(185deg)` pour teinter en bleu ciel, taille selon config
- Positionnement CSS selon la valeur `position` (center = `top:50% left:50% transform:-translate`, corners = combinaisons top/bottom/left/right avec petit offset)

Integrer `<LogoWatermark />` dans le `<CardContent>` de :
- `ChartCard` (ligne ~288, dans un wrapper `relative`)
- `StackedBarCard` (ligne ~377)
- `MultiDataPieCard`
- `MultiAreaChartCard` (ligne ~508)

### 3. `src/components/visualizations/ProvinceDataVisualization.tsx` — Fournir le contexte

Lire les 3 configs globales (`logo-watermark-opacity`, `logo-watermark-size`, `logo-watermark-position`) via `getGlobalConfig` (deja utilise pour le watermark texte).

Wrapper le contenu avec `<WatermarkConfigContext.Provider value={...}>`.

### 4. `src/components/admin/AdminAnalyticsChartsConfig.tsx` — UI admin

Dans le mode `charts`, quand l'onglet actif est `_global`, ajouter un panneau de configuration pour la filigrane logo avec :
- Un slider pour l'opacite (0.01 a 0.3, pas de 0.01)
- Un slider pour la taille (30 a 200 px)
- Un select pour la position (Centre, Haut-gauche, Haut-droite, Bas-gauche, Bas-droite)
- Un apercu en temps reel du rendu

Ces controles modifient les `custom_title` des 3 entrees `logo-watermark-*` dans `localItems['_global']`, comme les autres configs.

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `useAnalyticsChartsConfig.ts` | Ajouter 3 entrees `_global` |
| `ChartCard.tsx` | Creer `LogoWatermark` + `WatermarkConfigContext`, integrer dans 4 composants |
| `ProvinceDataVisualization.tsx` | Lire config globale, fournir contexte |
| `AdminAnalyticsChartsConfig.tsx` | Ajouter panneau config filigrane logo |

**Impact** : ~100 lignes ajoutees dans 4 fichiers. Aucune migration.

