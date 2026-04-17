

## Audit Carte RDC dynamique × Onglets Analytics

### Vue d'ensemble

| Aspect | État | Commentaire |
|---|---|---|
| Sync `activeTab` → carte | ✅ | `onActiveTabChange` propagé proprement |
| 13 profils métiers | ✅ | Couvrent tous les onglets sauf `rdc-map` (défaut) |
| Choroplèthe par profil | ✅ | `getProvinceColor` bascule via `metricValue` |
| Mini-légende paliers | ✅ | Top-right, animée, repliable visuellement |
| Tooltip dynamique | ✅ | `extraTooltipLines` injecté dans `ProvinceData` |
| En-tête de carte | ✅ | Préfixé par `activeProfile.label` |
| Légende contextuelle scope | ✅ | `legendStats` ou fallback tooltip |
| Drilldown sous-province | ⚠️ | Maps Communes/Quartiers/Territoires ignorent `activeProfile` |
| Paliers adaptatifs | ⚠️ | Seuils figés en code, peu pertinents pour faibles volumes |
| Mode test | ⚠️ | Profils calculent depuis `analytics` global (ignorent `isTestRoute` filtres) — OK car analytics est déjà filtré en amont |
| Performance | ⚠️ | `metric` + `tooltipLines` recalculés × 26 provinces à chaque tab change, sans mémo intra-profile |
| Popover Info | ❌ | Texte figé : « Couleur = densité de parcelles » même quand profil actif |
| Filtre ville/commune × profil | ❌ | Quand un onglet métier est actif et user descend en ville, la carte communale reste neutre (perd la métrique) |
| Légende A11Y | ⚠️ | Carrés colorés sans `aria-label`/`role="img"` |
| Bouton « Réinitialiser onglet » | ❌ | Pas de moyen rapide de revenir au mode `rdc-map` depuis la carte |
| État `activeAnalyticsTab` URL | ❌ | Non synchronisé à `?tab=` — partage de lien perd le contexte métier |
| Transitions paliers | ⚠️ | `transition-colors` non garanti sur SVG `fill` (paths via `setAttribute`) |
| Profil par défaut `rdc-map` | ⚠️ | Pas dans `MAP_TAB_PROFILES` → onglet « Carte RDC » garde le visuel ancien : OK mais incohérent avec les autres |

### Améliorations proposées

#### 1. URL persistante de l'onglet actif
Ajouter `?tab=` dans `searchParams`, initialiser `activeAnalyticsTab` depuis l'URL, et propager le changement vers `ProvinceDataVisualization` (nouveau prop `initialTab`). Permet le partage de contexte complet (province + onglet + filtres).

#### 2. Paliers adaptatifs (quantiles)
Remplacer les seuils statiques `makeTiers([3,15,50], …)` par un calcul dynamique basé sur la **distribution réelle par province** (quartiles Q1/Q2/Q3 de `metricValue`). Évite que toutes les provinces tombent dans le même palier sur les jeux de données peu denses (Expertise, Lotissement). Conserver les seuils statiques comme fallback si toutes les provinces sont à 0.

```ts
// Nouveau helper dans mapTabProfiles.ts
export function computeAdaptiveTiers(values: number[], palette): MapTier[] { … }
```

Appliquer dans `DRCInteractiveMap`: si `activeProfile`, calculer les tiers à partir des `metricValue` puis les passer à `getProvinceColor` et à la mini-légende.

#### 3. Profil `rdc-map` explicite (cohérence)
Créer un profil `rdcMapProfile` (parcelles totales, palette neutre, paliers admin actuels) afin que **tous** les onglets passent par le même pipeline (`metric`/`tiers`/`tooltipLines`). Supprime le code dual `if (activeProfile) … else …`.

