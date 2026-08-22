# Ordre des noms de côtés dans « Limites et Entrées »

## Problème observé

Dans l'onglet Localisation, après avoir tracé une construction dans le croquis de la parcelle, la liste « Limites et Entrées » affiche des noms de côtés désordonnés (ex. « Côté 3 », « Côté 1 », « Côté 2 ») alors que la numérotation visuelle (pastille 1, 2, 3…) reste, elle, séquentielle.

## Diagnostic (à confirmer en première étape)

Le nom d'un côté n'est pas dérivé de sa position dans le polygone mais du numéro de borne de départ, avec une réassociation par correspondance de nom :

- `ParcelMapPreview.tsx` (`updateParcelSidesFromCoordinates`) nomme chaque côté `Côté <numéro de borne>` et tente de retrouver le nom existant en cherchant dans `parcelSides` un nom dont le chiffre correspond à la borne courante.
- `ParcelSidesDimensionsPanel.tsx` affiche `side.name` tel quel, à côté d'une pastille qui, elle, utilise l'index de position.

Dès qu'une numérotation de bornes n'est plus strictement 1..n dans l'ordre du tracé (borne supprimée, tracé repris, recalcul déclenché après une action sur la carte), les noms restants ne suivent plus l'ordre d'affichage. Le lien exact avec l'ajout d'une construction n'est pas encore prouvé par la lecture du code : la première étape consiste donc à reproduire le scénario et à observer les valeurs de `parcelSides` avant/après validation d'une construction, afin de confirmer quel recalcul est déclenché.

## Correctifs prévus

1. **Reproduction et confirmation** : tracer une parcelle, puis une construction, et comparer le tableau `parcelSides` avant/après pour identifier le recalcul fautif.
2. **Nommage positionnel canonique** : les côtés sont nommés d'après leur position dans le polygone (côté i = borne i → borne i+1), pas d'après le numéro de borne. Le nom devient toujours cohérent avec la pastille d'ordre.
3. **Préservation des personnalisations** : si l'utilisateur a renommé un côté, le nom personnalisé est conservé et rattaché à la position, pas au numéro de borne.
4. **Normalisation défensive** : au rendu du panneau, tout nom générique « Côté N » incohérent avec la position est réaligné, ce qui corrige aussi les brouillons et contributions déjà enregistrés.
5. **Alignement des dépendances** : vérifier que `roadSides` (indexé par `sideIndex`), les cotes du croquis SVG et le récapitulatif restent bien synchronisés sur le même index de position.

## Détails techniques

- `src/components/cadastral/ParcelMapPreview.tsx` : réécriture de `updateParcelSidesFromCoordinates` pour indexer par position (`parcelSides[i]`) et générer `Côté ${i + 1}` ; suppression de la correspondance par `parseInt(borne)` qui casse l'ordre.
- `src/components/cadastral/ParcelSidesDimensionsPanel.tsx` : affichage du libellé normalisé (nom personnalisé sinon `Côté ${index + 1}`).
- Contrôle de non-régression : `src/components/cadastral/ParcelSketchSVG.tsx` et `src/components/cadastral/ccc-tabs/review/*` consomment `parcelSides` par index — aucun changement de contrat, seul le champ `name` devient fiable.
- Aucune modification de base de données : `parcel_sides` conserve la même structure `{ name, length }`.
