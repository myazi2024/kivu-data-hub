

## Suppression des libellés "Définition" et "Interprétation"

### Objectif
Retirer les textes explicites "Définition :" et "Interprétation :" pour ne garder que les icônes (BookOpen et TrendingUp) comme indicateurs visuels des deux sections.

### Modification

**Fichier :** `src/components/visualizations/shared/ChartCard.tsx`

Dans le composant `InsightText` (lignes 78-96), remplacer :

```tsx
<div className="flex items-start gap-1">
  <BookOpen className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5" />
  <p className="text-[9px] text-muted-foreground leading-tight">
    <span className="font-semibold not-italic">Définition :</span>{' '}
    <span className="italic">{text.definition}</span>
  </p>
</div>
<div className="flex items-start gap-1">
  <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" />
  <p className="text-[9px] text-muted-foreground leading-tight">
    <span className="font-semibold not-italic">Interprétation :</span>{' '}
    <span className="italic">{text.interpretation}</span>
  </p>
</div>
```

Par :

```tsx
<div className="flex items-start gap-1">
  <BookOpen className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5" />
  <p className="text-[9px] text-muted-foreground leading-tight italic">
    {text.definition}
  </p>
</div>
<div className="flex items-start gap-1">
  <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" />
  <p className="text-[9px] text-muted-foreground leading-tight italic">
    {text.interpretation}
  </p>
</div>
```

**Résultat :** L'icône bleue BookOpen indique la définition, l'icône verte TrendingUp indique l'interprétation — sans texte de libellé, pour un rendu plus épuré.

