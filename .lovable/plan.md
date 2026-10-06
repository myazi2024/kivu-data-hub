# Location applicable à tous les matériaux (CCC)

## Problème

Dans le bloc Construction (onglet Localisation), la question « Cette maison basse est-elle mise en location ? » (et ses dépendances : loyer, locaux, contrat) disparaît quand « Matériaux » vaut Bois, Tôle, Paille ou Mixte.

Cause confirmée : `isRentalEligible()` dans `src/utils/rentalStatus.ts` teste la combinaison `type de construction + nature`. La nature « Précaire » (déduite de Bois, Tôle, Paille) n'est pas dans la liste `RENTAL_ELIGIBLE_KEYS`, donc la question est masquée et les données locatives déjà saisies sont effacées. Le serveur, lui, ne conditionne pas la location à la nature : front et back sont désaccordés.

## Correction

La logique de location devient identique pour toutes les valeurs du picklist « Matériaux » :

- `src/utils/rentalStatus.ts` : `isRentalEligible()` ne dépend plus que du **type de construction** (Résidentielle, Commerciale, Industrielle — et cas non bâtis existants Terrain nu / Agricole), quelle que soit la nature (Durable, Semi-durable ou Précaire). La nature « Non bâti » reste traitée comme aujourd'hui.
- Les deux composants qui l'utilisent (`ccc-tabs/shared/ConstructionSection.tsx` et `AdditionalConstructionBlock.tsx`) héritent du comportement sans modification : la question location et toutes ses dépendances (configuration mono/multi, loyer, locaux, contrat, date) s'affichent quel que soit le matériau choisi.
- Effet de nettoyage existant conservé : il ne purge les données locatives que si le type de construction devient réellement non louable, plus à cause du matériau.

## Détails techniques

- Remplacer `RENTAL_ELIGIBLE_KEYS` (paires type_nature) par un ensemble de types éligibles ; `isRentalEligible(type, nature)` garde sa signature (nature ignorée sauf pour les cas non bâtis existants) pour ne pas toucher les appelants.
- Aucune migration : `validate_contribution_completeness` ne conditionne pas la location à la nature (vérifié).
- Tests : mettre à jour `src/utils/__tests__/rentalStatus.test.ts` (cas Précaire désormais éligible) et ajouter un cas « Maison basse + Bois/Tôle/Paille/Mixte → question location affichée ».

## Vérification

- Typecheck + suite Vitest complète ; build OK.
- Vérification visuelle non possible (formulaire derrière connexion, backend externe) : à contrôler dans l'aperçu.
