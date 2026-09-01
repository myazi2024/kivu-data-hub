# Refonte des explications des services — Dropdown actions (carte cadastrale)

## Problème
Dans `ParcelActionsDropdown.tsx`, chaque service affiche `action.description` (tronquée à 2 lignes via `line-clamp-2`). Ces descriptions (stockées dans `parcel_actions_config.description`) sont trop courtes pour expliquer ce que le service permet de faire.

## Solution
Ajouter une **explication détaillée dépliable** par service, comme dans le catalogue de services : un bouton « En savoir plus » sous la description courte qui déroule une explication complète.

### 1. Base de données
- Migration : ajouter la colonne `detailed_description TEXT` (nullable) à `parcel_actions_config`.
- Seed : `UPDATE` pour remplir les explications détaillées des 9 actions par défaut (expertise, mutation, mortgage_management, land_title_request, permit_add, tax, permit_request, subdivision, land_dispute) — texte FR réécrit expliquant concrètement ce que l'utilisateur obtient en cliquant (ex. mutation : « Transférez la propriété de cette parcelle à un acquéreur : formulaire de demande, documents justificatifs, suivi du traitement par l'administration jusqu'à l'émission du certificat de mutation. »).

### 2. Hook `useParcelActionsConfig.tsx`
- Étendre l'interface `ParcelAction` avec `detailedDescription?: string`.
- Mapper la colonne dans `mapDbToParcelAction` et `mapParcelActionToDb` (incluse dans le payload du RPC `bulk_update_parcel_actions` seulement si le RPC le supporte — sinon sauvegarde via UPDATE direct sur la colonne).

### 3. `ParcelActionsDropdown.tsx`
- Sous la description courte, ajouter un bouton « En savoir plus / Réduire » (chevron animé) qui déplie `detailedDescription` (repliable, état local par action, `aria-expanded`).
- Le bouton ne s'affiche que si une explication détaillée existe.
- Un clic sur « En savoir plus » ne doit pas déclencher l'action du service (stopPropagation) — seul le clic sur le corps de la carte lance le service.

### 4. Admin — `AdminParcelActionsConfig.tsx`
- Ajouter un champ textarea « Explication détaillée » dans le formulaire d'édition d'une action, sauvegardé comme les autres champs.

## Fichiers concernés
- `supabase/migrations/<ts>_parcel_actions_detailed_description.sql` (nouveau)
- `src/hooks/useParcelActionsConfig.tsx`
- `src/components/cadastral/ParcelActionsDropdown.tsx`
- `src/components/admin/AdminParcelActionsConfig.tsx`
- éventuellement `src/integrations/supabase/types.ts` (régénération types)

## Vérification
- Build + tests existants.
- Vérification visuelle via le navigateur : ouvrir le dropdown actions, déplier « En savoir plus » sur plusieurs services.