#### 4. Drilldown : propager le profil aux sous-cartes
Étendre `DRCCommunesMap`, `DRCQuartiersMap`, `DRCTerritoiresMap` pour accepter un prop optionnel `getEntityColor` calculé depuis le profil actif (par commune/quartier/territoire). Permet de conserver le contexte métier en zoom : ex. carte des **litiges par commune de Goma** quand l'onglet Litiges est actif. (Implémentation incrémentale : commencer par `DRCCommunesMap`.)

#### 5. Popover Info contextuel
Rendre le contenu dynamique :
- Titre dynamique : « Couleur = `activeProfile.legendTitle.toLowerCase()` »
- Source : « Données calculées depuis Supabase » + nom de la table principale du profil (parcels, mortgages, disputes…).

#### 6. Bouton « Vue cartographique par défaut »
Ajouter un petit bouton-icône (ex. `RotateCcw`) dans la barre top-right de la carte, visible uniquement si `activeProfile`, qui réinitialise `activeAnalyticsTab` à `rdc-map` (callback vers `ProvinceDataVisualization` via nouveau prop `requestedTab`).

#### 7. Performance : mémoïsation profil
Mémoïser `metric(ctx)` et `tooltipLines(ctx)` par `(tabKey, provinceName, dataUpdatedAt)` via une `Map` locale dans le `useMemo` de `provincesData`. Évite des recalculs sur chaque `setSelectedProvince`.

#### 8. Transitions visuelles
Dans `DRCMapWithTooltip`, ajouter `path.style.transition = 'fill 300ms ease'` lors de l'attachement initial pour fluidifier le changement de palette à chaque switch d'onglet.

#### 9. Accessibilité légende
- `role="img"` + `aria-label` sur chaque pastille de palier (« Palier élevé : 16 à 50 »).
- `aria-live="polite"` sur la mini-légende quand le profil change pour annoncer le changement de contexte.

#### 10. Profils enrichis (3 ajouts utiles)
- **Mortgages** : ajouter « montant moyen $ » dans `tooltipLines` (déjà calculé en interne ailleurs).
- **Subdivision** : palier basé sur `number_of_lots` total, pas sur le nombre de demandes (plus représentatif de l'intensité foncière).
- **Ownership** : mise à zéro silencieuse quand `analytics.ownershipHistory` n'a aucune ligne pour la province (pour éviter la teinte "0–5" trompeuse en gris neutre — utiliser un état `no-data` distinct).

#### 11. État « pas de données » par province
Ajouter une couleur `neutral` (gris très clair, hachuré CSS) pour les provinces où `metricValue === 0` **et** total métier === 0. Distingue « zéro réel » de « pas encore d'enregistrement ». Tooltip indique alors « Aucune donnée disponible ».

### Fichiers impactés

| Fichier | Changements |
|---|---|
| `src/config/mapTabProfiles.ts` | + `computeAdaptiveTiers`, + `rdcMapProfile`, enrichissements profils #10, gestion no-data #11 |
| `src/components/DRCInteractiveMap.tsx` | URL `?tab=`, tiers adaptatifs, mémo profil, bouton reset, popover dynamique, intégration profil unique |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Accepter `initialTab` + `forcedTab` (depuis URL/reset) |
| `src/components/DRCMapWithTooltip.tsx` | `transition` CSS sur paths SVG, gestion fill no-data |
| `src/components/DRCCommunesMap.tsx` | Prop optionnel `getEntityColor` (drilldown métier) |
| `src/components/ProvinceTooltip.tsx` | Affichage « Aucune donnée » si scope vide |

### Validation
- Vérifier que le partage d'URL `/?province=Kinshasa&tab=disputes` restaure carte + onglet correctement.
- Tester sur un dataset peu dense (Expertise) : les 26 provinces ne doivent plus tomber toutes dans le palier le plus bas.
- Vérifier transition fluide entre 13 onglets sans flash.
- Vérifier qu'au drilldown commune (Goma → Katindo), la carte conserve la palette du profil actif.
- A11Y : NVDA/VoiceOver annoncent le changement de profil.

