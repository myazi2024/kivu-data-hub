# Onglet Valeur : barre de navigation collante + faux blocage « devise et montant »

## Problème 1 — les boutons défilent avec le contenu

L'onglet Valeur utilise pourtant déjà le même conteneur collant que les autres onglets (`sticky bottom-0 …`). Ce qui neutralise l'effet : le conteneur racine de l'onglet porte `overflow-x-hidden` (ajouté lors du correctif de débordement horizontal). Un ancêtre en `overflow` autre que `visible` devient le conteneur de défilement de référence : l'élément « colle » alors au bas de ce bloc, donc il suit le contenu.

Correctif : retirer `overflow-x-hidden` du conteneur racine de l'onglet et confiner la protection anti-débordement aux blocs qui en ont besoin (cartes / grilles d'images, déjà en `overflow-hidden` + `min-w-0`). La barre redevient alors collante comme dans Infos, Localisation, Historique et Obligations.

## Problème 2 — « Loyer du local "Appart 2" : indiquez à la fois la devise et le montant »

Dans le bloc « Loyer & caution », le sélecteur de devise affiche « USD » par défaut, mais cette valeur n'est qu'un repli d'affichage : tant que l'utilisateur ne change pas explicitement la devise, `rentCurrency` reste vide en base de formulaire. La validation exige que montant et devise soient tous deux présents ou tous deux absents → message d'erreur alors que l'écran affiche bien une devise et un montant.

Correctif :
- À la saisie du montant, enregistrer aussi la devise affichée (USD par défaut), pour que l'état corresponde à ce que voit l'utilisateur.
- Côté validation, considérer la devise comme USD par défaut lorsqu'un montant est saisi ; ne signaler l'erreur que dans le cas inverse (devise choisie sans montant).

Même traitement appliqué au champ symétrique du prix de revente (`resalePricePair`), qui présente exactement le même repli d'affichage.

## Détail technique

- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` : classe racine (l. 266) sans `overflow-x-hidden` ; `updateListing` du montant de loyer inclut `rentCurrency: rentCur` ; idem pour le prix de revente.
- `src/hooks/ccc/useFormValidation.ts` (l. ~428 et ~497-500) : la paire montant/devise n'est signalée que si une devise est choisie sans montant ; un montant sans devise explicite est traité comme USD.

Aucune autre logique métier, aucun changement de schéma.
