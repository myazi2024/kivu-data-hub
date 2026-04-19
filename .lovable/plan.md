

## Mise à jour du popover « Titre au nom du propriétaire actuel »

### Cible
`src/components/cadastral/ccc-tabs/GeneralTab.tsx`, ligne 269.

### Changement
Remplacer le texte actuel du popover par une formulation reformulée (ton pro + rassurant) :

> « Votre réponse nous permet de déterminer si nous pouvons vous recommander un service de mutation foncière, afin de sécuriser davantage le droit foncier qui couvre cette parcelle. »

Reformulation : suppression du « ou pas » familier, ajout de la virgule de clarté, « afin de » au lieu de « pour », « cette parcelle » au lieu de « la couvre » (référent ambigu).

### Hors scope
- Aucune modification de la question elle-même, des boutons Oui/Non, ni de la logique de validation.
- Pas de changement aux autres popovers de l'onglet.

