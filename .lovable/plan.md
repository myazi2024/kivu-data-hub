

# Ajouter "Capacité d'accueil" aux constructions supplémentaires

## Problème
Le sous-bloc "Capacité d'accueil" n'existe que dans la construction principale (GeneralTab). Le composant `AdditionalConstructionBlock` ne possède ni les champs de données ni l'UI correspondante.

## Plan

### 1. Étendre l'interface `AdditionalConstruction`
**Fichier** : `src/components/cadastral/AdditionalConstructionBlock.tsx`

Ajouter 3 champs optionnels à l'interface :
```ts
isOccupied?: boolean;
occupantCount?: number;
hostingCapacity?: number;
```

### 2. Ajouter le sous-bloc UI dans `AdditionalConstructionBlock`
Après la section "Année de construction" (ligne ~400), insérer le même bloc conditionnel que dans GeneralTab :
- Séparateur + titre "Capacité d'accueil" avec icône `Users`
- Label dynamique : `Votre {data.propertyCategory?.toLowerCase() || 'bien'} est-il habité ?`
- Boutons Oui/Non
- Si Oui : champ "Combien de personnes y vivent ?" + champ "Capacité d'accueil"
- Si Non : uniquement champ "Capacité d'accueil"
- Condition d'affichage : `isNotTerrainNu` (déjà calculé ligne 186)

### 3. Gestion du reset
Quand `isOccupied` passe à `false`, remettre `occupantCount` à `undefined` (même logique que la construction principale).

### 4. Persistance & soumission
Dans `useCCCFormState.ts`, les constructions supplémentaires sont déjà sérialisées en JSON complet (`additionalConstructions.map(c => ({...c}))`). Les 3 nouveaux champs seront automatiquement inclus dans la sauvegarde localStorage et la soumission — aucune modification nécessaire côté state.

### 5. Chargement en mode édition
Dans `useCCCFormState.ts` ligne ~1197, ajouter le mapping des 3 champs lors du chargement des constructions supplémentaires existantes.

## Fichiers impactés
| Fichier | Modification |
|---------|-------------|
| `src/components/cadastral/AdditionalConstructionBlock.tsx` | Interface + UI capacité d'accueil |
| `src/hooks/useCCCFormState.ts` | Mapping édition (3 champs) |

