# Terrain nu : vocabulaire locatif adapté et champs non pertinents désactivés

## 1. Libellés du mode de mise en location

Quand la catégorie de bien est « Terrain nu » :

- « Un seul local » devient « Un seul terrain nu » (texte d'aide : le terrain est loué en entier à un seul locataire).
- « Divisé en plusieurs locaux » devient « Divisé en plusieurs terrains » (texte d'aide : chaque parcelle de terrain est louée séparément).
- La phrase d'introduction et le champ « Nombre de locaux mis en location » suivent le même vocabulaire (« Nombre de terrains mis en location »).
- Dans le mode multi, chaque carte « Local #1 » devient « Terrain #1 », « Nom du local » devient « Nom du terrain », et la question d'occupation est reformulée pour un terrain.
- La boîte de confirmation de réduction du nombre d'unités reprend le même mot.

Pour toutes les autres catégories, rien ne change.

## 2. Champs non pertinents pour un terrain nu

Pour un terrain nu (construction principale, constructions secondaires et chaque unité en mode multi) :

- « Ce local/terrain est-il actuellement occupé ? » (statut d'occupation), « Capacité d'accueil » et « Combien de personnes y vivent ? » ne sont plus affichés.
- Ils ne figurent plus dans la liste des champs obligatoires manquants et ne bloquent plus le passage à l'onglet suivant ni la soumission.
- Le libellé de date reste « En location depuis le » (le basculement « Inoccupé depuis l' » dépend du statut d'occupation, absent ici).
- L'agrégation automatique capacité/occupants depuis les unités est neutralisée pour un terrain nu.

## 3. Autres incohérences corrigées

- Sélecteur d'étage : masqué pour un terrain nu et l'étage n'est jamais exigé (un terrain n'a pas d'étages).
- Passage d'une autre catégorie à « Terrain nu » : les données d'occupation déjà saisies (statut, capacité, occupants — principale, secondaires et unités) sont nettoyées pour ne pas rester dans l'enregistrement.
- Récapitulatif et blocs de synthèse locative : ne montrent plus les lignes occupation/capacité pour un terrain nu.

## Détails techniques

- `src/components/cadastral/RentalConfigurationFields.tsx` : ajouter un helper de vocabulaire (`unitNoun`/`unitNounPlural`) dérivé de `propertyCategory`/`constructionType`, l'utiliser dans `RentalConfigurationSelector` (titres des deux options, phrase d'aide, libellé du compteur, AlertDialog) et dans `MonthlyRentFields` (titre de carte, nom d'unité). Conditionner l'affichage occupation/capacité/occupants et du sélecteur d'étage à `!isTerrainNu`.
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` : ne pas agréger `hostingCapacity`/`occupantCount` depuis les unités quand terrain nu ; nettoyer les champs d'occupation lors du basculement de catégorie vers « Terrain nu ».
- `src/components/cadastral/AdditionalConstructionBlock.tsx` : même masquage du bloc capacité (déjà conditionné par catégorie — vérifier `constructionType === 'Terrain nu'`) et même agrégation neutralisée.
- `src/hooks/ccc/useFormValidation.ts` : exempter le terrain nu des contrôles `isOccupied` / `hostingCapacity` / `occupantCount` / étage — construction principale (l. 150-190), constructions secondaires (l. 209-249) — en s'appuyant sur `isTerrainNu` et, pour les blocs secondaires, sur leur propre catégorie.
- `src/components/cadastral/ccc-tabs/review/RentalSummary.tsx` : masquer occupation/capacité pour un terrain nu.

Aucun changement de base de données.
