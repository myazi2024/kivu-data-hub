# Ajout de la case "Catégorie de bien" dans l'onglet Mise en valeur

## Problème

Le bloc "Construction" du formulaire CCC inclut un champ "Catégorie de bien" (property_category) avec les options : Appartement, Villa, Maison, Local commercial, Immeuble/Bâtiment, Entrepôt/Hangar, Terrain nu. Ce champ est absent des deux blocs de l'onglet "Mise en valeur" du formulaire de demande de titre foncier.

## Solution

### 1. État `parcelValorisationData` — Ajouter `propertyCategory`

Étendre le type de `parcelValorisationData` pour inclure `propertyCategory?: string` et le récupérer depuis `contribData?.property_category` lors du fetch parcelle.

### 2. Bloc lecture seule — Ajouter la case "Catégorie de bien"

Ajouter une case en première position de la grille (avant "Type de construction") affichant `parcelValorisationData.propertyCategory`.

### 3. Bloc éditable — Ajouter le Select "Catégorie de bien"

Ajouter un Select en première position (avant "Type de construction") avec les options alignées sur le CCC : Appartement, Villa, Maison, Local commercial, Immeuble/Bâtiment, Entrepôt/Hangar, Terrain nu. Pré-remplir depuis `parcelValorisationData.propertyCategory`.

### 4. État local + soumission

- Ajouter un état `propertyCategory` (string) avec pré-remplissage
- Pas de migration SQL nécessaire : la colonne `property_category` n'est pas strictement requise dans `land_title_requests` puisque cette donnée est liée à la parcelle. Toutefois, si l'utilisateur propose une mise à jour, il faut la persister → je vérifierai si la colonne existe déjà ou si une migration est nécessaire.

4. Assure-toi que la logique de dépendance entre cases dans le bloc "construction" (formulaire ccc) est respecté dans l'onglet mise en valeur (Formulaire de demande de titre foncier).

### Fichier modifié

- `src/components/cadastral/LandTitleRequestDialog.tsx`