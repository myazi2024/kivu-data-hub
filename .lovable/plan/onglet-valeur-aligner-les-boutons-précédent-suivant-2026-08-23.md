# Onglet Valeur : aligner les boutons « Précédent » / « Suivant »

## Constat

Les onglets Infos, Localisation, Historique et Obligations affichent leur navigation dans une barre **collante en bas** (`sticky bottom-0`, fond translucide, bordure supérieure), avec des boutons stylés de façon identique (`gap-2 rounded-xl h-10 text-sm`, ombre sur « Suivant »).

L'onglet Valeur (`MarketValueTab.tsx`, bloc navigation en fin de fichier) utilise à la place une simple ligne non collante (`flex items-center justify-between gap-2 pt-2`) avec des boutons aux classes différentes (`h-10 rounded-xl`, marges d'icônes `mr-1`/`ml-1`, pas d'ombre). Résultat : les boutons défilent avec le contenu et n'ont pas le même rendu que partout ailleurs.

## Correctif

Reprendre exactement le même conteneur et les mêmes styles que les autres onglets :

- Envelopper la navigation dans la barre collante `sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 px-1 -mx-1` + `flex justify-between`.
- « Précédent » : `variant="outline"`, classes `gap-2 rounded-xl h-10 text-sm`, icône `ChevronLeft` sans marge manuelle — comportement inchangé (retour vers Obligations).
- « Suivant » : classes `gap-2 rounded-xl h-10 text-sm shadow-md hover:shadow-lg transition-all`, icône `ChevronRight` sans marge manuelle.
- Conserver telles quelles les vérifications actuelles avant passage à Récapitulatif (image de couverture des locaux, photo et disponibilité pour la vente, longueur de description) puis `handleNextTab('market-value', 'review')`.

## Détail technique

Fichier concerné : `src/components/cadastral/ccc-tabs/MarketValueTab.tsx`, section « NAVIGATION » (~lignes 1014-1059). Aucune logique métier ni validation modifiée, uniquement la structure et les classes du bloc de navigation.
