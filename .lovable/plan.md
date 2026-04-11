

# Audit detaille — Menu "Donnees foncieres"

## Architecture globale

Le menu "Donnees foncieres" correspond a la page `/map` (src/pages/Map.tsx) qui integre le composant `DRCInteractiveMap` (653 lignes). L'interface se divise en 3 zones :

```text
┌─────────────────────────────────────────────────────┐
│  Navigation                                          │
├──────────────┬──────────────────────────────────────┤
│  Col gauche  │        Col droite (Analytics)         │
│  (4/12)      │             (8/12)                    │
│              │                                       │
│  Carte RDC   │  ProvinceDataVisualization            │
│  SVG         │  ┌───────────────────────────┐       │
│              │  │ Onglets: 13 blocs         │       │
│  Indicateurs │  │ Filtres + KPIs + Charts   │       │
│  province    │  │ Watermark logo BIC        │       │
│              │  └───────────────────────────┘       │
└──────────────┴──────────────────────────────────────┘
Mobile: panneau bascule Carte/Analytics (bouton flottant)
```

---

## 1. Donnees (useLandDataAnalytics.tsx — 216 lignes)

**Sources** : 13 tables Supabase chargees en parallele via `Promise.all` :
- `cadastral_parcels`, `cadastral_contributions`, `land_title_requests`, `cadastral_building_permits`, `cadastral_tax_history`, `cadastral_mortgages`, `real_estate_expertise_requests`, `mutation_requests`, `subdivision_requests`, `cadastral_land_disputes`, `cadastral_ownership_history`, `generated_certificates`, `cadastral_invoices`

**Points forts** :
- Pagination automatique (par tranches de 1000 lignes) pour contourner la limite Supabase
- Separation TEST-/Production via `isTestRoute`
- Enrichissement geographique des enregistrements FK via lookup maps
- Cache React Query (staleTime: 5 min)

**Points faibles identifies** :
- **Typage `any[]` partout** : `LandAnalyticsData` declare toutes ses proprietes comme `any[]`. Aucune interface typee pour les enregistrements individuels. Risque de regressions silencieuses si le schema DB change.
- **Chargement monolithique** : Les 13 requetes sont declenchees simultanement a chaque visite, meme si l'utilisateur ne consulte qu'un seul onglet. Sur un jeu de donnees volumineux (> 10 000 parcelles), cela entraine un temps de chargement initial eleve.
- **Pas de filtrage cote serveur** : Tous les filtres (province, ville, commune, statut, date) s'appliquent en memoire cote client via `applyFilters`. Cela fonctionne pour quelques milliers de lignes mais ne passera pas a l'echelle.
- **Retry = 1** : une seule tentative en cas d'erreur reseau. Sur les connexions instables (contexte RDC), cela peut causer des ecrans blancs.

---

## 2. Carte RDC (DRCInteractiveMap.tsx — 653 lignes)

**Fonctionnalites** :
- Choropleth SVG avec 4 paliers de densite configurables
- Drill-down: Province → Ville/Territoire → Commune → Quartier
- Tooltip dynamique avec 11 indicateurs configurables
- Mode plein ecran + copie en image (html2canvas)
- Legende contextuelle avec stats scopees
- Filigrane copyright configurable

**Points forts** :
- `useMemo` sur les donnees derivees (provincesData, scopedStats, tooltipLineConfigs)
- Integration admin complete : titres, visibilite, couleurs des paliers
- Responsive : bouton bascule mobile Carte/Analytics

**Points faibles** :
- **Fichier trop long** (653 lignes) : melange logique de donnees, gestion d'etat (10+ useState), rendu SVG et UI. Devrait etre decoupe en sous-composants (ex: MapLegend, ProvinceDetails, MapControls).
- **`countForProvince` inutilisee** (ligne 53-55) : fonction definie mais jamais appelee.
- **`buildScopePredicate` retourne `() => false`** si aucun scope n'est selectionne : pas d'erreur mais semantique confuse.
- **Zoom externe** : `externalProvinceId` gere un cas de synchronisation Analytics→Carte qui pourrait etre simplifie avec un store partage.

---

## 3. Visualisation Analytics (ProvinceDataVisualization.tsx — 167 lignes)

**Architecture** :
- Systeme d'onglets dynamiques via `ANALYTICS_TABS_REGISTRY` (13 onglets)
- Chaque onglet = un Block component (ex: TitleRequestsBlock, ContributionsBlock)
- Configuration admin : visibilite/ordre/titres des onglets, graphiques et KPIs
- Contextes imbriques (12 niveaux) pour propager filtres geographiques et watermark

**Points forts** :
- Architecture modulaire : BLOCK_MAP + ICON_MAP = ajout d'onglet facile
- Watermark logo BIC configurable (opacite, taille, position)
- Synchronisation bidirectionnelle carte ↔ filtres analytics

