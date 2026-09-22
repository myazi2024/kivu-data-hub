# Déplacer « État de la construction » juste après « Hauteur »

## Objectif

Dans le formulaire CCC, onglet Localisation, bloc Construction, le radio « État de la construction » (Construction achevée / Construction en cours) est aujourd'hui placé après « Année de construction ». Il doit venir **immédiatement après le champ « Hauteur »**, donc avant « Standing » et avant « Année de construction ».

Cela corrige aussi une dépendance logique : le libellé du champ année dépend du statut (« Année de début des travaux » si « Construction en cours »), il est donc cohérent que le statut soit choisi avant l'année.

## État actuel (vérifié)

**`ConstructionSection.tsx`** — ordre actuel du bloc principal :
1. Nombre d'étages + Hauteur (l. 349-410)
2. Standing (l. 412-433)
3. Année de construction (l. 439-471)
4. État de la construction — radio (l. 473-492)
5. Mise en location (l. 494+)

**`AdditionalConstructionBlock.tsx`** — même ordre pour chaque construction additionnelle :
1. Nombre d'étages + Hauteur (l. 464-525)
2. Standing (l. 527-556)
3. Année de construction (l. 562-599)
4. État de la construction — radio (l. 601-620)

## Modifications

### 1. Bloc principal — `ConstructionSection.tsx`

Déplacer le bloc « État d'avancement de la construction » (l. 473-492) pour l'insérer **entre la fin du grid Hauteur (après l. 410, après `</div>` fermant le grid) et le bloc Standing (l. 412)**.

Nouvel ordre :
1. Nombre d'étages + Hauteur
2. **État de la construction** ← déplacé ici
3. Standing
4. Année de construction (le libellé dépend désormais du statut choisi au-dessus)
5. Mise en location

La condition de visibilité du bloc État reste identique : `propertyCategory && propertyCategory !== 'Terrain nu' && constructionType && constructionType !== 'Terrain nu'`.

### 2. Constructions additionnelles — `AdditionalConstructionBlock.tsx`

Même déplacement : le bloc « État de la construction » (l. 601-620) est inséré entre la fin du grid Hauteur (après l. 525) et le bloc Standing (l. 527).

Nouvel ordre :
1. Nombre d'étages + Hauteur
2. **État de la construction** ← déplacé ici
3. Standing
4. Année de construction
5. Mise en location

### 3. Aucun autre changement

- Pas de modification de données, de validation, de base de données, ni des autres onglets/affichages.
- Le libellé dynamique du champ année (« Année de début des travaux » / « Année de construction ») continue de fonctionner, désormais avec le statut choisi juste au-dessus.
- `useFormValidation.ts` : inchangé (la validation du statut existant reste valable).

## Détails techniques

- Aucune migration, aucun changement de payload, aucune dépendance cassée.
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
