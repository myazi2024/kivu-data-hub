# Côte à côte : « Année de construction » et « Standing »

## Modifications prévues

### Bloc Construction (onglet Localisation)
- Dans `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`, regrouper le champ « Année de construction » (ou « Année de début des travaux ») et le champ « Standing » dans une même grille à deux colonnes.
- Règle d'affichage : si les deux champs sont visibles, ils sont côte à côte avec deux zones de largeur égale ; si un seul est visible (les conditions d'apparition diffèrent — Année dépend du type de construction, Standing dépend de la nature bâtie et de la liste des standings), il occupe toute la largeur comme aujourd'hui.
- Sur mobile, conserver l'empilement vertical.
- Conserver à l'identique : le libellé dynamique de l'année, l'aide contextuelle « Standing », les valeurs enregistrées, la logique de réinitialisation du loyer antérieur à l'année, et les validations.

### Hors périmètre
- Le bloc « Constructions additionnelles » (composant séparé) n'est pas modifié, la demande porte sur le bloc principal Construction.
- Aucun changement de schéma, de données enregistrées ni de logique serveur.

## Vérification
- Compilation sans erreur et exécution des tests ciblés du formulaire CCC.
- Contrôle du code rendu : grille deux colonnes quand les deux champs sont présents, pleine largeur sinon, libellé dynamique et aide contextuelle intacts.