**Points faibles** :
- **12 Contextes imbriques** dans le JSX (ligne 137-161) : lisibilite mediocre. Un contexte unique regroupant tous les filtres geo serait plus maintenable.
- **Performance** : chaque changement de filtre geo recalcule tous les blocs via les `useEffect` dans chaque block (ex: ContributionsBlock ligne 30).

---

## 4. Composants graphiques (ChartCard.tsx — 625 lignes)

**Composants** : `ChartCard`, `StackedBarCard`, `MultiAreaChartCard`, `MultiDataPieCard`, `ColorMappedPieCard`

**Points forts** :
- Copie en image (toPng + roundCorners + fallback download)
- Variable de croisement (CrossVariablePicker) pour analyses croisees
- Effet zoom interactif (scale-1.03) au clic
- Logo watermark integre dans chaque graphique
- Footer avec date + copyright

**Points faibles** :
- **Fichier monolithique de 625 lignes** : 5 composants + utilitaires dans un seul fichier. Devrait etre decoupe.
- **`focused` state sans keyboard support** : le clic toggle `focused` mais il n'y a pas de gestion du `onKeyDown` ni de `role="button"` pour l'accessibilite.
- **`memo` sur les composants parents** mais les callbacks `onClick={() => setFocused(f => !f)}` creent une nouvelle reference a chaque rendu, neutralisant partiellement le `memo`.

---

## 5. Blocs Analytics (13 fichiers)

Chaque bloc suit le meme pattern :
1. Etat filtre local + sync via `useContext(MapProvinceContext)`
2. `applyFilters` sur les donnees
3. `countBy` / `trendByMonth` pour preparer les series
4. Grille de KPIs + Graphiques configurables

**Points forts** :
- Pattern uniforme = maintenabilite elevee
- Config admin granulaire par graphique (visibilite, titre, type, couleur)
- Insights textuels automatiques via `generateInsight`
- Variables de croisement par graphique

**Points faibles** :
- **Code duplique** : les lignes 26-34 (gestion du filtre, sync province, config tabs) sont identiques dans les 13 blocs. Un hook custom `useBlockFilter(TAB_KEY)` eliminerait ~80 lignes de duplication.
- **Pas de lazy loading** : les 13 blocs sont importes statiquement dans ProvinceDataVisualization.tsx meme si un seul est affiche a la fois.

---

## 6. Filtres (AnalyticsFilters.tsx — 475 lignes)

**Fonctionnalites** : Province → Ville/Territoire → Commune → Quartier → Avenue, Section (Urbaine/Rurale), Statut, Annee

**Points forts** :
- Drill-down geographique complet avec donnees reelles
- Propagation bidirectionnelle carte ↔ filtres
- Badges de filtres actifs avec suppression individuelle

**Points faibles** :
- **475 lignes** pour un composant de filtres : les sous-sections (geo, temps, statut) devraient etre des composants separes.

---

## 7. Configuration Admin (useAnalyticsChartsConfig.ts — 624 lignes)

**Fonctionnalites** : CRUD complet sur `analytics_charts_config` pour gerer visibilite, titres, types de graphiques, couleurs, ordres d'affichage, filtres et variables de croisement.

**Points forts** :
- Registre centralise `ANALYTICS_TABS_REGISTRY` avec valeurs par defaut
- Support des types `filter` et `cross` pour une configuration dynamique
- Cache React Query avec invalidation automatique

---

## Resume des problemes identifies

| Priorite | Probleme | Impact |
|----------|----------|--------|
| Haute | Typage `any[]` dans LandAnalyticsData | Regressions silencieuses, DX degradee |
| Haute | Chargement monolithique de 13 tables | Performance initiale |
| Moyenne | Fichiers monolithiques (ChartCard 625L, DRCInteractiveMap 653L, AnalyticsFilters 475L) | Maintenabilite |
| Moyenne | Code duplique dans les 13 blocs (hook filtre) | Duplication ~130 lignes |
| Moyenne | 12 contextes imbriques dans ProvinceDataVisualization | Lisibilite |
| Basse | Pas de lazy loading des blocs | Bundle size |
| Basse | Accessibilite du zoom focus (pas de keyboard) | A11y |
| Basse | `countForProvince` inutilisee | Code mort |
| Info | Filtrage cote client uniquement | Scalabilite future |

---

## Recommandations prioritaires

1. **Typer les entites** : Creer des interfaces pour chaque table (Parcel, Contribution, TitleRequest, etc.) et remplacer `any[]`
2. **Extraire un hook `useBlockFilter`** : Mutualiser la logique commune des 13 blocs
3. **Decouper les gros fichiers** : DRCInteractiveMap → MapCard + MapControls + ProvinceDetails ; ChartCard → fichiers separes par composant
4. **Lazy load des blocs** : `React.lazy()` + `Suspense` sur les block components
5. **Supprimer le code mort** : `countForProvince`

Souhaitez-vous que j'implemente l'une de ces recommandations ?

