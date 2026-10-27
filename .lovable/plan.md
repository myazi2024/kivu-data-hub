# Question de mise en location : nouvelle formulation accordée à la catégorie de bien

## Ce qui change pour l'utilisateur
Onglet Localisation, bloc Construction (construction principale et constructions supplémentaires).

Avant : « Cette maison est-il mis en location ? » (faute d'accord)

Après, la phrase s'accorde avec la catégorie choisie :

| Catégorie | Question affichée |
|---|---|
| Maison | Cette maison, dans son intégralité ou en partie, est-elle proposée à la location ? |
| Maison basse | Cette maison basse, dans son intégralité ou en partie, est-elle proposée à la location ? |
| Villa | Cette villa, dans son intégralité ou en partie, est-elle proposée à la location ? |
| Immeuble/Bâtiment | Cet immeuble, dans son intégralité ou en partie, est-il proposé à la location ? |
| Local commercial | Ce local commercial, dans son intégralité ou en partie, est-il proposé à la location ? |
| Entrepôt/Hangar | Cet entrepôt, dans son intégralité ou en partie, est-il proposé à la location ? |
| Appartement | Cet appartement est-il proposé à la location ? (pas de « en partie » : location unique) |
| Aucune catégorie | Ce bien, dans son intégralité ou en partie, est-il proposé à la location ? |

Mêmes corrections d'accord sur les phrases voisines qui utilisent la catégorie :
- « Votre maison est-il habité ? » devient « Votre maison est-elle habitée ? » (et « Votre immeuble est-il habité ? », etc.).
- Sous la question « Comment ce bien est-il mis en location ? » : devient « Comment cette maison est-elle proposée à la location ? » (ou équivalent accordé), ainsi que la note explicative en dessous qui reprend le sujet.
- Une courte note sous la question principale : « Répondez Oui si au moins une partie (chambre, étage, local…) est louée ou proposée à la location. » (« Répondez Oui si le bien est loué ou proposé à la location. » pour Appartement).

## Détails techniques
- Nouveau helper pur `src/lib/ccc/propertyCategoryGrammar.ts` : pour chaque catégorie, nom affiché (« immeuble » pour Immeuble/Bâtiment, « entrepôt » pour Entrepôt/Hangar), genre, élision (ce/cet/cette), et fonctions `rentalQuestion(category)`, `occupiedQuestion(category)`, `rentalModeQuestion(category)`, `rentalNote(category)`.
- Utilisé dans `ConstructionSection.tsx` (construction principale), `AdditionalConstructionBlock.tsx` (constructions supplémentaires) et `RentalConfigurationFields.tsx` (titre + sujet de la note).
- Seul le texte change : aucune donnée, règle de validation ni comportement modifié.
- Tests unitaires du helper : une phrase par catégorie (féminin, masculin avec « cet », Appartement, catégorie vide).
