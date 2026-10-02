# Données foncières : carte des circonscriptions + revue des filtres Analytics

## 1. Carte RDC — vue « Circonscriptions foncières »
Aujourd'hui la Carte RDC affiche provinces, territoires, communes et quartiers, mais aucune vue par circonscription.

Ce qui sera ajouté :
- Un sélecteur de vue en haut de la carte : « Provinces » (vue actuelle) / « Circonscriptions foncières ».
- La vue Circonscriptions reprend exactement la carte de l'Accueil : territoires + communes des villes couvertes, mêmes règles (zone colorée seulement si son nom correspond exactement à une seule circonscription de la même province ; zones découpées ou non validées en gris, inertes ; aucune frontière inventée).
- Coloration : selon l'indicateur de l'onglet Analytics actif (comme les autres vues), avec la couleur unique par circonscription quand aucun indicateur ne s'applique.
- Survol / clic : nom de la circonscription, province et chiffres de l'onglet actif, calculés sur les données déjà chargées par Données foncières (filtrées par circonscription).
- Clic sur une circonscription : zoom animé, libellé « Circonscription foncière de … », et le filtre « Circonscription » d'Analytics se règle sur elle (et inversement : choisir une circonscription dans le filtre ouvre cette vue et zoome). Second clic ou bouton retour : dézoom et filtre vidé.
- Province choisie : la vue se limite aux circonscriptions de cette province.

## 2. Revue des filtres Analytics
Passage en revue de chaque filtre (Lieu, Circonscription, Ville/Commune/Quartier/Avenue, Territoire/Collectivité/Groupement/Village, période, filtres propres à chaque onglet) contre le formulaire CCC :
- cascade et réinitialisations (changer de province/circonscription purge bien les niveaux inférieurs, synchronisation carte ↔ filtres) ;
- zone urbaine/rurale déduite du préfixe SU/SR et de la circonscription, comme le CCC ;
- valeurs comparées aux listes du CCC (statuts, types de titre, usages, catégories, statuts de taxe « Impayé/En retard »…) et à la normalisation des accents/casse ;
- anciens enregistrements sans circonscription, filtres de période sur la bonne date.
Chaque écart trouvé est corrigé ; les écarts et corrections seront listés dans le compte rendu. Aucune nouvelle fonctionnalité de filtre.

## Détails techniques
- Extraire de `HomeProvinceMap.tsx` un composant réutilisable `LandDistrictMap` (projection, appariement via `landDistrictMapping.ts`, zoom `useAnimatedBbox`, badge), paramétrable : `getDistrictColor`, `renderDetails`, `selected`/`onSelect`, `provinceFilter`. L'Accueil l'utilise avec les chiffres de `useHomeBicCounts`, Données foncières avec les données du hook analytics.
- `useMapDrilldown.ts` : nouvel état `mapView` ('provinces' | 'districts') + `selectedLandDistrict`, synchronisés avec l'URL (`view`, `district`).
- `DRCInteractiveMap.tsx` : branche de rendu `LandDistrictMap` ; contexte partagé avec `AnalyticsFilters` pour la circonscription (même mécanisme que `SectionTypeChangeContext`).
- `useMapIndicators.ts` : agrégation par `land_district` normalisé.
- Filtres : `analyticsHelpers.ts`, `useAnalyticsCascade.ts`, `AnalyticsLocationRow.tsx`, `AnalyticsFilters.tsx`, `AnalyticsTimeRow.tsx` ; tests unitaires pour chaque correction.
- Aucune migration prévue. `AGENTS.md` mis à jour (carte des circonscriptions partagée Accueil / Données foncières).
