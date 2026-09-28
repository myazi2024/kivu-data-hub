# Données foncières : remplacer le filtre SU/SR par « Circonscription »

Dans Analytics et sur la Carte du menu Données foncières, le sélecteur « Toutes les sections / Urbaine / Rurale » est remplacé par un sélecteur « Circonscription » (circonscription foncière). La zone urbaine ou rurale est déduite automatiquement de la circonscription choisie, comme dans le formulaire CCC.

## Comportement attendu

- Barre « Lieu » : Rép. Dém. du Congo › Province › **Circonscription** › (Ville › Commune › Quartier › Avenue) ou (Territoire › Collectivité › Groupement › Village).
- Liste : « Toutes les circonscriptions » + circonscriptions de la province choisie (toutes, groupées par province, si aucune province).
- Choisir une circonscription :
  - filtre les indicateurs et graphiques sur les parcelles de cette circonscription ;
  - affiche automatiquement le bon enchaînement (urbain ou rural) et bascule la carte en vue Villes ou Territoires, comme le faisait l'ancien choix Urbaine/Rurale ;
  - purge ville/commune/quartier/avenue/territoire/collectivité/groupement/village.
- Changer de province purge la circonscription.
- Le libellé de filtre actif (en-têtes, exports) affiche le nom de la circonscription au lieu de « Urbaine/Rurale ».
- Clic sur un territoire de la carte : la circonscription est vidée et la vue rurale est conservée (pas de sélection de circonscription imposée).
- Anciennes données sans circonscription : incluses quand le filtre est « Toutes », exclues quand une circonscription précise est choisie ; la vue urbaine/rurale reste déduite du préfixe SU/SR.

## Détails techniques

- `src/utils/analyticsHelpers.ts` : ajout `landDistrict?: string` à `AnalyticsFilter` ; `sectionType` devient dérivé (`getSectionTypeForLandDistrict`) et n'est plus modifié directement par l'UI ; `matchesLocation` compare `land_district` (normalisation accents/casse) ; `getSectionType` utilise d'abord `land_district` puis `parcel_type` ; `buildFilterLabel` affiche la circonscription.
- `src/hooks/useLandDataAnalytics.tsx` : ajout de `land_district` aux sélections parcelles et contributions, propagation vers les enregistrements rattachés (titres, litiges, hypothèques, mutations, expertises…) via l'enrichissement parcelle existant ; montée de version du cache ; `src/types/landAnalytics.ts` : champ `land_district`.
- `src/components/visualizations/filters/useAnalyticsCascade.ts` : liste `landDistricts` (province → `getLandDistrictsForProvince`, sinon toutes) ; filtrage par circonscription dans `sectionScoped`.
- `AnalyticsLocationRow.tsx` : Select « Circonscription » à la place du Select sections ; `showUrbanSub`/`showRuralSub` pilotés par la zone dérivée ; appel de `onSectionTypeChange(zone dérivée)` pour garder la carte synchronisée.
- `AnalyticsFilters.tsx` : réinitialisation et détection « filtre actif » basées sur `landDistrict` ; synchronisation clic-territoire sans forcer de circonscription.
- `DRCInteractiveMap.tsx` / `useMapDrilldown.ts` : inchangés sur le fond (continuent de recevoir urbaine/rurale dérivée) ; titre de carte affiche la circonscription si choisie.
- Back-end : aucune migration ; `land_district` existe déjà sur `cadastral_parcels` et `cadastral_contributions`. Vérifier que la vue/politiques de lecture analytics exposent la colonne (lecture seule).
- Tests : cas unitaires sur `matchesLocation`/`buildFilterLabel` avec circonscription ; `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
