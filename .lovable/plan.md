# Recherche avancée cadastrale — Titre foncier et État de la parcelle

## Objectif
Recentrer les filtres avancés sur ce qui aide vraiment à retrouver un bien : le titre foncier et l'état bâti/non bâti de la parcelle, en retirant les blocs qui exposent des informations sensibles ou peu pertinentes.

## Constat vérifié
- Le picklist « Type titre » existe déjà, mais il est **enfoui dans le bloc « Critères »** (avec propriétaire et surfaces), donc invisible comme critère clé.
- Le bloc « Statut » propose 3 cases : autorisation de bâtir, hypothèque, arriérés fiscaux.
- La catégorie de bien du formulaire CCC est bien remontée en base : `cadastral_contributions.property_category` (ex. « Maison ») est recopiée vers `cadastral_parcels.property_category` par le trigger d'approbation. Une parcelle héritée a encore ce champ vide, avec `construction_type` / `construction_nature` renseignés.

## Changements

### 1. Nouveau bloc « Titre foncier » (mis en avant)
Un bloc dédié, placé juste après la localisation :
- **Type de titre foncier** (picklist) : Certificat d'enregistrement, Contrat de location (occupation provisoire), Fiche parcellaire — liste alignée sur le formulaire CCC.
- **Numéro du titre** (saisie libre) déplacé ici.

### 2. Nouveau filtre « État de la parcelle »
Trois choix : Tous / Avec construction / Sans construction.
- « Sans construction » = catégorie de bien « Terrain nu ».
- « Avec construction » = toutes les autres catégories.

### 3. Blocs retirés
- **Critères** (propriétaire, surface min/max, type parcelle) — retiré.
- **Statut** (autorisation de bâtir, hypothèque, arriérés fiscaux) — retiré : ces informations relèvent de l'accès payant à la fiche parcellaire.

## Détails techniques
- `src/components/cadastral/AdvancedSearchFilters.tsx` : supprimer les sections « Critères » et « Statut » ; créer une section « Titre foncier » (type + numéro) et une section « État de la parcelle » (Select ou segmented). Retirer les imports devenus inutiles (`Checkbox`, `AlertCircle`, `Home` si non réutilisé) et `handleAreaChange`.
- `src/hooks/useAdvancedCadastralSearch.tsx` :
  - retirer de `SearchFilters` et de `buildQuery` : `ownerName`, `areaSqmMin`, `areaSqmMax`, `parcelType`, `hasBuildingPermit`, `hasMortgage`, `hasTaxArrears` ; supprimer le bloc de post-traitement des statuts (requêtes permis/hypothèques/fiscalité) ;
  - ajouter `buildState?: 'built' | 'unbuilt'` :
    - `unbuilt` → `property_category = 'Terrain nu'` **ou** (`property_category` nul et (`construction_type = 'Terrain nu'` ou `construction_nature = 'Non bâti'`)) via `.or(...)`, pour couvrir les parcelles héritées ;
    - `built` → la négation de ce même critère ;
  - conserver `titleType` et `titleReferenceNumber` inchangés.
- Vérifier les consommateurs de ces filtres (`CadastralMap.tsx`, affichage des résultats) et retirer les références aux champs supprimés.
- Aucune migration base de données.

## Hors périmètre
- La recherche standard (parcelle / titre) reste inchangée.
- Aucun changement du formulaire CCC ni des accès payants.
