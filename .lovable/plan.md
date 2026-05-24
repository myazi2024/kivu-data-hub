## Objectif

Sur desktop, élargir l'onglet **Lot (designer)** du dialogue de lotissement pour qu'il occupe toute la largeur d'écran et offrir plus d'espace au croquis de la parcelle-mère. Les autres étapes conservent leur largeur actuelle (`sm:max-w-3xl`).

## Changement

Fichier : `src/components/cadastral/SubdivisionRequestDialog.tsx` (ligne 180)

Rendre la largeur du `DialogContent` conditionnelle selon `form.currentStep` :

- Étape `designer` (desktop ≥ sm) : pleine largeur — `sm:w-screen sm:max-w-none sm:h-[100dvh] sm:rounded-none`
- Autres étapes : comportement actuel inchangé — `sm:w-auto sm:max-w-3xl sm:max-h-[92vh] sm:rounded-2xl`
- Mobile : inchangé (déjà plein écran)

Implémentation : composer la `className` du `DialogContent` à partir d'un booléen `isDesignerStep = form.currentStep === 'designer'`.

## Hors scope

- Pas de modification de `StepLotDesigner` lui-même (les panneaux internes se réadapteront via leur grille responsive existante).
- Pas de changement sur les autres étapes ni sur le mobile.
- Aucune logique métier touchée.