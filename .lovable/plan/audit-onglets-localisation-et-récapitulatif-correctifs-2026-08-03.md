# Audit onglets « Localisation » et « Récapitulatif » — correctifs

Revue de l'UI, des dépendances, de la validation et du contenu affiché. Trois écarts bloquants confirmés, plus quatre points de cohérence.

## 1. Groupement et Village annoncés « Optionnel » mais obligatoires (bloquant)

En section rurale, la validation exige `groupement` **et** `village` pour pouvoir soumettre, alors que l'interface affiche ces deux champs sans astérisque et avec la mention « Optionnel ». L'utilisateur ne comprend pas pourquoi la soumission reste bloquée.

En plus, la règle qui déduit automatiquement si une parcelle est urbaine ou rurale (côté serveur comme côté client) se base sur la présence d'un quartier ou d'un village : une fiche rurale sans village serait reclassée urbaine.

Correctif : marquer Groupement et Village comme obligatoires en zone rurale (astérisque + suppression de la mention « Optionnel »), pour aligner l'interface sur la validation réelle.

## 2. Ville / Commune sans issue quand la liste est vide (bloquant)

Le Quartier prévoit une saisie manuelle quand aucune valeur n'est proposée pour la commune choisie. Ville et Commune, elles, restent simplement désactivées avec « Aucune ville » / « Aucune commune » — or les deux sont obligatoires. Une province mal couverte par le référentiel rend le formulaire impossible à terminer.

Correctif : appliquer le même repli de saisie manuelle à Ville et Commune (et, en zone rurale, à Territoire et Collectivité).

## 3. Superficie non calculée pour un appartement (important)

Pour un appartement, le croquis est masqué et la superficie (`areaSqm`) n'est jamais renseignée, alors que longueur et largeur sont saisies et affichées. La fiche est donc enregistrée sans superficie, et le récapitulatif n'affiche aucune surface.

Correctif : renseigner automatiquement la superficie à partir de longueur × largeur en mode appartement.

## 4. Récapitulatif : l'onglet « Valeur marchande » est totalement absent (important)

Le récapitulatif couvre Infos, Localisation, Historique, Obligations et Documents, mais **aucune** donnée de l'onglet Valeur marchande n'y figure : disposition à vendre, prix de revente et devise, expertise récente, annonce de vente (photos, modalités, disponibilité, contact) et mise sur le marché des locaux vacants. L'utilisateur ne peut pas relire ces informations avant de soumettre, et les photos de l'annonce ne sont pas comptées dans « Documents joints ».

Correctif : ajouter un bloc « Valeur marchande » (avec bouton Modifier vers l'onglet) et compter les images d'annonces dans les documents joints.

## 5. Récapitulatif : la configuration locative n'est pas affichée

Quand l'usage est « Location », le récapitulatif n'affiche ni le mode (un seul local / plusieurs locaux), ni le loyer mensuel, ni le détail des locaux (nom, loyer, étage, occupation, capacité), ni les totaux mensuel/annuel — alors que ces champs sont obligatoires et servent au calcul de l'impôt sur les revenus locatifs. Même absence pour les constructions additionnelles.

Correctif : afficher la configuration locative et le détail des locaux, pour la construction principale comme pour les additionnelles.

## 6. Récapitulatif : bouton « Modifier » du bloc Construction pointe vers le mauvais onglet

Le bloc Construction (catégorie, type, nature, matériaux, usage, année, permis, constructions additionnelles) est resté dans la carte « Infos générales », dont le bouton Modifier renvoie à l'onglet Infos. Or ce bloc a été déplacé dans l'onglet Localisation : l'utilisateur atterrit sur un onglet qui ne contient plus ces champs.

Correctif : déplacer la partie Construction/Permis/Constructions additionnelles dans la carte « Localisation » du récapitulatif (ou lui donner son propre bloc avec un Modifier vers Localisation).

## 7. Points mineurs

- Récapitulatif : le numéro de maison est libellé « N° parcelle » — libellé trompeur, à remplacer par « N° de la maison ».
- Récapitulatif : les listes de propriétaires, anciens propriétaires, permis et constructions utilisent l'index comme clé React ; utiliser les identifiants stables déjà disponibles.
- Localisation : la réinitialisation du bloc ne purge pas les mesures d'appartement (longueur, largeur, hauteur, orientation) ni le type de section.
- Localisation : le bloc « Environnement sonore » n'apparaît qu'une fois la section choisie, alors qu'il est obligatoire — il peut être signalé comme manquant sans être visible. À rendre visible dès la province renseignée.

## Points vérifiés et jugés corrects (aucun changement)

- Cascade Province → Ville/Territoire → Commune/Collectivité → Quartier → Avenue, avec purge des niveaux inférieurs.
- Dépendances N° de maison (après avenue), servitude obligatoire si aucun côté ne borde une route, entrée de parcelle obligatoire.
- Contrôle du nombre de tracés de construction attendus dans le croquis et hauteur minimale de 3 m.
- Récapitulatif : impression, valeur CCC, liste des champs manquants avec navigation vers le bon onglet, avis d'expiration de titre.

## Détails techniques

- `src/hooks/ccc/useFormValidation.ts` : règles rurales `groupement`/`village` (l. 218-219) — la validation reste inchangée, c'est l'UI qui s'aligne.
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` : `RuralSection` (astérisques + repli saisie manuelle Territoire/Collectivité), `UrbanSection` (repli Ville/Commune), `ApartmentMeasurements` (calcul `areaSqm`), condition d'affichage du bloc sonore, nettoyage du wrapper `{( … )}` autour de `ConstructionSection`.
- `src/hooks/useCCCFormState.ts` : `resetLocationBlock` (~l.1400) — purger les champs appartement et le type de section.
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx` : nouveau bloc « Valeur marchande », affichage de la configuration locative, déplacement du bloc Construction sous Localisation, libellé du numéro de maison, clés de liste stables, comptage des photos d'annonce dans « Documents joints ». Le fichier approchant 800 lignes, les nouveaux blocs seront extraits en sous-composants dans `ccc-tabs/review/`.

Aucune migration SQL, aucune modification de RLS, d'edge function ou de règle métier : uniquement UI, cohérence des dépendances et restitution des données.
