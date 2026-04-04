

# Alignement complet du bloc Mise en valeur avec le bloc Construction du CCC

## Problème

Le bloc "Données de mise en valeur enregistrées" (lecture seule) et le bloc conditionnel "Proposer une mise à jour" dans l'onglet Valorisation du formulaire de titre foncier ne contiennent que 4 champs (type, nature, matériaux, usage), alors que le bloc Construction du CCC en contient 8 (+ catégorie de bien, standing, nombre d'étages, année de construction). De plus, les boutons de choix doivent être des boutons radio au lieu d'un bouton d'action.

## Solution

### 1. Migration SQL — Ajouter 3 colonnes à `land_title_requests`

```sql
ALTER TABLE land_title_requests
  ADD COLUMN IF NOT EXISTS standing text,
  ADD COLUMN IF NOT EXISTS construction_year integer,
  ADD COLUMN IF NOT EXISTS floor_number text;
```

Note : `property_category` n'est pas nécessaire ici car le titre foncier concerne des parcelles, pas des appartements — la catégorie est déduite du type de construction.

### 2. Type `LandTitleRequestData` — `src/hooks/useLandTitleRequest.tsx`

Ajouter les champs `standing`, `constructionYear` (number), `floorNumber` (string) au type et les inclure dans l'insert DB (`createPendingRequest`).

### 3. État `parcelValorisationData` — `LandTitleRequestDialog.tsx`

Étendre le type pour inclure `standing`, `constructionYear`, `floorNumber`. Lors du fetch des données parcelle (ligne ~1198), extraire aussi ces 3 champs depuis `contribData`/`parcelLocData`.

### 4. Boutons radio — Remplacer le bouton "Proposer une mise à jour"

Retirer le bouton actuel dans le premier bloc. Ajouter **en dehors** du premier bloc (entre les deux Cards) un groupe de boutons radio :
- ○ Ces données sont exactes
- ○ Proposer une mise à jour

Le radio "exactes" est sélectionné par défaut. Quand "Proposer une mise à jour" est coché, le second bloc s'affiche. Quand "exactes" est recoché, le second bloc se masque.

### 5. Bloc "Données enregistrées" — Ajouter les cases manquantes

Compléter la grille de lecture seule avec :
- Standing
- Nombre d'étages
- Année de construction

(en plus des 4 existants : type, nature, matériaux, usage)

### 6. Bloc conditionnel "Proposer une mise à jour" — Aligner sur le CCC

Reproduire la structure exacte du bloc Construction du CCC :
1. **Type de construction** + **Matériaux** (grille 2 colonnes)
2. **Nature** (auto-déterminée par matériaux, lecture seule) + **Usage déclaré**
3. **Standing** + **Nombre d'étages** (conditionnel : visible si nature ≠ "Non bâti")
4. **Année de construction** (conditionnel : visible si type ≠ "Terrain nu")

Ajouter les états locaux `standing`, `constructionYear`, `floorNumber` avec pré-remplissage depuis `parcelValorisationData`.

### 7. Retirer le bouton "Annuler" du header du second bloc

Puisque le contrôle se fait par les radios, le bouton Annuler dans le header du Card est redondant — le supprimer.

### Fichiers modifiés
- **Migration SQL** : nouvelle migration pour les 3 colonnes
- **`src/hooks/useLandTitleRequest.tsx`** : types + insert
- **`src/components/cadastral/LandTitleRequestDialog.tsx`** : refonte de l'onglet Valorisation

