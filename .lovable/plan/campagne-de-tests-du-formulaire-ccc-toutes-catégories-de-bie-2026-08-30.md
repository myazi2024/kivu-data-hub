# Campagne de tests du formulaire CCC — toutes catégories de bien

Objectif : couvrir automatiquement les 7 catégories de bien et vérifier que chaque champ conditionnel apparaît, disparaît, bloque ou non la validation, et arrive correctement en base.

## Matrice de référence

Les catégories proviennent de `CATEGORY_TO_CONSTRUCTION_TYPES` (`useCCCFormState.ts:173-177`) :

```text
Catégorie            Types autorisés                              Mono-local  Capacité  Terrain nu
Appartement          Résidentielle                                 oui         oui       non
Villa                Résidentielle                                 non         oui       non
Maison               Résidentielle                                 non         oui       non
Local commercial     Commerciale                                   oui         non       non
Immeuble/Bâtiment    Résidentielle/Commerciale/Industrielle        non         oui       non
Entrepôt/Hangar      Industrielle, Agricole                        oui         non       non
Terrain nu           Terrain nu                                    non         non       oui
```

Attendus conditionnels vérifiés pour chaque ligne :
- sélecteur « Comment ce bien est-il mis en location ? » masqué et mode forcé `single` pour les catégories mono-local (`isSingleUnitRentalCategory`) ;
- bloc « Capacité d'accueil » et indicateurs d'occupation masqués et non bloquants pour Local commercial / Entrepôt-Hangar (`isNonResidentialCategory`) ;
- Terrain nu : Nature auto-sélectionnée « Non bâti », Matériaux et Année de construction masqués et purgés, Usage ouvert avec Parking / Espace d'entreposage / Aucun, vocabulaire locatif « terrain », superficie et bornage exigés, autorisation de bâtir non exigée ;
- Appartement : n° d'appartement, étage et mesures d'appartement exigés, superficie dérivée, tracé cartographique non exigé ;
- cascade Type → Nature → Matériaux → Usage / Standing : réinitialisation des valeurs devenues invalides et auto-sélection quand une seule option existe.

## Plan de tests

### 1. Tests unitaires des prédicats (rapides, sans rendu)
Nouveau fichier `src/utils/__tests__/cccPredicates.test.ts` et `src/utils/__tests__/rentalStatus.test.ts` : table pilotée par la matrice ci-dessus pour `isUnbuiltLand`, `isTerrainNuCategory`, `isSingleUnitRentalCategory`, `isNonResidentialCategory`, `isRentalEligible`, `isConstructionRented`.

### 2. Tests de la cascade de construction
`src/hooks/ccc/__tests__/useConstructionCascade.test.ts` — rendu du hook via `renderHook`, picklists simulées, une itération par catégorie : types disponibles, auto-sélection nature/usage, purge des valeurs incompatibles, purge année + matériaux en Terrain nu.

### 3. Tests de validation par catégorie
`src/hooks/ccc/__tests__/useFormValidation.test.ts` — pour chaque catégorie, deux jeux de données : minimal complet (attendu : aucun champ manquant) et minimal amputé (attendu : la liste exacte des champs manquants, avec l'onglet cible). Vérifie explicitement les non-régressions déjà corrigées : capacité/occupants non bloquants en non-résidentiel et Terrain nu, `rentalConfiguration` non exigée en mono-local, IRL facultatif, occupants > capacité autorisé.

### 4. Tests de rendu conditionnel
`src/components/cadastral/ccc-tabs/shared/__tests__/ConstructionSection.test.tsx` — rendu par catégorie et assertions présence/absence sur les libellés : sélecteur de mode locatif, capacité d'accueil, matériaux, année de construction, mesures d'appartement, bloc autorisation de bâtir. Même passage pour `AdditionalConstructionBlock`.

### 5. Parcours navigateur (Playwright, 2 scénarios)
Scripts sous `/tmp/browser/ccc/` uniquement (aucun fichier projet) : un parcours Terrain nu et un parcours Appartement, de l'ouverture du formulaire jusqu'à l'onglet Récapitulatif, avec captures d'écran et relevé des erreurs console. Sert à détecter les blocages de navigation entre onglets que les tests unitaires ne voient pas.

### 6. Vérification back-end
- Comparer champ par champ l'interface `CadastralContributionData` et le payload de `buildContributionPayload` avec les colonnes réelles de `cadastral_contributions` (requête `information_schema.columns`) : rapport des champs saisis mais non persistés.
- Vérifier que `sync_approved_contribution_to_parcel` recopie bien les colonnes conditionnelles par catégorie (mesures d'appartement, `is_rented`, `rental_units`, `sale_listing`, `permit_request_data`).
- Contrôler qu'aucun statut en français ne subsiste dans les insertions d'historiques.

### 7. Livrable
Rapport `docs/reports/TEST_CCC_MATRICE_CATEGORIES.md` : tableau catégorie × champ conditionnel (attendu / observé / verdict), liste des anomalies trouvées classées bloquant / mineur, et commande de relance de la suite.

## Détails techniques

Aucune dépendance à installer : Vitest, Testing Library et jsdom sont déjà configurés (`vitest.config.ts`, `src/test/setup.ts`). Les tests de hooks isolent Supabase par des mocks de `@/integrations/supabase/client` et des picklists injectées, sans appel réseau. Les corrections d'anomalies détectées ne sont pas incluses ici : elles seront listées dans le rapport et traitées dans un second temps, sauf demande contraire.
