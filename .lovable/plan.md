

## Audit — Carte RDC dynamique × Onglet Analytics (état post-implémentation)

### Vérifications effectuées
Lecture ciblée de `mapTabProfiles.ts`, `DRCInteractiveMap.tsx`, `ProvinceDataVisualization.tsx`, `DRCCommunesMap.tsx`, `DRCMapWithTooltip.tsx`, `ProvinceTooltip.tsx`.

### Tableau de conformité

| # | Fonctionnalité | État | Constat |
|---|---|---|---|
| 1 | Sync `activeTab` → carte | ✅ | `onActiveTabChange` propagé |
| 2 | 13 profils métiers | ✅ | Tous présents + `rdcMapProfile` unifié |
| 3 | Choroplèthe par profil | ✅ | `getProvinceColor` consomme `metricValue` |
| 4 | Mini-légende paliers | ✅ | Top-right, ARIA, repliable |
| 5 | Tooltip dynamique | ✅ | `extraTooltipLines` rendu |
| 6 | URL `?tab=` persistante | ✅ | `searchParams` lu/écrit |
| 7 | Paliers adaptatifs (quartiles) | ✅ | `computeAdaptiveTiers` actif |
| 8 | Profil `rdc-map` explicite | ✅ | Pipeline unique |
| 9 | Drilldown profil → communes | ✅ | `getEntityColor` câblé |
| 10 | Bouton « Reset onglet » | ✅ | `RotateCcw` + `forcedTab` |
| 11 | Popover Info contextuel | ✅ | Affiche `dataSource` + méthode |
| 12 | État « pas de données » | ✅ | `noData` + couleur neutre |
| 13 | A11Y mini-légende | ✅ | `role`, `aria-live` |
| 14 | Transitions SVG `fill` | ⚠️ | CSS transition non appliquée sur paths injectés via `setAttribute` |
| 15 | Drilldown Quartiers/Territoires | ❌ | `DRCQuartiersMap` & `DRCTerritoiresMap` ignorent toujours `activeProfile` |
| 16 | Mémoïsation profil | ⚠️ | Pas de cache `Map` interne ; recalcul à chaque re-render parent |
| 17 | Légende contextuelle bottom-left × profil ville | ⚠️ | Reste sur stats globales province quand drilldown ville actif |
| 18 | Bouton « Copier image » × profil | ⚠️ | Capture probable mais légende dynamique non incluse dans le PNG (à vérifier) |
| 19 | Profil dans titre exporté/partagé | ❌ | Pas de mention du profil dans le nom de fichier export |
| 20 | Mode plein écran × mini-légende | ⚠️ | Z-index/position à valider en fullscreen |
| 21 | Fallback tiers vides | ⚠️ | Si toutes provinces à 0 et `noData`, mini-légende affiche 4 paliers vides peu lisibles |
| 22 | URL `?tab=` × refresh + `forcedTab` | ⚠️ | Risque de boucle si `forcedTab` reste défini après application (pas de `null` reset) |
| 23 | Performance switch onglet | ⚠️ | 26 provinces × `metric()` + `tooltipLines()` à chaque tab change, pas de mémo par `(tabKey, dataUpdatedAt)` |
| 24 | Sync filtre ville → profil province | ⚠️ | Quand ville sélectionnée, métrique province reste calculée sur toute la province (perte de cohérence visuelle) |

### Améliorations proposées (priorisées)

#### P1 — Correctifs essentiels
1. **Transitions SVG fluides** (`DRCMapWithTooltip.tsx`) : appliquer `path.style.transition = 'fill 300ms ease, opacity 200ms ease'` à l'attachement initial des paths, pour fluidifier le changement de palette.
2. **Reset `forcedTab` après application** (`DRCInteractiveMap.tsx` + `ProvinceDataVisualization.tsx`) : passer `forcedTab` à `null` après `setActiveTab` via callback `onForcedTabApplied`, pour éviter re-trigger.
3. **Fallback mini-légende vide** (`DRCInteractiveMap.tsx`) : si tous `metricValue === 0`, afficher uniquement la pastille « Aucune donnée » + message « Aucune occurrence pour ce profil » au lieu des 4 paliers hachurés.

#### P2 — Cohérence drilldown
4. **Drilldown Quartiers & Territoires** : étendre le pattern `getEntityColor` à `DRCQuartiersMap.tsx` et `DRCTerritoiresMap.tsx` (mêmes signatures que `DRCCommunesMap`). Permet de garder le profil métier sur tous les niveaux de zoom.
5. **Légende bottom-left contextuelle au scope** : quand `selectedVille`/`selectedCommune` actif et profil métier sélectionné, recalculer `legendStats` filtré par ville/commune au lieu d'utiliser les stats province.

#### P3 — Performance
6. **Cache profil par `(tabKey, dataUpdatedAt)`** : dans `provincesData` (`DRCInteractiveMap.tsx`), introduire `useRef<Map<string, ProvinceMetric>>` et invalider via `analytics.dataUpdatedAt` pour éviter recalculs sur chaque setState non lié au profil.
7. **Mémoïser `getCommuneColor` correctement** : dépendances actuelles incluent `analytics` complet → recalcul fréquent. Filtrer une fois par commune via `useMemo` indexé.

#### P4 — Export & UX
8. **Nom de fichier export contextuel** : `Copier image` → nom `carte-rdc-{activeProfile.tabKey}-{date}.png`.
9. **Mini-légende incluse dans capture PNG** : vérifier que `html2canvas`/équivalent englobe bien le bloc top-right (sinon élargir la zone capturée).
10. **Fullscreen × mini-légende** : ajuster `z-index` et position absolue pour rester visible et accessible en mode plein écran.

### Fichiers impactés

| Fichier | Changements |
|---|---|
| `src/components/DRCMapWithTooltip.tsx` | P1.1 — transition CSS sur paths |
| `src/components/DRCInteractiveMap.tsx` | P1.2, P1.3, P3.6, P3.7, P4.8, P4.9, P4.10, P2.5 |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | P1.2 — callback `onForcedTabApplied` |
| `src/components/DRCQuartiersMap.tsx` | P2.4 — `getEntityColor` |
| `src/components/DRCTerritoiresMap.tsx` | P2.4 — `getEntityColor` |

### Validation post-implémentation
- Switch entre 13 onglets sans flash visuel (transitions SVG actives).
- `?tab=disputes` puis clic Reset → URL revient à `?tab=rdc-map` sans boucle.
- Onglet Expertise (faible volume) → mini-légende affiche message « Aucune occurrence » au lieu de 4 paliers vides.
- Drilldown Goma → Katindo (commune) → Quartier : palette du profil litiges conservée à tous les niveaux.
- Capture PNG : nom = `carte-rdc-disputes-2026-04-17.png`, mini-légende visible dans l'image.
- Plein écran : mini-légende top-right reste visible et lisible.

