# Synchroniser Données foncières (Carte RDC + Analytics) avec le formulaire CCC

## Constat (vérifié en base et dans le code)

Les colonnes ajoutées récemment par le formulaire CCC existent bien dans `cadastral_contributions` **et** `cadastral_parcels` : `is_rented`, `rental_configuration`, `rental_units`, `rental_units_count`, `monthly_rent_usd`, `rental_start_date`, `would_sell_if_offered`, `resale_price_usd`/`_currency`, `has_recent_appraisal`, `appraisal_date`, `appraised_value_usd`, `market_listings`, `sale_listing`, `building_height`, `apartment_length/width/height/orientation`.

Mais le hook de données du menu Données foncières (`useLandDataAnalytics`) ne les demande pas. Deux conséquences :

1. **Indicateurs absents** : rien dans Analytics ni sur la carte RDC ne représente la location, les loyers, la valeur de revente, l'expertise déclarée, les annonces ou la hauteur de construction déclarée.
2. **Onglets déjà codés mais vides** : les blocs Servitudes, Bornage, Géométrie, Cohérence & Anti-fraude et une partie de Contributions lisent des colonnes (`servitude_data`, `boundary_history`, `parcel_sides`, `road_sides`, `gps_coordinates`, `tax_history`, `mortgage_history`, `ownership_history`, `dispute_data`, `current_owner_since`, `rental_start_date`) qui ne sont jamais chargées — ces onglets affichent donc « aucune donnée » quelle que soit la base.

## Ce qui sera fait

### 1. Réparer l'alimentation en données
Ajouter au chargement des parcelles et des contributions toutes les colonnes manquantes listées ci-dessus. Effet immédiat : les onglets Servitudes, Bornage, Géométrie, Cohérence et les graphiques d'ancienneté/location de Contributions se remplissent enfin.

### 2. Nouvel onglet Analytics « Location & Valeur »
Un bloc dédié aux indicateurs marchands du CCC :
- KPI : biens mis en location, taux de mise en location, loyer mensuel moyen (USD), locaux déclarés, biens à vendre, valeur de revente moyenne, expertises récentes déclarées.
- Graphiques : location oui/non, mode locatif (un seul local / plusieurs locaux), tranches de loyer mensuel, loyer moyen par catégorie de bien, ancienneté de mise en location, disposition à vendre, tranches de prix de revente, devise déclarée, expertise récente oui/non, tranches de valeur expertisée, annonces publiées (locatives / vente), répartition géographique et évolution mensuelle.
- Onglet configurable comme les autres depuis l'espace admin (titres, visibilité, ordre, type de graphique).

### 3. Enrichir l'onglet « Construction »
Ajouter la hauteur de construction déclarée (`building_height`, indépendante du croquis) et les dimensions d'appartement (longueur/largeur/hauteur, orientation) aux graphiques existants, en complément de la hauteur issue du croquis.

### 4. Carte RDC
- Nouveau profil de carte pour l'onglet « Location & Valeur » : choroplèthe par nombre de biens en location, infobulle (biens loués, loyer moyen, biens à vendre, prix de revente moyen) et mini-légende.
- La hauteur moyenne de construction affichée par province prendra aussi en compte `building_height` quand le croquis n'est pas renseigné.

## Détails techniques

- `src/hooks/useLandDataAnalytics.tsx` : élargir les deux chaînes `select` (parcelles + contributions) ; bump de la `queryKey` pour invalider le cache.
- `src/types/landAnalytics.ts` : compléter `ParcelRecord` et `ContributionRecord`.
- Nouveau `src/components/visualizations/blocks/RentalMarketBlock.tsx` sur le modèle des blocs existants (`useBlockFilter`, `KpiGrid`, `ChartCard`, `GeoCharts`).
- `src/config/analyticsTabsRegistry.ts` : entrée `rental-market` (KPIs + graphiques par défaut) ; `ProvinceDataVisualization.tsx` : icône + `BLOCK_MAP`.
- `src/config/mapTabProfiles.ts` : profil `rental-market` ; `src/components/map/hooks/useMapIndicators.ts` : fallback hauteur.
- Aucune migration de base nécessaire : toutes les colonnes existent déjà.
