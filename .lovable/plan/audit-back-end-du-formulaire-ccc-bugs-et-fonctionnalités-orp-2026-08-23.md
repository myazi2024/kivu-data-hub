# Audit back-end du formulaire CCC — bugs et fonctionnalités orphelines

Revue onglet par onglet de la chaîne « saisie → `cadastral_contributions` → approbation → `cadastral_parcels` ». Chaque constat ci-dessous a été vérifié (définitions de fonctions et triggers lues en base, colonnes comparées entre les deux tables, payload de soumission relu).

## Constats vérifiés

### 1. Onglet Localisation / Construction — 15 colonnes perdues à l'approbation (bloquant)

Le formulaire envoie bien ces champs dans `cadastral_contributions` (`useCadastralContribution.tsx:355-429`), et les colonnes **existent aussi dans `cadastral_parcels`**, mais aucun des deux triggers d'approbation ne les recopie :

`additional_constructions`, `building_shapes`, `road_sides`, `servitude_data`, `dispute_data`, `has_dispute`, `house_number`, `apartment_number`, `standing`, `property_category`, `construction_materials`, `nearby_noise_sources`, `lease_years`, `is_title_in_current_owner_name`, `title_issue_date`.

Conséquence : constructions secondaires, emprises de bâti, côtés de voirie, servitudes, litiges déclarés, standing et catégorie de bien disparaissent dès qu'une contribution est approuvée. Les blocs locatifs et valeur marchande, eux, sont bien recopiés (correctif précédent en place).

### 2. Deux triggers écrivent la même parcelle à l'approbation

`trigger_create_parcel_on_approval` (BEFORE UPDATE) crée la parcelle **et** renseigne `NEW.original_parcel_id`. Puis `sync_contribution_to_parcel_trigger` (AFTER UPDATE) voit `original_parcel_id` non nul et ré-exécute un UPDATE complet sur cette parcelle tout juste créée. Double écriture systématique pour les contributions « new », avec deux logiques de calcul divergentes (`parcel_type` déduit différemment, `location` différent, valeurs par défaut « Non spécifié » / « Propriétaire non spécifié » présentes seulement dans le second).

### 3. `calculate_ccc_value` ignore toute la saisie récente

La fonction (appelée depuis `generate_cadastral_contributor_code`, donc au cœur de la valeur du code CCC) ne compte que les champs historiques : ni `is_rented`, ni `rental_units`, ni la valeur marchande, ni `sound_environment`, ni `construction_year`, ni `additional_constructions` n'entrent dans le score. Un dossier très complet reçoit la même valeur qu'un dossier minimal.

### 4. `declared_usage` reste la seule source d'usage côté parcelle

Les triggers recopient `declared_usage` tel quel et déduisent `is_rented` par `COALESCE(NEW.is_rented, NEW.declared_usage = 'location')`. Aucune normalisation : les anciennes lignes `declared_usage='location'` arrivent en parcelle avec un usage qui n'existe plus dans le picklist, ce qui fausse les regroupements par usage dans Analytics.

### 5. `source_form_type` est lu mais jamais écrit (fonctionnalité orpheline)

`contributionFormMapping.ts:57-63` privilégie `source_form_type` pour retrouver le formulaire d'origine (ccc / tax / mortgage / permit), mais le payload de soumission ne renseigne jamais cette colonne : la valeur est nulle sur 100 % des lignes en base, le repli heuristique s'applique toujours.

### 6. `check_contribution_abuse` n'est appelée nulle part

La fonction anti-abus (3 contributions/parcelle/24 h, 10 contributions/jour) existe en base mais aucun appel n'existe dans le code front ni dans les edge functions — seule `detect_suspicious_contribution` est utilisée, et elle se contente de scorer sans jamais bloquer. Le garde-fou est donc inactif.

### 7. Multi-propriétaires non propagés

`current_owners_details` (jsonb, saisi dans l'onglet Infos) n'a pas d'équivalent dans `cadastral_parcels` : seul `current_owner_name` survit. Les copropriétaires déclarés ne sont visibles que dans la contribution d'origine.

## Correctifs proposés

### A. Intégrité des données (priorité 1)
- Étendre les deux fonctions d'approbation aux 15 colonnes manquantes du constat 1 (INSERT pour la création, `COALESCE` pour la synchronisation).
- Trancher le doublon de triggers : conserver `sync_approved_contribution_to_parcel` comme unique chemin d'écriture (AFTER UPDATE, création + mise à jour), et réduire `create_parcel_from_approved_contribution` aux seules insertions d'historiques — ou le retirer et déplacer les historiques dans la fonction de synchronisation. Un seul chemin, conditions mutuellement exclusives.
- Normaliser `declared_usage` à la copie : si la valeur vaut `location`, déduire l'usage réel du type de construction et poser `is_rented = true`.

### B. Valeur et validation
- Étendre `calculate_ccc_value` : pondérer bloc locatif (`is_rented`, `rental_configuration`, `rental_units`, occupation/capacité), valeur marchande (revente, expertise), environnement sonore, année de construction et constructions supplémentaires.
- Réactiver le garde-fou anti-abus : appel de `check_contribution_abuse` avant insertion dans `useCadastralContribution.tsx`, avec message clair à l'utilisateur en cas de dépassement.

### C. Traçabilité
- Renseigner `source_form_type` au moment de la soumission selon le formulaire d'origine, et garder le repli heuristique pour les lignes historiques.
- Décision à prendre pour les copropriétaires : soit ajouter `current_owners_details` à `cadastral_parcels` et le recopier, soit alimenter `cadastral_ownership_history` avec chaque copropriétaire actuel à l'approbation.

## Détails techniques

Migrations SQL : `create_parcel_from_approved_contribution`, `sync_approved_contribution_to_parcel` (+ arbitrage des triggers `trigger_create_parcel_on_approval` / `sync_contribution_to_parcel_trigger`), `calculate_ccc_value`, éventuellement `ALTER TABLE cadastral_parcels ADD COLUMN current_owners_details jsonb`.

Fichiers front : `src/hooks/useCadastralContribution.tsx` (appel anti-abus, `source_form_type`), `src/utils/contributionFormMapping.ts`.

Ordre suggéré : A → B → C, chaque bloc livrable indépendamment.
