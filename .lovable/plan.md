## Objectif
Ajouter, dans l'onglet **Lot** (StepLotDesigner), un bouton **Réinitialiser** qui efface toutes les modifications (lots dérivés, voiries, espaces communs, servitudes, sélection, historique undo/redo) et restaure la parcelle-mère verrouillée d'origine, afin de pouvoir recommencer le lotissement de zéro.

## Changements

### 1. `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts`
Ajouter et exposer une fonction `resetDesigner()` :
- `setLots([])`, `setRoads([])`, `setCommonSpaces([])`, `setServitudes([])`
- `setSelectedLotId(null)` (et autres sélections / modes d'outils si présents)
- Réinitialiser l'historique : `historyRef.current = []`, `historyIndexRef.current = -1`, `setHistoryVersion(v => v+1)`
- Le `useEffect` existant (lignes 469-475) recrée automatiquement le lot parent verrouillé via `createInitialLot()` puisque `lots.length === 0`.

### 2. Propagation au composant
- Ajouter `onResetDesigner: () => void` à `StepLotDesignerProps` et le câbler depuis le parent qui consomme `useSubdivisionForm` (probablement `SubdivisionRequestDialog` ou équivalent).

### 3. `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx`
Dans la Zone 3 de la toolbar (lignes 943-951, à côté des badges "X lots / Y% couvert"), insérer un bouton :
- Variante `ghost` taille `sm`, icône `RotateCcw` (lucide), texte `Réinitialiser` (caché en mobile : `hidden sm:inline`)
- Désactivé si `lots.length <= 1 && lots[0]?.isParentBoundary && roads.length === 0 && commonSpaces.length === 0 && servitudes.length === 0` (rien à réinitialiser)
- Confirmation via `AlertDialog` (réutiliser le pattern de `BlockResetButton.tsx`) :
  - Titre : « Réinitialiser le lotissement ? »
  - Description : « Tous les lots dérivés, voiries, espaces communs et servitudes seront supprimés. La parcelle-mère sera restaurée à son état initial. Cette action est irréversible. »
  - Action destructive : `bg-destructive`, libellé « Réinitialiser »
- Analytics : `trackAdminAction({ module: 'subdivision', action: 'designer_reset', meta: { lots: lots.length, roads: roads.length } })` (cohérent avec mémoire `admin-analytics-tracking-fr` et le pattern déjà en place dans ce fichier).

## Hors scope
- Aucune modification des types, du backend, des frais (`_shared/subdivisionFees.ts`), de la géométrie de la parcelle-mère, du PDF, du minimap, du `StepPlanView`, ni du flux de soumission.
- Aucune purge du brouillon `localStorage` global du formulaire (le reset ne concerne que l'état du designer ; le brouillon sera ré-écrit par le debounce avec l'état réinitialisé).

## Critères de succès
- Cliquer sur **Réinitialiser** ouvre la confirmation, puis remet le canvas à l'état "parcelle-mère seule verrouillée" (badge `1 lot / 100% couvert`, alert "La parcelle mère est verrouillée…").
- Undo/Redo désactivés après reset (historique vide jusqu'au prochain changement).
- Bouton désactivé tant qu'aucune modification n'a été faite.
- Aucun changement visuel sur les autres onglets ni régression sur les graduations dynamiques précédemment optimisées.
