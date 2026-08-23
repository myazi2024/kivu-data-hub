# Revue du formulaire CCC — bugs front-end et back-end

Revue onglet par onglet, plus la chaîne de persistance et le traitement serveur. Les constats ci-dessous ont tous été vérifiés (lecture du code et requêtes sur la base réelle).

## Constats vérifiés

### Bloquant

1. **Le brouillon en cours peut être détruit silencieusement.** Au clic « Modifier » sur une contribution (`UserContributions.tsx:118-121`), l'application écrit dans `localStorage` un objet au format plat produit par `mapContributionToFormDraft`, alors que le formulaire attend l'enveloppe `{schemaVersion, savedAt, data}`. Ce brouillon n'est même jamais lu en mode édition (les données viennent de la base), mais il écrase un éventuel brouillon valide pour la même parcelle, qui est ensuite purgé sans avertissement au prochain chargement (`useFormPersistence.ts:176-192`).

2. **Le trigger d'approbation perd la majorité des données collectées.** `create_parcel_from_approved_contribution` (vérifié en base) n'insère que 31 colonnes anciennes dans `cadastral_parcels`. Or les colonnes `rental_configuration`, `rental_units`, `rental_units_count`, `monthly_rent_usd`, `occupant_count`, `hosting_capacity`, `construction_year`, `sound_environment`, `road_sides`, `building_shapes`, `additional_constructions` **existent bien** dans `cadastral_parcels` (vérifié) et ne sont jamais renseignées. Même omission dans `sync_approved_contribution_to_parcel`. Tout le travail de saisie locative et de qualification du bâti est perdu à l'approbation.

3. **Deux triggers concurrents sur l'approbation.** `trigger_create_parcel_on_approval` est BEFORE UPDATE et `sync_contribution_to_parcel_trigger` est AFTER UPDATE (vérifié via `pg_trigger`), tous deux déclenchés par le passage à `approved`. Leur recouvrement doit être tranché pour éviter écritures doubles ou contradictoires.

### Bugs

4. **La validation serveur locative est morte.** `validate_contribution_completeness` teste encore `declared_usage = 'location'` (ligne 34 du corps de la fonction) alors que la location est désormais portée par le booléen `is_rented`. Aucune contribution ne peut plus déclencher ce contrôle. Même défaut côté admin dans `cccCompleteness.ts:34`, et `is_rented` n'apparaît nulle part dans l'espace admin CCC.

5. **`calculate_ccc_value` ignore les nouveaux champs.** Le score/valeur CCC ne tient compte ni du bloc locatif, ni de la valeur marchande, ni de l'environnement sonore ou de l'année de construction.

6. **Annonces orphelines soumises en base.** `resetConstructionBlock` (`useCCCFormState.ts:1382-1403`) vide les constructions additionnelles sans remapper `taxRecords[].constructionRef` ni `formData.marketListings[].constructionRef`, contrairement à `removeAdditionalConstruction` (lignes 211-250). Résultat : des IRL orphelins bloquent l'envoi (message visible), et des annonces orphelines (photos, loyer, contact) partent en base sans local correspondant, tout en s'affichant dans le récapitulatif.

7. **Libellé de date faux dans le récapitulatif.** `RentalSummary.tsx:55` appelle `rentalDateLabel()` sans passer `isOccupied` : en mode « un seul local », le récapitulatif affiche toujours « En location depuis » même quand le bien est déclaré inoccupé.

8. **Capacité/occupation non validée en mode « un seul local ».** En mode multi, `isOccupied`, `occupantCount` et `hostingCapacity` sont obligatoires par local (`useFormValidation.ts:126-134`, `182-190`) ; en mode single, aucune règle n'existe et le bloc peut rester vide.

9. **Comparaisons de dates fragiles.** `useFormValidation.ts:76-88` compare via `new Date(...)` sans garde sur les chaînes vides ou invalides (`new Date('')` rend toute comparaison fausse) : incohérences titre/propriétaire non détectées.

