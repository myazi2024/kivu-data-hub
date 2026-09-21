# État de la construction + côtés « Mur et Route » + éclairage public

## 1. Bloc Construction — état d'avancement

Après « Année de construction », ajouter un choix **Construction achevée / Construction en cours** (boutons radio), affiché dans les mêmes conditions que l'année (catégorie bâtie).

- Valeur par défaut : **Construction achevée**.
- Quand « Construction en cours » est choisi, le libellé du champ année devient **« Année de début des travaux »** (même liste 1950 → année en cours) ; il redevient « Année de construction » si achevée.
- Les questions de location et d'occupation restent inchangées et visibles dans les deux cas (choix confirmé).
- Même ajout dans le bloc « Autre construction », par construction.
- L'information apparaît dans le récapitulatif, la fiche cadastrale et la fiche Admin CCC.

## 2. « Limites et Entrées » — un côté peut avoir un mur **et** une route

Aujourd'hui, chaque côté n'accepte qu'un seul type (Mur **ou** Route) : choisir l'un efface les données de l'autre. Ce sera remplacé par une sélection **cumulative**.

- Le contrôle segmenté garde exactement le même design (deux pastilles Mur / Route), mais devient **multi-sélection** : cliquer sur « Mur » l'active, cliquer sur « Route » l'active aussi ; les deux peuvent être actifs en même temps (fond ambre + fond vert). Re-cliquer sur un segment actif le désactive et efface ses données.
- Les deux formulaires (Informations sur le mur, Informations sur la route) s'affichent l'un sous l'autre selon les segments actifs.
- **Au moins un des deux** doit être sélectionné et complété pour valider le côté ; le bouton « Ajouter » exige les champs obligatoires de chaque bloc activé.
- Quand les deux sont actifs, le côté compte comme **bordant une route** pour les indicateurs (accès, enclavement, carte) ; le mur est une information complémentaire.
- Résumé du côté confirmé : les deux informations affichées (« Mur bloc de ciment, H 2 m · Avenue, largeur 8 m … »), pastille d'en-tête avec les deux icônes.
- Les dossiers déjà enregistrés (un seul type) s'ouvrent sans perte : le type existant est repris comme segment actif.

## 3. « Route » — éclairage public

Avant « Présence d'un caniveau » :

- **« Éclairage public devant la parcelle ? »** (Oui / Non), obligatoire pour valider un côté routier.
- Si **Oui** : **« Nombre de lampadaires qui bordent la parcelle »** (nombre entier ≥ 1), obligatoire ; masqué et effacé si Non.
- Ces valeurs figurent dans le résumé du côté, le récapitulatif, la fiche cadastrale, la fiche Admin et le panneau parcelle de la carte cadastrale (pastille « Éclairage public : N lampadaires » / « Sans éclairage »).

## Détails techniques

**Base de données**
- Migration : colonne `construction_status` (texte, valeurs `completed` / `in_progress`, défaut `completed`) sur `cadastral_contributions` et `cadastral_parcels` ; ajout au trigger de recopie `zz_sync_contribution_extra_fields` ; l'état par construction supplémentaire reste dans le jsonb `additional_constructions`.
- Aucune migration pour les côtés : `road_sides` est un jsonb ; les nouveaux champs (`hasWall`, `hasRoad`, `hasStreetLighting`, `streetLampCount`) y sont stockés directement. La vue publique `cadastral_parcels_public` expose déjà `road_sides`.

**Front-end**
- `ParcelSidesDimensionsPanel.tsx` : `RoadSideInfo` gagne `hasWall`, `hasRoad`, `hasStreetLighting`, `streetLampCount` ; `borderType` conservé en champ dérivé (route prioritaire) pour compatibilité des lectures existantes ; `BorderTypeToggle` passe en multi-sélection (deux boutons `aria-pressed`, pastilles indépendantes, transition conservée) ; `handleBorderTypeChange` remplacé par `toggleBorderType` (activation/désactivation + purge ciblée) ; `canConfirm` = (mur complet si actif) ET (route complète si actif) ET au moins un actif ; normalisation des anciens enregistrements à l'affichage.
- `ParcelMapPreview.tsx` et `useCCCFormState.ts` : propagation/restauration des nouveaux champs.
- `ConstructionSection.tsx` et `AdditionalConstructionBlock.tsx` : boutons d'état + libellé d'année dynamique.
- `useCadastralContribution.tsx` : types et payload (`construction_status`, champs de côté).
- Affichage : `ReviewTab.tsx`, `cadastral-document/sections/LocationSection.tsx` (colonnes Éclairage/Lampadaires + Mur), `CCCDetailsDialog.tsx`, `CadastralMap.tsx`, `ParcelSketchSVG.tsx` (un côté mur+route reste tracé comme route).
- Validation : `useFormValidation.ts` (état de construction requis pour une catégorie bâtie).

Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
