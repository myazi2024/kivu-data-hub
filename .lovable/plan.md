## Objectif

Permettre à l'utilisateur, depuis chaque visuel des onglets Analytics de la page **Données foncières** (`/map`), de projeter les données du graphique sur la carte RDC via un bouton « Afficher sur la carte ». La carte recolore son choroplèthe, met à jour sa légende, son titre et ses KPIs latéraux, et affiche un bandeau « Mode visuel : *X* » avec un bouton ✕ pour quitter. La projection se réinitialise automatiquement au changement d'onglet analytics.

## Architecture cible

```text
ChartCard (wrapper partagé)
  └─ Bouton « Afficher sur la carte »  ──┐
                                          │ projection payload
DRCInteractiveMap                         │ { id, label, byProvince, unit, source }
  ├─ ProjectionContext (nouveau)  ◀──────┘
  ├─ DRCMapWithTooltip   ← lit projection si présente, sinon profile actif
  ├─ MapLegend           ← idem
  ├─ MapKPICards         ← idem
  └─ Bandeau « Mode visuel : X  ✕ »   (rendu si projection ≠ null)
```

## 1. Contexte de projection

Créer `src/components/map/context/MapProjectionContext.tsx` :
- `MapProjection = { id, sourceTab, label, unit?, byProvince: Record<string, number>, palette?, dataSource? }`
- `MapProjectionProvider` expose `projection`, `setProjection`, `clearProjection`
- Wrap `DRCInteractiveMap` autour du provider.

## 2. Calcul du payload côté visuel

Dans `ChartCard` (et variantes `StackedBarCard`, `MultiAreaChartCard`, `ColorMappedPieCard`, `GeoCharts`), ajouter une prop optionnelle :
```ts
projectionResolver?: () => MapProjection | null
```
- Si fournie, le bouton « Afficher sur la carte » apparaît dans l'en-tête (à côté de `ShareButton`).
- Au clic : appel `setProjection(resolver())` du contexte ; le bouton bascule en état actif (variante `default`) et redevient outline si l'utilisateur reclique (toggle local).

Chaque bloc passe son resolver. Pour les blocs déjà géo-agrégés (`GeoCharts`), le payload est direct (`byProvince` déjà calculé). Pour les autres visuels, on enrichit chaque bloc d'un mini-helper `aggregateByProvince(records, valueAccessor)` (ajouté à `src/utils/analyticsHelpers.ts`).

## 3. Lecture côté carte

Modifier `DRCInteractiveMap` :
- Lire `projection` depuis le contexte.
- `getProvinceColor(province)` : si `projection` ≠ null → utiliser `computeAdaptiveTiers(values, palette)` sur `projection.byProvince` au lieu du profil de l'onglet.
- `MapLegend`, `MapScopeLegend`, `MapKPICards` reçoivent `projection` (override doux du profil courant) — mêmes composants, juste un override de label/unit/source.
- Header de la carte : ajouter sous le titre un `Badge` « Mode visuel : *projection.label* » + bouton ✕ → `clearProjection()`. Stylé avec `bg-primary/10 text-primary`.

## 4. Auto-reset

Dans `useMapDrilldown` ou directement dans `DRCInteractiveMap`, `useEffect([activeAnalyticsTab])` → `clearProjection()`. Idem si l'utilisateur navigue hors `/map` (cleanup au unmount du provider).

## 5. Couverture

Tous les visuels héritent du bouton via `ChartCard`. Plan d'application :

| Bloc | Resolver |
|---|---|
| TitleRequests, ParcelsWithTitle, Disputes, Mortgages, Permits, Taxes, Mutations, Subdivisions, Contributions, Expertises, Certificates, Invoices, Servitudes, Boundary, Geometry, Consistency, OwnershipHistory | `aggregateByProvince(filtered, r => 1)` par défaut, ou métrique spécifique (montant, surface) selon le visuel |

Les visuels qui n'ont pas d'attribut `province` exploitable (ex. répartition par statut sans rattachement géo) reçoivent un resolver retournant `null` → bouton masqué automatiquement.

## 6. Détails UX

- Bouton compact (icône `Map` lucide + tooltip) pour ne pas surcharger les cartes mobiles.
- Sur mobile (viewport actuel 360px), le clic bascule aussi `activeMobilePanel` vers `'map'` pour que la carte soit visible immédiatement.
- Le bandeau « Mode visuel » est responsive : pleine largeur sous le titre carte, ✕ aligné à droite.
- Toast discret « Projection appliquée : *X* » au déclenchement.

## Détails techniques (récap)

- **Nouveau** : `src/components/map/context/MapProjectionContext.tsx`
- **Nouveau** : `src/components/map/ui/MapProjectionBanner.tsx`
- **Modif** : `src/components/visualizations/shared/ChartCard.tsx` + variantes (`StackedBarCard`, `MultiAreaChartCard`, `ColorMappedPieCard`, `GeoCharts`) — ajout prop `projectionResolver` + bouton
- **Modif** : `src/components/DRCInteractiveMap.tsx` — wrap provider, lecture projection, override couleur/légende/KPI, bandeau, auto-reset sur `activeAnalyticsTab`
- **Modif** : `src/components/map/ui/MapLegend.tsx`, `MapKPICards.tsx` — accepter override projection
- **Modif** : 17 blocs `src/components/visualizations/blocks/*.tsx` — passer un resolver à chaque visuel
- **Modif** : `src/utils/analyticsHelpers.ts` — helper `aggregateByProvince`
- **Aucune** modification BD ou edge function

## Hors périmètre

- Pas de persistence URL de la projection (état purement éphémère).
- Pas d'animation entre profils (transition couleur déjà gérée par CSS du SVG).
- Le dashboard admin (`/admin → Analytics`) n'est pas touché — uniquement la page `/map` (Données foncières).
