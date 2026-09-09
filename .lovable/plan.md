# Expertise immobilière — cohérence des dépendances « constructions »

## Ce qui est constaté (vérifié dans le code et la base)

- Le bouton « Construction(s) » du bloc « Périmètre concerné par l'expertise » n'est bloqué que lorsque le type est « Expertise totale ». En « Expertise partielle », il reste cliquable même si la parcelle n'a aucune construction connue : la carte n'affiche alors rien et un simple texte invite à tracer une zone, mais l'utilisateur peut rester sur un choix vide.
- Le formulaire ne gère qu'une seule construction : les blocs « Construction », « Caractéristiques », « Position sur la parcelle », « Équipements & commodités » (onglet Général) et « Matériaux & finitions » (onglet Matériaux) sont uniques et écrasés à chaque changement de construction sélectionnée. Quand la parcelle en compte plusieurs, la deuxième et les suivantes ne peuvent pas être décrites.
- La cascade de dépendances (catégorie → type → nature → matériaux → standing) existe une seule fois, partagée par toutes les constructions.
- La demande enregistrée n'a aucun emplacement pour des données par construction : la table ne contient que des colonnes uniques (catégorie, type, année, matériaux, équipements…).

## Corrections prévues

### 1. « Construction(s) » dépend de l'existence réelle de constructions
- Si la parcelle est enregistrée comme terrain vide (aucune construction connue au cadastre, ou catégorie « Terrain nu »), l'option « Construction(s) » est grisée et non cliquable, quel que soit le type d'expertise, avec une explication au survol : « Aucune construction n'est enregistrée sur cette parcelle ».
- Dans ce cas, seuls « Toute la parcelle » et « Zone tracée » restent disponibles ; une expertise partielle bascule automatiquement sur « Zone tracée ».
- Le clic sur une construction depuis la carte est également neutralisé quand il n'y en a aucune.
- Le contrôle avant paiement refuse toute demande partielle ciblant des constructions inexistantes.

### 2. Une fiche distincte par construction
- Quand la parcelle compte plusieurs constructions, les blocs « Construction », « Caractéristiques », « Position sur la parcelle », « Équipements & commodités » et « Matériaux & finitions » sont répétés une fois par construction, présentés en sections dépliables portant le nom de chaque construction (Construction principale, Construction 2, …).
- Chaque fiche a sa propre cascade indépendante : la catégorie choisie pour une construction ne modifie plus les listes des autres ; le pré-remplissage cadastral, les champs verrouillés « donnée du cadastre » et le champ d'écart constaté sont propres à chaque construction.
- Les fiches affichées suivent le périmètre : en expertise partielle par constructions, seules les constructions cochées sont décrites ; en expertise totale, toutes les constructions connues le sont.
- S'il n'y a qu'une seule construction, l'affichage reste exactement celui d'aujourd'hui (pas de section dépliable superflue).
- S'il n'y a aucune construction (terrain vide), ces cinq blocs disparaissent entièrement, l'onglet « Matériaux » n'est plus proposé, et seuls les éléments liés au terrain restent (localisation, environnement, documents).
- Les validations avant paiement portent sur chaque fiche : une construction ciblée incomplète est signalée avec son nom.

### 3. Enregistrement et lecture côté Admin
- Les fiches par construction sont enregistrées dans la demande ; la première construction continue d'alimenter les champs existants pour ne rien casser dans les écrans actuels.
- La fiche Admin d'une demande affiche la liste des constructions expertisées avec leurs caractéristiques, équipements et matériaux respectifs.

## Détails techniques

- Migration : ajout de `building_details jsonb NOT NULL DEFAULT '[]'` sur `real_estate_expertise_requests` (tableau d'objets `{ ref, label, property_category, construction_type, construction_nature, construction_materials, construction_year, number_of_floors, total_built_area_sqm, declared_usage, standing, building_position, facade_orientation, distance_from_road_m, has_direct_street_access, equipements…, roof_material, window_type, floor_material, has_plaster/painting/ceiling/double_glazing, cadastre_discrepancies }`). Aucun changement de policy nécessaire.
- Nouveau composant `src/components/cadastral/expertise/BuildingDetailCard.tsx` : encapsule les cinq blocs pour une construction, avec son propre état et sa propre cascade.
- Nouveau hook `src/hooks/useBuildingDetailForm.ts` : extraction de l'état construction + effets de cascade (`CATEGORY_TO_CONSTRUCTION_TYPES`, natures, matériaux, standings) aujourd'hui inline dans `RealEstateExpertiseRequestDialog.tsx`, instancié une fois par construction.
- `RealEstateExpertiseRequestDialog.tsx` : `hasKnownBuildings = knownBuildings.length > 0 || mapBuildings.length > 0` ; `isBareLandParcel = !hasKnownBuildings || cadastreSource.property_category === 'Terrain nu'` ; option `buildings` `disabled` quand `isBareLandParcel` ; `handleScopeChange('partial')` cible `area` au lieu de `buildings` dans ce cas ; `toggleBuildingRef` sans effet si `isBareLandParcel` ; remplacement des blocs uniques par `buildingsToDescribe.map(...)` sur `BuildingDetailCard` ; onglet `materiaux` masqué quand `isBareLandParcel` ; payload : `building_details` + rétro-compatibilité des colonnes plates depuis la première fiche.
- `ExpertiseTargetMap.tsx` : ignorer les clics bâtiment quand la liste est vide.
- `src/types/expertise.ts` : ajout de `ExpertiseBuildingDetail` et du champ `building_details`.
- `src/components/admin/expertise/ExpertiseDetailsDialog.tsx` : rendu de la liste `building_details`.
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` puis `npx vitest run`.
