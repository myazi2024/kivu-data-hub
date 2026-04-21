

## Audit zoom carte RDC + extension quartiers nationaux

### Constat (audit zoom in/out)

| Couche | Zoom IN | Zoom OUT (toggle) | Animation | Bouton retour |
|--------|---------|-------------------|-----------|---------------|
| Provinces | OK (600 ms) | OK | Manuelle 600 ms easeOutCubic | Oui |
| Communes | OK (400 ms) | **KO** | `useAnimatedBbox` 400 ms | **Non** |
| Quartiers (Goma) | OK (400 ms) | **KO** | `useAnimatedBbox` 400 ms | **Non** |
| Territoires | OK (400 ms) | **KO** | `useAnimatedBbox` 400 ms | **Non** |
| Quartiers (autres villes) | **Indisponible** | — | — | — |

**Anomalies confirmées**
1. Re-cliquer une entité sélectionnée (commune/quartier/territoire) ne dézoome pas.
2. Saut visuel entre Provinces (600 ms) et sous-couches (400 ms).
3. Aucun bouton retour overlay sur les sous-couches — l'utilisateur doit ouvrir le panneau Filtres.
4. Le drilldown Quartier ne fonctionne que pour Goma (`/goma-quartiers.geojson`). Toutes les autres villes restent bloquées au niveau Communes.
5. Démontage SVG entre couches → flash sans interpolation.

### Plan de correction

**A. Toggle dézoom intra-couche** (`DRCInteractiveMap.tsx`)
Handlers Communes / Quartiers / Territoires : `setX(prev => prev === val ? null : val)`. Pour Territoires, conserver la promotion province quand `!selectedProvince`.

**B. Bouton retour générique**
Créer `src/components/map/ui/MapZoomBackButton.tsx` (icône `ArrowLeft`, `absolute top-2 right-2`, `aria-label="Retour"`). Monté dans `DRCCommunesMap`, `DRCQuartiersMap`, `DRCTerritoiresMap` quand une entité est focus → appel du même handler que le clic (toggle off).

**C. Harmonisation animation 600 ms**
Dans `src/lib/mapProjection.ts`, ajouter paramètre `useAnimatedBbox(target, durationMs = 600)` + easing easeOutCubic aligné sur `DRCMapWithTooltip`. Mise à jour des 3 sous-cartes.

**D. Atténuer le flash inter-couches**
Wrapper `animate-scale-in` (design system existant) sur les conteneurs SVG dans `DRCInteractiveMap.tsx` lors du switch de niveau.

**E. Quartiers nationaux RDC** (extension demandée)
Source : [HDX — Quartiers RDC](https://data.humdata.org/dataset/quartiers-rdc-quarters-drc) (shapefile officiel OCHA, ~1500+ quartiers couvrant les principales villes RDC).

Workflow :
1. Télécharger le shapefile depuis HDX, le convertir en GeoJSON simplifié (~1-2 MB max via `mapshaper -simplify 10%`) avec propriétés normalisées : `name`, `commune`, `ville`, `province`.
2. Publier le fichier sous `public/rdc-quartiers.geojson`.
3. Étendre `DRCQuartiersMap` :
   - Nouvelle prop `dataSource` : `'goma' | 'national'`.
   - Filtrage par `ville` ET `commune` (pas seulement `commune` comme aujourd'hui — collisions de noms entre villes).
   - Conserver le fichier Goma comme fallback détaillé pour Goma uniquement (résolution plus fine).
4. `DRCInteractiveMap` : sélectionner la source selon la ville (`ville === 'Goma'` → fichier dédié, sinon fichier national).
5. `MapScopeLegend` : retirer la désactivation du sélecteur quartier hors Goma. Ajouter message info si la ville sélectionnée n'a aucun quartier dans le dataset national (ex. petites localités).

**F. Mémoire**
Mettre à jour `mem://features/land-data-analytics/interactive-map-layers-fr` : toggles, bouton retour, durée unifiée, source HDX + chemins fichiers, propriétés normalisées attendues.

### Sécurité & performance
- GeoJSON statique servi depuis `/public`, cache via `useGeoJsonData` existant (Map module-level).
- Simplification Douglas-Peucker pour rester sous 2 MB (objectif < 500 KB gzip).
- Aucune RLS impactée — données publiques OCHA.
- Licence HDX : Creative Commons Attribution — ajouter mention dans `MapScopeLegend` ou un tooltip footer carte.

### Fichiers impactés
- `src/lib/mapProjection.ts` — paramètre `durationMs`
- `src/components/DRCInteractiveMap.tsx` — toggles, sélection source quartier, animation wrapper
- `src/components/DRCCommunesMap.tsx` — bouton retour
- `src/components/DRCQuartiersMap.tsx` — prop `dataSource`, filtrage ville+commune, bouton retour
- `src/components/DRCTerritoiresMap.tsx` — bouton retour
- `src/components/map/ui/MapZoomBackButton.tsx` (nouveau)
- `src/components/map/ui/MapScopeLegend.tsx` — réactivation universelle quartier + crédit OCHA
- `public/rdc-quartiers.geojson` (nouveau, ~500 KB)
- `mem://features/land-data-analytics/interactive-map-layers-fr` — mise à jour

### Hors scope
- Pas de moteur de morphing SVG inter-couches (mitigation CSS uniquement).
- Pas d'édition admin du dataset quartiers (lecture seule depuis fichier statique).
- Pas de couche sous-quartiers (avenues / blocs).

