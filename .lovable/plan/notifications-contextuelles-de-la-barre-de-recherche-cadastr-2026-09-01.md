# Notifications contextuelles de la barre de recherche cadastrale

## Constat (vérifié)

- `src/pages/CadastralMap.tsx` (lignes 508-575) : le bouton « Demander un titre foncier » affiche un popover « Le numéro parcellaire (SU/SR) figure sur le titre foncier. Si vous n'avez pas encore de titre foncier, cliquez ici… » — or cette demande est désormais dans le Dropdown actions, la notification est obsolète.
- La logique d'affichage est une petite machine à états réutilisable : `src/hooks/useLandTitleNotificationFlow.tsx` (bouton après 10 s, notification après 20 s, disparition définitive dès la première interaction).

## Correctifs proposés

### 1. Supprimer la notification obsolète
- Retirer les deux `Popover` (mobile + desktop) et leur message autour du bouton « Demander un titre foncier » dans `CadastralMap.tsx`.
- Le bouton reste visible (raccourci conservé), sans pastille jaune ni popover ; le hook `useLandTitleNotificationFlow` cesse de piloter ce bouton.

### 2. Notifications intelligentes par mode de recherche
Généraliser la machine à états en un hook `useSearchHintFlow` (même logique : délai, disparition au premier usage, jamais ré-affiché pendant la session) qui pilote deux notifications distinctes, affichées **à côté du sélecteur de mode** (`CadastralSearchModeToggle`, ligne 389) :

- **Mode « N° parcelle (SU/SR) » actif** : après ~10 s sans saisie, une infobulle douce s'affiche près du segment « Parcelle » : « Le numéro SU/SR figure sur votre titre foncier ou votre fiche parcellaire. » Elle disparaît dès la première frappe ou sélection.
- **Mode « N° titre de propriété » actif** : quand l'utilisateur bascule sur « Titre » (ou après ~10 s dans ce mode sans saisie), une infobulle près du segment « Titre » : « Saisissez le numéro exact du titre de propriété (ex. certificat d'enregistrement). Lettres, chiffres, / et - acceptés. »

Comportement commun (même logique que la notification supprimée) :
- apparition différée et non intrusive (popover ancré au sélecteur, style discret `bg-muted`, pas de rouge d'alerte) ;
- disparition automatique dès la première interaction et jamais ré-affichée ensuite ;
- une seule notification visible à la fois, indexée sur `searchMode` ;
- `prefers-reduced-motion` respecté, `aria-live="polite"` pour l'accessibilité.

## Détails techniques

- `src/hooks/useSearchHintFlow.ts` (nouveau) : généralisation de `useLandTitleNotificationFlow` avec un paramètre `activeKey` (`'parcel' | 'title'`) et un état `dismissed` par mode.
- `src/hooks/useLandTitleNotificationFlow.tsx` : supprimé (remplacé) — vérifier qu'il n'a pas d'autre appelant.
- `src/pages/CadastralMap.tsx` : suppression des Popover du bouton titre foncier ; ajout des deux infobulles ancrées au `CadastralSearchModeToggle`.
- Aucune migration, aucun changement de la recherche, de l'historique ou du Dropdown actions.
