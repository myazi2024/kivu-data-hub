# Sortir « Location » du picklist Usage et le poser en question Oui/Non

## Comportement souhaité

Onglet Localisation → bloc Construction :

- Le picklist « Usage » ne propose plus « Location ». Il ne contient que des usages réels : Habitation, Usage mixte, Commerce, Bureau, Entrepôt, Industrie, Agriculture, Terrain vacant, Parking.
- Juste après « Année de construction », une nouvelle question apparaît :
  **« Ce/Cette [catégorie de bien] est-il/elle mis(e) en location ? »** avec deux boutons Oui / Non (même style que « est-il habité ? »).
- Si **Oui** : tous les dépendants locatifs actuels s'affichent en dessous, dans l'ordre actuel — mode locatif (un seul local / plusieurs locaux), nombre de locaux et blocs par local, capacité d'accueil, date de mise en location (mode mono), loyer mensuel et totaux.
- Si **Non** (ou pas de réponse) : aucun champ locatif, et les données locatives éventuelles sont purgées.
- L'usage réel reste obligatoire dans tous les cas : un commerce loué reste « Commerce » avec « en location = Oui ».
- Même comportement pour les constructions supplémentaires (#2, #3, …).

La question n'apparaît que pour un bien bâti (pas pour Terrain nu / Non bâti), comme les autres champs de construction.

## Impacts sur les fonctionnalités dépendantes

Tout ce qui teste aujourd'hui « usage = Location » bascule sur le nouvel indicateur :

- Validation du formulaire (mode locatif, loyers, dates requis).
- Onglet Obligations → Impôt sur les revenus locatifs (liste des constructions louées, calcul par local).
- Onglet Valeur marchande → locaux vacants et annonces.
- Récapitulatif, espace admin (fiches CCC, exports CSV, panneaux locatifs), espace utilisateur (locaux, annonces).

## Migration des données existantes

Migration automatique des contributions dont `declared_usage = 'Location'` :
- `is_rented` passe à vrai ;
- `declared_usage` est remplacé par un usage réel déduit du type de construction : Résidentielle → Habitation, Commerciale → Commerce, Industrielle → Industrie, Agricole → Agriculture, sinon Habitation ;
- même traitement pour les constructions supplémentaires stockées en JSON.

## Détails techniques

1. Migration : ajout de la colonne `is_rented boolean not null default false` sur `cadastral_contributions`, puis UPDATE de conversion (usage + `is_rented`) y compris à l'intérieur du JSON `additional_constructions` (clés `declaredUsage` / `isRented`).
2. `src/utils/constructionUsageResolver.ts` : suppression de l'injection de « Location » (et de `LOCATION_ELIGIBLE_KEYS`), remplacée par un helper `isRentalEligible(type, nature)` réutilisé pour n'afficher la question que sur les combinaisons éligibles (Résidentielle / Commerciale / Industrielle, nature Durable ou Semi-durable).
3. `src/hooks/useCadastralContribution.tsx` + `src/utils/contributionFormMapping.ts` : champ `isRented` ↔ `is_rented`, avec lecture de compatibilité (`declared_usage === 'Location'` ⇒ `isRented = true`) pour les brouillons locaux.
4. `ConstructionSection.tsx` et `AdditionalConstructionBlock.tsx` : retrait de la purge liée à `value !== 'Location'` dans le select Usage, insertion du bloc question Oui/Non après « Année de construction », purge complète des champs locatifs (`rentalConfiguration`, `rentalUnitsCount`, `rentalUnits`, `monthlyRentUsd`, `rentalStartDate`) sur « Non », et remplacement de toutes les conditions `declaredUsage === 'Location'` par `isRented === true`.
5. Un helper partagé `isConstructionRented(c)` (couvrant l'ancien `declaredUsage === 'Location'`) est utilisé par : `useFormValidation.ts`, `ObligationsTab.tsx`, `MarketValueTab.tsx` + `marketValueUtils.ts`, `ReviewTab.tsx` / `RentalSummary.tsx`, `userRentalMarket.ts`, les panneaux admin CCC et les panneaux de l'espace utilisateur.
6. `declaredUsageNormalizer.ts` : « Location » conservé comme valeur connue pour l'affichage des enregistrements historiques non migrés.
7. Aucune modification des règles de calcul de l'IRL ni des tarifs : seule la source du booléen change.
