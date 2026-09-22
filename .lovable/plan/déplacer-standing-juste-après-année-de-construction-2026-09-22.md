# Déplacer « Standing » juste après « Année de construction »

## Objectif

Dans le formulaire CCC, onglet Localisation, bloc Construction, le champ « Standing » est aujourd'hui placé avant « Année de construction ». Il doit venir **immédiatement après le champ « Année de construction »**, donc avant « Mise en location ».

Nouvel ordre cible :
1. Nombre d'étages + Hauteur
2. État de la construction
3. Année de construction (le libellé dépend du statut choisi au-dessus)
4. **Standing** ← déplacé ici
5. Mise en location

## État actuel (vérifié)

### `ConstructionSection.tsx`
Le bloc « Standing » (l. 433-454) se trouve **à l'intérieur** de l'IIFE `(() => { const showStandingBlock = ...; return (<> ... </>) })()` (l. 350-457). Le bloc « Année de construction » (l. 460-492) se trouve **à l'extérieur** de cette IIFE, juste après.

`showStandingBlock` est calculé comme : `!!formData.constructionNature && formData.constructionNature !== 'Non bâti' && availableStandings.length > 0`.

### `AdditionalConstructionBlock.tsx`
Même structure : le bloc « Standing » (l. 548-577) est à l'intérieur de l'IIFE (l. 465-580), et le bloc « Année de construction » (l. 583-620) est à l'extérieur, juste après.

`showStandingBlock` est calculé comme : `!!data.constructionNature && data.constructionNature !== 'Non bâti' && availableStandings.length > 0`.

## Modifications

### 1. `ConstructionSection.tsx`

- **Retirer** le bloc Standing (l. 433-454) de l'intérieur de l'IIFE (le fragment `<> ... </>` ne contient plus que le grid Hauteur/Étages et le bloc État).
- **Insérer** le bloc Standing juste après la fin du bloc « Année de construction » (après la l. 492, avant le bloc « Mise en location » l. 494).
- Comme `showStandingBlock` n'est plus accessible hors de l'IIFE, remplacer la condition par une expression équivalente calculée inline : `{!!formData.constructionNature && formData.constructionNature !== 'Non bâti' && availableStandings.length > 0 && ( ... )}`.
- Aucune autre modification : pas de changement de données, de validation, de base de données, ni des autres onglets/affichages.

### 2. `AdditionalConstructionBlock.tsx`

- **Retirer** le bloc Standing (l. 548-577) de l'intérieur de l'IIFE.
- **Insérer** le bloc Standing juste après la fin du bloc « Année de construction » (après la l. 620, avant le bloc « Mise en location » l. 625).
- Remplacer la condition `showStandingBlock` par l'expression inline : `{!!data.constructionNature && data.constructionNature !== 'Non bâti' && availableStandings.length > 0 && ( ... )}`.

### 3. Aucun autre changement

- Pas de migration, pas de changement de payload, aucune dépendance cassée.
- La condition de visibilité de Standing reste identique (présence d'une nature bâtie + standings disponibles).
- Le libellé dynamique de l'année (« Année de début des travaux » si in_progress) reste inchangé et logique (le statut est choisi avant l'année).

## Détails techniques

- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
