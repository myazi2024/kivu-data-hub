# Réorganiser les champs du formulaire CCC

## Modifications prévues

### Onglet Infos
- Intégrer la question « Ce titre de type … est-il au nom du propriétaire actuel ? » dans le bloc existant « Type de titre de propriété ».
- Conserver son affichage conditionnel après la saisie du numéro de titre, son aide contextuelle, les choix Oui/Non et l’avertissement lié au délai de mutation.
- Supprimer uniquement la carte séparée actuelle, sans modifier les données enregistrées ni les règles de validation.

### Onglet Localisation
- Afficher « Province » et « Circonscription foncière » côte à côte dans une grille à deux colonnes.
- Conserver la dépendance existante : la circonscription reste désactivée jusqu’au choix de la province et est réinitialisée si la province change.

### Bloc État de la construction
- Présenter « Construction achevée » et « Construction en cours » côte à côte, avec deux zones de sélection de largeur égale.
- Préserver les valeurs et le comportement actuels.

### Bloc Location
- Présenter « Un seul » et « Divisé en plusieurs locaux » côte à côte, y compris sur les petits écrans, avec des libellés qui restent lisibles sans débordement.
- Dans chaque local du mode multiple, placer « Usage réel du local (optionnel) » et « Capacité d’accueil (personnes) » côte à côte lorsqu’ils sont tous deux applicables.
- Garder les champs conditionnels actuels : capacité d’accueil pour un usage résidentiel, capacité d’exploitation pour un usage non résidentiel, et aucun changement des règles de loyer ou d’occupation.

## Vérification
- Contrôler visuellement les deux onglets sur mobile et ordinateur, notamment les libellés longs et l’absence de chevauchement.
- Vérifier les sélections conditionnelles et la conservation des valeurs lors des changements de province, d’état de construction et de mode locatif.
- Exécuter les tests ciblés du formulaire CCC et confirmer que l’application compile sans erreur.

## Détails techniques
- Étendre le bloc partagé du type de titre afin qu’il reçoive et affiche l’état « titre au nom du propriétaire » dans sa propre carte.
- Remplacer les empilements concernés par des grilles stables à deux colonnes dans l’onglet Localisation, la section Construction et les champs locatifs.
- Aucun changement de schéma, de stockage ou de logique serveur n’est nécessaire : cette demande porte sur le regroupement et la disposition de contrôles déjà persistés.
