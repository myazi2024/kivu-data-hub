# Date de mise en location dépendante du mode locatif

## Comportement souhaité

Dans l'onglet Localisation, bloc Construction, quand Usage = « Location » :

- Le champ « En location depuis quand ? » n'apparaît plus avant le choix du mode locatif.
- Il s'affiche **uniquement** si « Comment ce bien est-il mis en location ? » = **Un seul local**, et il est **positionné en dessous** de cette question (sous le loyer mensuel du mode mono-local).
- En mode « Divisé en plusieurs locaux », rien ne change : la date reste saisie par local.
- Tant qu'aucun mode n'est choisi, aucun champ de date n'est affiché.

Même règle appliquée aux constructions supplémentaires (Construction #2, #3, …) pour la cohérence.

## Changements

1. `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`
   - Supprimer le bloc `RentalStartDateField` actuellement placé avant le sélecteur de configuration locative.
   - Le réafficher juste après `RentalConfigurationSelector`, avec la condition `declaredUsage === 'Location' && rentalConfiguration === 'single'` (au lieu de `!== 'multi'`).

2. `src/components/cadastral/AdditionalConstructionBlock.tsx`
   - Même déplacement et même condition `rentalConfiguration === 'single'`.

3. `src/hooks/ccc/useFormValidation.ts`
   - La date globale n'est exigée que si `rentalConfiguration === 'single'` (aujourd'hui elle est exigée dès que le mode n'est pas `multi`, donc aussi quand aucun mode n'est encore choisi — ce qui produit une erreur en double avec « Configuration locative » manquante). Idem pour les constructions supplémentaires.

## Détails techniques

- Aucun changement de base de données ni de schéma : `rental_start_date` reste inchangé.
- Purges existantes conservées : la date est déjà vidée si l'usage n'est plus « Location » et si elle précède l'année de construction. On ajoute la purge de `rentalStartDate` lors du passage single → multi, gérée dans le patch du sélecteur, pour éviter une valeur résiduelle non affichée.
- Aucune modification des affichages (récapitulatif, admin, espace utilisateur, PDF).
