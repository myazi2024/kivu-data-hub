

# Restructuration des insights analytics — Définition + Interprétation

## Problème actuel

Les insights sous chaque graphique sont un bloc de texte unique, mêlant description et interprétation sans structure claire. L'utilisateur demande deux parties distinctes avec un ton pédagogique :

1. **Définition** — Qu'est-ce que ce graphique montre ? Quels indicateurs sont utilisés ?
2. **Interprétation** — Que disent les données affichées ?

## Modifications

### 1. `src/utils/chartInsights.ts` — Retourner un objet structuré

Changer la signature pour retourner `{ definition: string; interpretation: string }` au lieu d'un `string`. 

**Définitions pédagogiques par type de graphique :**
- `pie`/`donut` : "Ce diagramme circulaire illustre la répartition proportionnelle de {context}. Chaque segment représente la part relative d'une catégorie dans l'ensemble."
- `bar-h`/`bar-v` : "Ce diagramme en barres compare {context} par catégorie. La longueur de chaque barre indique le nombre d'occurrences."
- `area` : "Ce graphique d'évolution retrace {context} dans le temps. L'aire colorée permet de visualiser la tendance générale."

**Interprétations dynamiques (existantes, réécrites en style pédagogique) :**
- Pie/donut : "On observe que « {top} » occupe la place dominante avec {pct}% des {total} enregistrements ({value}). Cela signifie que..."
- Bar : "La catégorie « {top} » se distingue nettement avec {value} occurrences ({pct}%), sur un total de {total}."
- Area up : "La courbe révèle une progression sur la période analysée, ce qui indique une augmentation de l'activité."
- Area down/stable : similaire, adapté.

Aussi mettre à jour `generateStackedInsight` avec la même structure.

### 2. `src/components/visualizations/shared/ChartCard.tsx` — Affichage en deux parties

Modifier `InsightText` pour accepter `{ definition: string; interpretation: string }` ou un `string` (rétrocompatibilité) :

```tsx
const InsightText: React.FC<{ text?: string | { definition: string; interpretation: string } }> = ({ text }) => {
  if (!text) return null;
  if (typeof text === 'string') return /* ancien rendu */;
  return (
    <div className="mt-1 px-0.5 space-y-0.5">
      <div className="flex items-start gap-1">
        <BookOpen className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-tight">
          <span className="font-medium not-italic">Définition :</span>{' '}
          <span className="italic">{text.definition}</span>
        </p>
      </div>
      <div className="flex items-start gap-1">
        <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-tight">
          <span className="font-medium not-italic">Interprétation :</span>{' '}
          <span className="italic">{text.interpretation}</span>
        </p>
      </div>
    </div>
  );
};
```

### 3. Mise à jour des props `insight` dans tous les blocs

Mettre à jour le type de la prop `insight` dans `ChartCardProps`, `StackedBarCardProps`, `MultiAreaChartCardProps`, `MultiDataPieProps` pour accepter `string | { definition: string; interpretation: string }`.

### Fichiers modifiés (2)

| Fichier | Changement |
|---------|------------|
| `src/utils/chartInsights.ts` | Retourner `{ definition, interpretation }` depuis `generateInsight` et `generateStackedInsight` |
| `src/components/visualizations/shared/ChartCard.tsx` | Adapter `InsightText` et les types de props pour le format structuré |

Aucun changement dans les blocs de visualisation — ils appellent déjà `generateInsight(...)` et passent le résultat en prop `insight`. Le changement de type de retour se propage automatiquement.

