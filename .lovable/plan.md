# Terrain nu : blocage « Nature » et « Usage » + audit des dépendances du formulaire CCC

## Ce qui se passe réellement

Quand « Catégorie de bien » = **Terrain nu**, la cascade du bloc Construction se contredit :

1. Le type est renseigné automatiquement (`Terrain nu`) et la nature `Non bâti` est auto‑sélectionnée, car c'est la seule valeur possible.
2. Immédiatement après, l'effet « Matériaux → Nature » s'exécute : comme un terrain nu n'a aucun matériau, il **efface la nature** qui vient d'être posée.
3. Nature revenant à vide, l'effet « Type + Nature → Usage » vide la liste des usages et **désactive** le champ Usage (« Type et nature d'abord »).

Résultat : Nature et Usage restent vides et impossibles à remplir, et comme le marquage visuel des champs obligatoires (astérisque rouge, encadré rouge clignotant sur Nature et Usage) ne tient pas compte du cas Terrain nu, ils s'allument à chaque clic sur « Suivant » — l'utilisateur voit une demande de compléter deux champs qu'il ne peut pas remplir.

Note : le blocage réel du bouton « Suivant » vient d'un ou plusieurs autres champs de l'onglet listés dans le message d'alerte (la règle de validation, elle, exempte déjà Nature et Usage pour un terrain nu). Le correctif rend donc les deux champs à la fois remplissables et non signalés.

## Correctifs

### 1. Cascade Terrain nu (cause racine)
- Ne plus effacer la nature depuis l'effet « Matériaux » lorsque la nature courante est `Non bâti` ou que la liste des matériaux disponibles est vide (cas terrain nu / agricole non bâti).
- La nature affiche alors « Construction non bâtie » et la liste d'usages « Terrain vacant / Agriculture / Parking » devient sélectionnable : une donnée utile de plus, au lieu de deux champs morts.
- Même correction dans le bloc des constructions secondaires, qui reproduit la même cascade.

### 2. Marquage des champs obligatoires
- Les astérisques et encadrés rouges de Nature et Usage ne s'affichent plus quand la catégorie ou le type vaut `Terrain nu` (alignement avec la règle de validation déjà en place).
- Usage reste facultatif pour un terrain nu.

### 3. Autres incohérences de dépendance relevées et à corriger
- **Standing / Matériaux** : masqués pour `Non bâti` mais la validation les exige dès qu'une nature est saisie et que le bien n'est pas Terrain nu ; aligner la règle sur la nature normalisée (déjà partiellement fait) et sur les listes réellement disponibles, pour éviter un champ exigé mais invisible pour un terrain agricole non bâti.
- **Mise en location** : un terrain nu (parking, terrain agricole) n'est jamais éligible à la question « Ce bien est‑il en location ? » car l'éligibilité exige une nature bâtie. Ouvrir l'éligibilité aux couples `Terrain nu_Non bâti` et `Agricole_Non bâti` (location de parking / terrain agricole), sans rien exiger de plus.
- **Année de construction** : exigée dès qu'une catégorie est choisie et exemptée uniquement pour Terrain nu ; l'exempter aussi lorsque la nature est `Non bâti` (terrain agricole non bâti), sinon l'utilisateur doit déclarer une année de construction pour un bien sans construction.
- **Croquis** : le contrôle du nombre de tracés de construction est déjà neutralisé pour Terrain nu ; le neutraliser également pour une nature `Non bâti`, pour rester cohérent avec le message affiché sur la carte.

## Détail technique

- `src/hooks/ccc/useConstructionCascade.ts` : garde dans l'effet matériaux (ne pas réinitialiser `constructionNature` si nature = `Non bâti` ou si aucune liste de matériaux n'existe pour le type).
- `src/components/cadastral/AdditionalConstructionBlock.tsx` : même garde dans sa cascade locale.
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` : condition `isTerrainNu` ajoutée aux marqueurs `highlightRequiredFields` de Nature et Usage.
- `src/utils/rentalStatus.ts` : ajout des clés `Terrain nu_Non bâti` et `Agricole_Non bâti` aux couples éligibles à la location.
- `src/hooks/ccc/useFormValidation.ts` : exemption `Non bâti` pour l'année de construction et le contrôle des tracés de construction.

Aucun changement de schéma ni de logique de calcul de valeur CCC.
