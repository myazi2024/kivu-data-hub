

## Audit zoom in/out — Carte RDC (`/map`)

### Couches auditées

| # | Couche | Composant | Zoom à la sélection | Dézoom (toggle) | Anim |
|---|--------|-----------|---------------------|-----------------|------|
| 1 | Provinces | `DRCMapWithTooltip` | OK (viewBox animé 600 ms easeOutCubic) | OK (bouton retour) | Manuelle |
| 2 | Communes d'une ville | `DRCCommunesMap` | OK (`useAnimatedBbox`, 400 ms) | KO — pas de toggle | `useAnimatedBbox` |
| 3 | Quartiers de Goma | `DRCQuartiersMap` | OK | KO — pas de toggle | `useAnimatedBbox` |
| 4 | Territoires | `DRCTerritoiresMap` | OK | KO — pas de toggle | `useAnimatedBbox` |
| 5 | Quartiers (autres villes) | — | **Inexistant** | — | — |

### Anomalies confirmées

1. **Pas de toggle de dézoom intra-couche** (Communes/Quartiers/Territoires). Re-cliquer sur l'entité sélectionnée ne dézoome pas → l'utilisateur doit passer par le panneau Filtres pour réinitialiser.
2. **Inconsistance d'animation entre Provinces et niveaux inférieurs** : 600 ms easeOutCubic vs 400 ms easeOutQuad. Saut perceptible lors de la transition Province → Communes.
3. **Couverture quartiers limitée à Goma**. Toute autre ville (Kinshasa, Lubumbashi, Bukavu, Mbuji-Mayi…) reste bloquée au niveau Communes ; le drilldown Quartier ne déclenche aucun zoom car le composant n'est jamais monté hors Goma.
4. **Transition inter-couches non animée** : le `key` du conteneur change (`provinces` → `communes` → `quartiers`/`territoires`), démontant le SVG. La nouvelle couche démarre sur son bbox initial sans interpolation depuis l'ancien (le `isFirstRender` de `useAnimatedBbox` court-circuite l'animation au premier rendu). Effet : flash visuel.
5. **Bouton retour absent** sur Communes/Quartiers/Territoires. Seules les Provinces ont un `<ArrowLeft>` overlay.

### Corrections proposées

**A. Toggle intra-couche (Communes / Quartiers / Territoires)**
Dans `DRCInteractiveMap.tsx`, modifier les handlers :
- `onCommuneSelect={(c) => setSelectedCommune(prev => prev === c ? null : c)}`
- `onQuartierSelect={(q) => setSelectedQuartier(prev => prev === q ? null : q)}`
- `onTerritoireSelect` : même pattern, en conservant la promotion province quand `!selectedProvince`.

**B. Bouton retour overlay générique**
Créer `src/components/map/ui/MapZoomBackButton.tsx` (icône `ArrowLeft`, position `absolute top-2 right-2`, `aria-label="Retour"`).
L'afficher dans chaque sous-carte quand l'entité de focus est sélectionnée (commune/quartier/territoire). Click → `onSelect(currentlySelected)` (qui devient toggle off via A).

**C. Harmoniser la durée d'animation**
Dans `src/lib/mapProjection.ts`, exposer `ANIM_DURATION` comme paramètre optionnel de `useAnimatedBbox(target, durationMs = 600)` et utiliser 600 ms partout.
Dans `DRCMapWithTooltip.tsx`, garder 600 ms (déjà OK).

**D. Atténuer le flash inter-couches**
Le démontage SVG ne peut pas être interpolé sans refonte lourde. Mitigation visuelle : ajouter `animate-fade-in` (déjà présent) + un léger `scale-95 → scale-100` sur le wrapper de la nouvelle couche pour donner l'illusion d'un zoom continu. Modification CSS uniquement dans `DRCInteractiveMap.tsx` lignes 354/379/390 (ajouter `animate-scale-in` du design system).

**E. Quartiers hors Goma** (signalé en dette, pas implémenté ici)
Documenter dans la mémoire que le drilldown quartier n'est actif que sur Goma. La généralisation requiert un GeoJSON RDC complet (mentionné dans la mémoire `interactive-map-layers-fr` mais absent du repo). Créer une note de dette et un fallback UX explicite : sur les communes hors Goma, désactiver le sélecteur Quartier dans `MapScopeLegend` et afficher un tooltip « Découpage quartiers indisponible pour cette ville ».

**F. Mémoire**
Mettre à jour `mem://features/land-data-analytics/interactive-map-layers-fr` avec : toggles ajoutés, bouton retour générique, durée 600 ms unifiée, dette quartiers nationaux confirmée.

### Hors scope
- Pas de refonte du moteur d'animation (pas de morphing SVG inter-couches).
- Pas d'ajout de GeoJSON quartiers hors Goma (dette documentée).
- Pas de modification de `DRCMapWithTooltip` (déjà conforme).

### Fichiers impactés
- `src/lib/mapProjection.ts` — paramètre durée
- `src/components/DRCCommunesMap.tsx`, `DRCQuartiersMap.tsx`, `DRCTerritoiresMap.tsx` — bouton retour + durée
- `src/components/DRCInteractiveMap.tsx` — handlers toggle + animation wrapper
- `src/components/map/ui/MapZoomBackButton.tsx` (nouveau)
- `src/components/map/ui/MapScopeLegend.tsx` — désactivation sélecteur quartier hors Goma
- `mem://features/land-data-analytics/interactive-map-layers-fr` — mise à jour

