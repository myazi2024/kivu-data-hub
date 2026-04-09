

# Effet de zoom au clic sur les visuels Analytics

## Objectif

Quand l'utilisateur clique sur un graphique (ChartCard, StackedBarCard, ColorMappedPieCard), celui-ci s'agrandit visuellement avec un effet de zoom et une ombre renforcée pour indiquer le focus. Un second clic (ou clic ailleurs) retire l'effet.

## Approche

Ajouter un état `focused` (toggle au clic) sur chaque composant carte. Quand `focused = true`, appliquer les classes Tailwind `scale-[1.03] shadow-xl z-10 ring-2 ring-primary/30` avec une transition fluide. Cela évite toute dépendance externe et reste cohérent avec le design existant.

## Modifications

### Fichier : `src/components/visualizations/shared/ChartCard.tsx`

Pour les 3 composants exportés (`ChartCard`, `StackedBarCard`, `ColorMappedPieCard`) :

1. Ajouter `const [focused, setFocused] = useState(false)` dans chaque composant
2. Sur le `<Card>`, ajouter `onClick={() => setFocused(f => !f)}` et `cursor-pointer`
3. Appliquer conditionnellement les classes de zoom :
   - Normal : `transition-all duration-200`
   - Focused : `scale-[1.03] shadow-xl z-10 ring-2 ring-primary/30`

**Impact** : ~15 lignes modifiées dans 1 fichier. Aucune migration.

