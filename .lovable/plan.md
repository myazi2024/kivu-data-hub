# Analytics « Location & Valeur » : moyennes par commune et par quartier

## Ce qui existe déjà

L'onglet contient un bloc géographique (`GeoCharts`) qui affiche, pour les biens en location, des graphiques **par province, section, ville, commune, quartier, avenue** (et territoire/collectivité/groupement/village en zone rurale). Ces graphiques comptent **le nombre de biens**, ils ne calculent aucune moyenne.

Ce qui n'existe pas : les graphiques de **moyenne de loyer** et de **moyenne de hauteur de construction** par commune et par quartier.

## Ce qui sera ajouté

Quatre nouveaux graphiques dans l'onglet « Location & Valeur », placés juste avant le bloc géographique existant :

1. **Loyer moyen par commune** — barres horizontales, top 12 communes, moyenne du loyer mensuel déclaré en USD.
2. **Loyer moyen par quartier** — barres horizontales, top 12 quartiers.
3. **Hauteur moyenne par commune** — barres horizontales, moyenne en mètres.
4. **Hauteur moyenne par quartier** — barres horizontales, moyenne en mètres.

Règles de calcul :
- Le loyer moyen agrège le loyer global du bien (mode « un seul local ») et la somme des loyers des locaux en mode « plusieurs locaux », comme le fait déjà le KPI « Loyer moyen ».
- La hauteur moyenne utilise la hauteur du croquis quand elle existe, sinon la hauteur déclarée dans le bloc Construction (même règle de repli que l'onglet Construction).
- Un quartier ou une commune n'apparaît que s'il possède au moins une valeur exploitable ; les libellés vides sont ignorés.
- Chaque carte affiche le nombre de biens pris en compte dans son texte d'analyse, pour éviter de lire une moyenne calculée sur un seul bien comme une tendance.
- Les cartes se masquent automatiquement lorsqu'aucune donnée n'est disponible, comme les autres graphiques de l'onglet.

Les quatre graphiques sont enregistrés dans la configuration des onglets Analytics, donc l'espace admin pourra les masquer, les réordonner ou changer leur type comme les autres.

## Détails techniques

- `src/components/visualizations/blocks/RentalMarketBlock.tsx` : quatre `useMemo` de moyennes (`avgRentByCommune`, `avgRentByQuartier`, `avgHeightByCommune`, `avgHeightByQuartier`) construits sur les enregistrements filtrés (loyer : sous-ensemble en location ; hauteur : tous les biens filtrés), puis quatre `ChartCard` ajoutés à la liste `charts` avant l'entrée `geo`.
- Un petit utilitaire local `averageBy(records, field, valueFn, topN)` factorise le regroupement/moyenne/tri afin d'éviter quatre calculs dupliqués.
- La hauteur reprend la logique de repli déjà écrite dans `ParcelsWithTitleBlock` (`building_shapes[].heightM` puis `building_height` / `apartment_height`) ; elle sera extraite dans `src/utils/analyticsHelpers.ts` pour être partagée par les deux blocs.
- `src/config/analyticsTabsRegistry.ts` : ajout des items `rent-by-commune`, `rent-by-quartier`, `height-by-commune`, `height-by-quartier` dans l'onglet `rental-market` avec `chart_type: 'bar-h'`.
- Aucun changement de base de données : `commune`, `quartier`, `monthly_rent_usd`, `rental_units`, `building_shapes` et `building_height` sont déjà récupérés par `useLandDataAnalytics`.
