

# Attribution explicite des constructions tracées aux constructions déclarées

## Problème

Le `linkedIndex` est assigné automatiquement et séquentiellement (ordre de tracé = ordre de déclaration). L'utilisateur ne peut pas choisir quelle construction déclarée il est en train de tracer, ni réattribuer après coup. Si l'utilisateur trace la "Villa secondaire" avant la "Villa principale", le mapping est faux.

## Solution

### 1. Sélecteur de construction cible AVANT le tracé

Dans `ParcelMapPreview.tsx`, quand l'utilisateur clique sur le bouton Building2 et que `requiredBuildingCount > 1` :
- Afficher un petit menu/dropdown listant les constructions déclarées **non encore tracées** (en utilisant `constructionLabels` filtré par les `linkedIndex` déjà utilisés)
- L'utilisateur choisit laquelle il va tracer (ex: "Villa principale" ou "Garage")
- Stocker le choix dans un état `selectedBuildingTarget: number | null` (l'index choisi)
- Ce `selectedBuildingTarget` est ensuite utilisé comme `linkedIndex` dans `validateBuilding` au lieu de `buildingShapes.length`

Si `requiredBuildingCount === 1`, pas de sélecteur — attribution automatique à l'index 0.

### 2. Réattribution manuelle APRÈS validation

Dans la liste détaillée des constructions tracées (bloc en bas de la carte, lignes 2555-2569) :
- Ajouter un petit `Select` (dropdown) à côté de chaque construction tracée, pré-rempli avec son label actuel
- Les options disponibles = `constructionLabels` (avec indication de celles déjà attribuées à d'autres tracés)
- Quand l'utilisateur change la sélection, mettre à jour le `linkedIndex` du `BuildingShape` concerné et celui de l'ancien occupant si permutation

### 3. Badge visuel pendant le tracé

Pendant le tracé (`isDrawingBuilding`), le badge rouge en haut de la carte affiche déjà `constructionLabels[buildingShapes.length]` — le remplacer par `constructionLabels[selectedBuildingTarget]` pour refléter le choix explicite.

### 4. Indicateur dans le compteur

Dans la liste détaillée, afficher un indicateur visuel (icône lien ou badge coloré) confirmant la liaison : `🔗 Villa principale → Tracé 1 (45.2 m²)`.

## Fichiers modifiés

- **`ParcelMapPreview.tsx`** : état `selectedBuildingTarget`, menu de sélection avant tracé, Select de réattribution dans la liste, badge mis à jour
- **`LocationTab.tsx`** : aucune modification (les `constructionLabels` sont déjà calculés et passés)

## Impact

~80 lignes modifiées/ajoutées dans 1 fichier principal.

