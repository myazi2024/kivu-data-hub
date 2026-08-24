# Refonte de la recherche standard — Carte cadastrale

## Objectif
La recherche standard (barre principale) doit permettre de trouver une parcelle **soit par son numéro de parcelle SU/SR**, **soit par le numéro du titre de propriété** saisi dans le formulaire CCC. La recherche avancée reste disponible, mais clairement en second niveau.

## Constat actuel (vérifié)
- La barre de recherche filtre uniquement sur `parcel_number` (`CadastralMap.tsx`, filtrage prédictif).
- Le numéro de titre existe en base : colonne `title_reference_number` de `cadastral_parcels` (avec `property_title_type`), mais elle **n'est pas chargée** par `useCadastralMapData.tsx`, donc introuvable depuis la carte.
- Le champ de saisie n'autorise que `0-9, R, S, U, . , /` (config par défaut, aucune ligne en base) : taper un numéro de titre contenant d'autres lettres/tirets déclenche l'alerte « caractère non autorisé » et les caractères sont supprimés.

## Refonte proposée

### 1. Deux modes de recherche standard
Un petit sélecteur à deux segments juste au-dessus/à gauche du champ :
- **N° de parcelle (SU/SR)** — mode par défaut, comportement actuel conservé (validation stricte des caractères, feedback sonore/shake).
- **N° de titre de propriété** — validation assouplie (lettres A-Z, chiffres, `.`, `/`, `-`, espace), sans alarme de caractère invalide.

Le placeholder, le message d'aide et l'exemple s'adaptent au mode choisi.

### 2. Détection automatique
Même en mode « parcelle », si la saisie ne ressemble pas à un numéro SU/SR mais correspond à un titre existant, les résultats de type titre sont proposés (avec une puce « Titre » dans la suggestion). L'utilisateur n'est jamais bloqué.

### 3. Suggestions enrichies
Chaque suggestion affiche : numéro de parcelle, propriétaire, localité, et — quand la correspondance vient du titre — le type de titre et le numéro de titre mis en évidence.

### 4. Recherche avancée en second niveau
- Le bouton d'accès reste, mais est explicitement libellé « Recherche avancée » (libellé visible sur desktop) et placé après la barre standard, avec un séparateur discret.
- Ajout d'un critère **Numéro de titre** et **Type de titre** dans les filtres avancés (le type existe déjà, le numéro sera ajouté).

## Détails techniques
- `src/hooks/useCadastralMapData.tsx` : ajouter `title_reference_number` et `property_title_type` au `select` et à l'interface `ParcelData`.
- `src/pages/CadastralMap.tsx` :
  - nouvel état `searchMode: 'parcel' | 'title'` ;
  - filtrage prédictif : match sur `parcel_number` en mode parcelle, sur `title_reference_number` en mode titre, plus repli croisé automatique ;
  - sanitation conditionnelle : regex de `useSearchBarConfig` en mode parcelle, regex permissive en mode titre ;
  - `handleSelectParcel` remplit la barre avec la valeur correspondant au mode ;
  - historique et analytics (`cadastral_map_search`) tracent le mode utilisé.
- Nouveau composant `src/components/cadastral/CadastralSearchModeToggle.tsx` (segmented control, accessible, tailles tactiles ≥40px, tokens sémantiques).
- `src/hooks/useAdvancedCadastralSearch.tsx` : ajouter le filtre `titleReferenceNumber` (`ilike` échappé via `escapeIlike`).
- `src/components/cadastral/AdvancedSearchFilters.tsx` : champ « Numéro du titre » dans le bloc identification.
- Aucune migration de base nécessaire ; aucune modification de logique métier ou de tarification.

## Hors périmètre
- Pas de changement des accès payants aux données de parcelle.
- Pas de modification du formulaire CCC.
