

# Ajout du bloc "Autorisation de bâtir" dans l'onglet Mise en valeur du titre foncier

## Probleme

L'onglet "Infos" du formulaire CCC affiche un bloc "Autorisation de bâtir" juste après le bloc "Construction", mais l'onglet "Mise en valeur" du formulaire de demande de titre foncier n'intègre pas du tout ce bloc — ni en lecture seule (données enregistrées), ni en mode édition (proposer une mise à jour).

## Solution

Ajouter un sous-bloc "Autorisation de bâtir" dans les deux zones de l'onglet Valorisation :

### 1. Bloc lecture seule — "Données enregistrées"

Après la grille des 7 champs construction existants, ajouter un sous-bloc "Autorisation de bâtir" (conditionnel : visible si le type de construction n'est pas "Terrain nu") :
- Fetch des autorisations depuis `cadastral_building_permits` pour la parcelle lors de la validation (même requête que `CadastralMap.tsx` ligne 421)
- Stocker dans un nouvel état `parcelBuildingPermits`
- Afficher en lecture seule **avec masquage PII** : N° d'autorisation (masqué partiellement, ex: "PC-20***01"), type (Bâtir/Régularisation), date d'émission, statut de validité (valide/expiré), service émetteur
- Le document de l'autorisation n'est PAS affiché (accès payant)
- Si aucune autorisation trouvée, afficher "Aucune autorisation enregistrée"

### 2. Bloc conditionnel — "Proposer une mise à jour"

Quand l'utilisateur sélectionne le radio "Proposer une mise à jour", ajouter après le bloc construction éditable un sous-bloc "Autorisation de bâtir" reproduisant la structure du CCC :
- Question "Avez-vous obtenu une autorisation de bâtir ?" avec boutons Oui/Non
- Si Oui : formulaire avec type (Bâtir/Régularisation), N° autorisation, date, service émetteur (via `BuildingPermitIssuingServiceSelect`), upload document optionnel
- Validation chronologique identique au CCC (3 ans pour bâtir, post-construction pour régularisation)
- Visible uniquement si type de construction != "Terrain nu"

### 3. Données et persistance

- **Nouvel état** : `parcelBuildingPermits` (array) pour les données en lecture seule
- **Nouveaux états** pour le formulaire d'update : `hasPermitUpdate` (boolean), `permitUpdateType` ('construction' | 'regularization'), `permitUpdateNumber` (string), `permitUpdateDate` (string), `permitUpdateService` (string), `permitUpdateFile` (File | null)
- **Migration SQL** : Ajouter des colonnes à `land_title_requests` pour stocker la proposition d'autorisation :
  - `proposed_permit_type` (text)
  - `proposed_permit_number` (text)
  - `proposed_permit_date` (text)
  - `proposed_permit_service` (text)
  - `proposed_permit_document_url` (text)
- **Hook** `useLandTitleRequest.tsx` : ajouter ces champs au type et à l'insert, avec upload du document si fourni
- **Type** `landTitleRequest.ts` : ajouter les colonnes au type `LandTitleRequestRow`

### Fichiers modifiés
- **Migration SQL** : nouvelle migration pour 5 colonnes
- **`src/hooks/useLandTitleRequest.tsx`** : types + insert
- **`src/types/landTitleRequest.ts`** : colonnes ajoutées au type Row
- **`src/components/cadastral/LandTitleRequestDialog.tsx`** : fetch des permits, bloc lecture seule, bloc éditable conditionnel

