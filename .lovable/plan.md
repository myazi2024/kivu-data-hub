

# Fusionner les onglets Analytics "Litiges" et "Levée litige" en un seul

## Probleme

Les analytics presentent actuellement les litiges fonciers en **deux onglets separes** :
- `disputes` (DisputesBlock) — signalements
- `lifting` (DisputeLiftingBlock) — levees

L'utilisateur demande qu'ils soient **un seul service unifie** dans les analytics, car signaler et lever un litige sont deux facettes du meme service "Litige foncier".

## Approche

Fusionner les deux blocs en un seul composant `DisputesBlock` qui affiche les KPIs et graphiques des signalements ET des levees dans un flux continu, avec des sections visuellement separees.

## Modifications

### 1. Fusionner DisputeLiftingBlock dans DisputesBlock

Dans `DisputesBlock.tsx` :
- Importer les calculs de levee (byLiftingStatus, liftingSuccessTrend, etc.) depuis les memes donnees `data.disputes`
- Ajouter une section "Levees" apres les graphiques de signalement existants avec les KPIs levee (approuvees, en attente, rejetees, taux reussite) et les graphiques (statut levee, motif levee, taux reussite %)
- Les KPIs globaux en haut restent unifies (total, en cours, resolus, taux resolution, duree moy.)
- Ajouter des sous-titres visuels ("Signalements" / "Levees") pour structurer

### 2. Supprimer l'onglet "lifting" du registre

Dans `useAnalyticsChartsConfig.ts` :
- Fusionner les items de `lifting` dans la section `disputes` du registre (avec prefixe `lifting-` pour les cles)
- Supprimer l'entree `lifting` du `ANALYTICS_TABS_REGISTRY`

### 3. Supprimer DisputeLiftingBlock et son import

- Supprimer `src/components/visualizations/blocks/DisputeLiftingBlock.tsx`
- Retirer l'import et l'entree `lifting` de `ProvinceDataVisualization.tsx` (ICON_MAP + BLOCK_MAP)

### 4. Mettre a jour AdminDisputeAnalytics

Le composant admin existant montre deja les signalements et levees ensemble — pas de changement necessaire.

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/DisputesBlock.tsx` | Fusionner les graphiques de levee |
| `src/components/visualizations/blocks/DisputeLiftingBlock.tsx` | Supprimer |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Retirer entree `lifting` |
| `src/hooks/useAnalyticsChartsConfig.ts` | Fusionner registre `lifting` dans `disputes` |

4 fichiers modifies, 1 supprime.

