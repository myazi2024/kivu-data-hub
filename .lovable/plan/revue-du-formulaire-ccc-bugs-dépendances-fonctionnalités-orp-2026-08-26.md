# Revue du formulaire CCC — bugs, dépendances, fonctionnalités orphelines

Revue front-end (onglets, hooks, validation) et back-end (payload, colonnes, triggers d'approbation), avec vérification directe en base.

## Constats vérifiés

### Bloquant

1. **Toute soumission CCC échoue : la colonne `sale_listing` n'existe pas.** Le payload envoie `sale_listing` à chaque insert/update (`useCadastralContribution.tsx:457`), mais la table `cadastral_contributions` n'a aucune colonne `sale_listing` (vérifié en base : seules `market_listings`, `resale_price_*` existent). PostgREST rejette l'écriture (`PGRST204`). Cohérent avec la base : seulement 2 contributions, la dernière datant du 25/05/2026, alors que l'annonce de vente a été ajoutée depuis.

2. **Les historiques ne sont plus recopiés à l'approbation.** L'ancien trigger `trigger_create_parcel_on_approval` et sa fonction `create_parcel_from_approved_contribution` ont été supprimés ; il ne reste que `sync_contribution_to_parcel_trigger` → `sync_approved_contribution_to_parcel`, dont le corps ne référence **aucune** des tables `cadastral_ownership_history`, `cadastral_boundary_history`, `cadastral_tax_history`, `cadastral_mortgages`, `cadastral_building_permits` (vérifié via `pg_get_functiondef`). Toute la saisie des onglets Historique et Obligations reste enfermée dans le JSONB de la contribution et n'alimente plus les tables normalisées (donc ni la fiche parcellaire, ni Analytics, ni les rapports).

3. **`permit_request_data` meurt à l'approbation.** La colonne existe côté contribution mais pas côté `cadastral_parcels`, et la fonction de synchronisation ne la traite pas : une demande d'autorisation de bâtir saisie dans le CCC n'est jamais matérialisée.

### Bugs et incohérences

4. **Photos d'annonce de vente rendues obligatoires.** `useFormValidation.ts:493-503` exige au moins une photo et une disponibilité dès que « Accepteriez-vous de vendre ? » vaut Oui, alors que l'onglet Valeur a été reformulé en simple recueil d'avis. Le formulaire bloque sur un bloc devenu facultatif.

5. **`constructionYear` jamais purgé pour un Terrain nu.** Ni `useConstructionCascade.ts` ni `ConstructionSection.tsx:124-131` ne le remettent à vide ; le champ est seulement masqué (`ConstructionSection.tsx:316`) et la valeur héritée d'un choix précédent (ex. Villa 2010) reste affichée dans le récapitulatif (`ReviewTab.tsx:323`) et partie en base pour un terrain nu.

6. **Prédicat « Terrain nu » dupliqué en 3 définitions divergentes.** `ConstructionSection.tsx:67-68` (catégorie ou type), `LocationTab.tsx:111-112` (+ nature « Non bâti »), `useFormValidation.ts:83-85` / `:274` (deux variantes), `ReviewTab.tsx:344` (type seulement). Conséquence concrète : pour « Agricole + Non bâti », Localisation considère la parcelle non bâtie (0 bâtiment requis sur la carte) pendant que le bloc Construction du même onglet continue de réclamer matériaux/standing/année.

7. **Logique « n° SU/SR requis » dupliquée.** `useCCCFormState.ts:1549-1558` (avec `hasSuSrParcelNumber` et l'origine de recherche) pilote l'affichage du champ, tandis que `useFormValidation.ts:122-131` recalcule la même règle sans tenir compte de l'origine de recherche. En mode édition, l'effet de purge est désactivé (`useCCCFormState.ts:1573-1579`) : les deux calculs peuvent diverger sur d'anciennes contributions.

8. **`resetLocationBlock` ne réinitialise pas `parcelNumber`** (`useCCCFormState.ts:1479-1510`) : un numéro préfixé SU/SR survit à la réinitialisation du bloc et force à nouveau l'exigence du numéro, écrasant un choix « Fiche parcellaire » ultérieur.

### Fonctionnalités orphelines

9. **Champs `apartmentLength / apartmentWidth / apartmentHeight / apartmentOrientation`** déclarés dans l'interface (`useCadastralContribution.tsx:88-91`) mais jamais mis dans le payload ni présents en base.

10. **`current_owners_details` non propagé** : pas d'équivalent dans `cadastral_parcels`, seuls les copropriétaires de la contribution subsistent.

11. **`source_form_type`** est bien écrit depuis peu (`useCadastralContribution.tsx:352`) mais vaut `NULL` sur 100 % des lignes existantes : le repli heuristique de `contributionFormMapping.ts` reste nécessaire.

## Correctifs proposés

### A. Débloquer la soumission (priorité 1)
- Migration : ajouter `sale_listing jsonb` à `cadastral_contributions` (et la colonne miroir sur `cadastral_parcels` si l'annonce doit survivre à l'approbation), sinon retirer le champ du payload. Recommandé : ajouter la colonne, l'annonce est utilisée en admin et en récapitulatif.
- Rendre le bloc annonce de vente non bloquant : photos et disponibilité facultatives, on ne garde que le contrôle de format du contact et la limite de 500 caractères.

### B. Rétablir la chaîne d'approbation
- Migration sur `sync_approved_contribution_to_parcel` : réintégrer l'alimentation des tables normalisées (ownership, boundary, tax, mortgages, building permits) avec garde anti-doublon (ne rien réinsérer si la parcelle a déjà des lignes issues de cette contribution).
- Décider du sort de `permit_request_data` : soit colonne miroir sur `cadastral_parcels`, soit création d'une ligne dans le flux « demande d'autorisation ». Proposition : colonne miroir, plus simple et sans effet de bord.
- Ajouter `current_owners_details` à `cadastral_parcels` et le recopier.

### C. Cohérence des dépendances front-end
- Extraire un helper unique `isUnbuiltLand(formData)` (catégorie, type, nature) et l'utiliser dans `ConstructionSection`, `LocationTab`, `ReviewTab` et `useFormValidation`.
- Purger `constructionYear` (et les résidus liés) au passage en Terrain nu, dans la cascade de construction.
- Extraire un helper unique pour « numéro de parcelle requis » consommé à la fois par l'affichage et par la validation.
- Réinitialiser `parcelNumber` dans `resetLocationBlock` sauf quand il provient d'une recherche cadastrale verrouillée.

### D. Nettoyage
- Supprimer les champs `apartment*` inutilisés de l'interface, ou les persister si la donnée est voulue (à trancher).

## Détails techniques

Migrations SQL : `ALTER TABLE cadastral_contributions ADD COLUMN sale_listing jsonb`, `ALTER TABLE cadastral_parcels ADD COLUMN sale_listing jsonb, permit_request_data jsonb, current_owners_details jsonb`, `CREATE OR REPLACE FUNCTION sync_approved_contribution_to_parcel`.

Fichiers front : `src/hooks/useCadastralContribution.tsx`, `src/hooks/useCCCFormState.ts`, `src/hooks/ccc/useFormValidation.ts`, `src/hooks/ccc/useConstructionCascade.ts`, `src/components/cadastral/ccc-tabs/{LocationTab,ReviewTab}.tsx`, `ccc-tabs/shared/ConstructionSection.tsx`, plus un nouvel utilitaire partagé pour les prédicats.

Ordre suggéré : A → B → C → D, chaque bloc livrable indépendamment.
