# Déplacer la question « titre au nom du propriétaire actuel ? » après le téléversement du titre

## Contexte actuel
- Dans l'onglet Infos, la question « Ce titre de type … est-il au nom du propriétaire actuel ? » est rendue à l'intérieur de la carte « Type de titre de propriété » (via la prop `titleOwnershipContent` de `PropertyTitleTypeSelect`).
- Le champ « Images ou pdf du type de titre foncier » se trouve plus bas, dans la carte de référence du titre (n° + date + téléversement). La question apparaît donc avant ce champ.

## Modifications prévues

### Déplacement de la question (frontend uniquement)
- Retirer la prop `titleOwnershipContent` de `PropertyTitleTypeSelect` (interface, déstructuration et rendu) : la question ne fait plus partie de la carte « Type de titre de propriété ».
- Dans `GeneralTab`, extraire la même question dans une variable locale (même contenu : libellé dynamique avec le nom effectif du titre, aide contextuelle, boutons Oui/Non, avertissement du délai légal de mutation de 1 à 20 jours).
- La rendre :
  - pour les titres non « Autre » : à l'intérieur de la carte de référence, juste après la section « Images ou pdf du … » ;
  - pour « Autre » : juste après la carte « Autre » (ce type n'a pas de champ de téléversement).
- Conserver l'affichage conditionnel : la question n'apparaît que lorsqu'un numéro de titre est saisi.

### Aucun changement de données
- Aucune modification de schéma, de validation serveur, ni des champs enregistrés : seul l'ordre d'affichage change.

## Vérification
- Contrôler visuellement l'onglet Infos : la question apparaît après « Images ou pdf du … » pour chaque type de titre, et après la carte « Autre » pour ce type.
- Vérifier que l'aide contextuelle, les choix Oui/Non et l'avertissement du délai de mutation restent fonctionnels.
- Exécuter le typecheck et les tests ciblés du formulaire CCC, puis vérifier la compilation.

## Détails techniques
- Fichiers concernés : `src/components/cadastral/PropertyTitleTypeSelect.tsx` (retrait de la prop) et `src/components/cadastral/ccc-tabs/GeneralTab.tsx` (déplacement du bloc JSX).
- Aucune dépendance serveur : `isTitleInCurrentOwnerName` reste stocké et validé comme aujourd'hui.