10. **Purge de la date de location incomplète.** La règle « date ≥ 01/01/année de construction » n'est réappliquée qu'au changement manuel de l'année (`ConstructionSection.tsx:300-317`) ; une restauration de brouillon incohérente n'est signalée qu'au clic « Suivant ».

11. **`permit_request_data` n'est jamais remis à zéro.** Dans `useCadastralContribution.tsx:448-450`, la clé n'est ajoutée au payload que si une demande de permis existe : retirer la demande lors d'une modification laisse l'ancienne valeur en base.

12. **Fichiers Storage orphelins.** `removeUploadedPath` (`useFormPersistence.ts:265-273`) échoue en silence (simple `console.warn`) et retire le chemin du tracker : en cas d'échec RLS/réseau, le fichier reste définitivement dans le bucket.

## Correctifs proposés

### A. Intégrité des données (priorité 1)
- Supprimer l'écriture localStorage de `handleEditContribution` (le mode édition charge déjà depuis la base) et retirer `mapContributionToFormDraft` devenu inutile, ou le reconnecter au bon format `{schemaVersion, data}`.
- Étendre `create_parcel_from_approved_contribution` et `sync_approved_contribution_to_parcel` (migration) pour recopier les colonnes locatives, de construction et d'environnement déjà présentes dans `cadastral_parcels`.
- Trancher le doublon de triggers : garder un seul chemin (création vs synchronisation), avec conditions mutuellement exclusives.

### B. Alignement `is_rented` (priorité 1)
- Mettre à jour `validate_contribution_completeness` pour tester `is_rented` (avec repli sur l'ancien `declared_usage = 'location'` pour les données historiques).
- Même correction dans `cccCompleteness.ts` et affichage de l'indicateur « en location » dans le dialogue admin CCC.
- Étendre `calculate_ccc_value` pour valoriser le bloc locatif et la valeur marchande.

### C. Cohérence du formulaire
- Faire passer `resetConstructionBlock` par la même logique de remappage que `removeAdditionalConstruction`, et purger explicitement `isRented`, `rentalConfiguration`, `rentalUnits`, `marketListings` liés.
- Filtrer les annonces orphelines avant soumission dans `useCadastralContribution.tsx` et les masquer dans `MarketValueSummary`.
- Corriger `RentalSummary.tsx:55` en passant `isOccupied`.
- Rendre `isOccupied`/`occupantCount`/`hostingCapacity` obligatoires aussi en mode « un seul local », en gardant la liberté occupants > capacité (règle analytique déjà actée).
- Robustifier les comparaisons de dates (parsing sûr, ignorer les valeurs vides) et réappliquer la borne date/année à la restauration de brouillon.
- Toujours inclure `permit_request_data` (valeur `null` si aucune demande) dans le payload.
- Remonter à l'utilisateur (toast discret) l'échec de suppression d'un fichier, et conserver le chemin dans le tracker pour un nouvel essai.

## Détails techniques

Fichiers front : `src/components/user/UserContributions.tsx`, `src/utils/contributionFormMapping.ts`, `src/hooks/useCCCFormState.ts`, `src/hooks/ccc/useFormValidation.ts`, `src/hooks/ccc/useFormPersistence.ts`, `src/hooks/useCadastralContribution.tsx`, `src/components/cadastral/ccc-tabs/review/RentalSummary.tsx`, `review/MarketValueSummary.tsx`, `shared/ConstructionSection.tsx`, `AdditionalConstructionBlock.tsx`, `src/components/admin/ccc/cccCompleteness.ts` et le dialogue de détails admin.

Migrations SQL : `validate_contribution_completeness`, `calculate_ccc_value`, `create_parcel_from_approved_contribution`, `sync_approved_contribution_to_parcel` (+ arbitrage des deux triggers).

Ordre suggéré : A → B → C, chaque bloc étant livrable indépendamment.
