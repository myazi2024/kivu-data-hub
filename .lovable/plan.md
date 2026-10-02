# Alignement des services du menu « Actions » sur le formulaire CCC

## Objectif
Chaque service du menu « Actions » de la carte cadastrale doit utiliser les mêmes données, listes de choix et règles que le formulaire CCC mis à jour, sans ajouter de nouveaux services.

## Incohérences déjà relevées
1. **Terminologie** : les descriptions de « Ajouter une autorisation » et « Demander une autorisation » utilisent encore « permis » (dans les valeurs par défaut et probablement dans la configuration enregistrée).
2. **Construction existante** : « Demander une autorisation » considère qu'une construction existe seulement à partir du type ou de la nature de la construction principale. Les constructions additionnelles et les tracés de bâtiments saisis dans le CCC sont ignorés.
3. **Données transmises** : « Gestion hypothèque » et « Ajouter une autorisation » ne reçoivent pas les données de la parcelle. Ils ne peuvent donc pas reprendre ce que le CCC connaît déjà.

## Revue service par service
Pour chacun des 9 services (expertise, mutation, hypothèque, titre foncier, ajouter une autorisation, taxe foncière, demander une autorisation, lotissement, litige foncier), comparer avec le CCC :
- les listes de choix (types de titre, types et natures de construction, usages, matériaux, types de bail initial ou renouvellement) : les reprendre des listes partagées du CCC, sans copies locales ;
- le préremplissage (propriétaire, superficie, localisation, constructions, voirie) à partir des données réelles de la parcelle ;
- les règles (hauteur minimale, rez-de-chaussée = 0, zone urbaine ou rurale déduite automatiquement, un seul IRL par construction et par exercice, minimum de 3 points GPS) : les reprendre des règles partagées du CCC ;
- les conditions d'accès (par exemple, l'hypothèque ou la mutation impossible sans titre, et le titre foncier proposé seulement si aucun titre n'est enregistré) : cohérentes avec ce que le CCC enregistre ;
- les descriptions courtes et détaillées du menu : exactes par rapport à ce que fait réellement le formulaire.

Les écarts trouvés sont corrigés directement. Les fonctions inutilisées et les copies locales sont supprimées. Aucun nouveau service ni nouvelle étape n'est ajouté.

## Vérification
Contrôle des types, tests existants plus tests ciblés sur les règles partagées. La vérification dans le navigateur reste limitée : l'écran carte demande une connexion que mon outil ne peut pas ouvrir.

## Détails techniques
- `useParcelActionsConfig.tsx` : remplacer « permis » par « autorisation » dans `DEFAULT_ACTIONS`. Ajouter une migration `UPDATE parcel_actions_config` pour les descriptions `permit_add` et `permit_request`.
- `ParcelActionsDropdown.tsx` : `hasExistingConstruction` tiendra aussi compte de `additional_constructions` et `building_outlines`. Passer `parcelData` à `MortgageManagementDialog` et `BuildingPermitManagementDialog` si ces dialogues l'acceptent.
- Dans chaque dialogue, repérer les constantes locales qui doublonnent `PROPERTY_TITLE_TYPES`, les normaliseurs `constructionType`, `constructionNature` et `declaredUsage`, ainsi que `gpsRules`. Les remplacer par les modules partagés.
- Les conditions d'accès restent vérifiées côté serveur lorsqu'elles le sont déjà. Aucune règle critique n'est ajoutée seulement dans le navigateur.
- Mettre à jour `AGENTS.md` si une règle d'alignement devient structurelle.
