

# Enrichir les notes explicatives et ajouter le watermark BIC

## Constat

Chaque visuel affiche une note générée automatiquement par `generateInsight()` qui se limite à identifier la valeur dominante (ex: "« Kinshasa » arrive en tête avec 45 (62% du total)"). Cette note ne décrit pas **ce que le graphique montre** ni le **contexte métier**, ce qui rend le visuel incompréhensible hors de l'application. De plus, aucune mention de date ni de copyright n'apparaît.

## Plan de correction

### 1. Enrichir `generateInsight()` avec un préfixe descriptif

Modifier `src/utils/chartInsights.ts` pour que chaque insight commence par une phrase décrivant le type de données, en utilisant le paramètre `context` déjà passé par tous les blocs.

Exemple actuel :
> « Kinshasa » arrive en tête avec 45 (62% du total).

Exemple enrichi :
> Répartition des demandes de titre par provinces. « Kinshasa » arrive en tête avec 45 (62% du total). Total : 72 enregistrements.

Concrètement :
- Ajouter un préfixe `"Répartition/Évolution de [context]."` selon le type de chart
- Ajouter le total des enregistrements à la fin
- Pour les `area` charts, préciser "Évolution temporelle de [context]"

### 2. Ajouter un pied de page "date + copyright" sur chaque ChartCard

Modifier `src/components/visualizations/shared/ChartCard.tsx` :
- Ajouter un composant `ChartFooter` affiché en bas de chaque carte, après l'insight
- Contenu : date du jour (format `JJ/MM/AAAA`) + `"BIC - Tous droits réservés"`
- Style : `text-[7px] text-muted-foreground text-right mt-1`
- Appliqué aux 3 composants : `ChartCard`, `StackedBarCard`, `ColorMappedPieCard`

Ce footer sera inclus dans l'export PNG (car il est dans le `ref` capturé par `toPng`).

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/utils/chartInsights.ts` | Enrichir les textes avec préfixe descriptif + total |
| `src/components/visualizations/shared/ChartCard.tsx` | Ajouter `ChartFooter` avec date + copyright |

2 fichiers, modifications ciblées.

