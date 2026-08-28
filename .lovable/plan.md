# Revue du formulaire CCC — bugs et fonctionnalités orphelines

Revue front-end (onglets, hooks, validation) et back-end (payload, colonnes, trigger d'approbation), chaque constat vérifié par lecture de code ou requête en base.

## Constats vérifiés

### 1. Mesures d'appartement : obligatoires, saisies… puis perdues (bloquant)

`apartmentLength`, `apartmentWidth`, `apartmentHeight`, `apartmentOrientation` sont déclarés (`useCadastralContribution.tsx:89-92`), saisis (`LocationTab.tsx:672-741`), **exigés par la validation** quand la catégorie est « Appartement » (`useFormValidation.ts:315-317`) et affichés au récapitulatif (`ReviewTab.tsx:199-204`), mais ils **ne figurent pas dans le payload** (`buildContributionPayload`, `useCadastralContribution.tsx:351-459`) et **aucune colonne correspondante n'existe** dans `cadastral_contributions` (vérifié en base : seules `apartment_number` et `floor_number` existent). L'utilisateur est bloqué tant qu'il ne remplit pas des champs qui ne sont jamais enregistrés ; seule la superficie dérivée (`areaSqm`) survit.

### 2. Historiques insérés deux fois à l'approbation

Depuis la restauration des historiques dans le trigger `sync_approved_contribution_to_parcel` (propriété, bornage, taxes, hypothèques, autorisations), le front `cccApproval.ts:79-149` insère **les mêmes lignes une seconde fois**, sans garde d'existence. Le trigger a des gardes anti-doublon, pas le front : chaque approbation d'une nouvelle contribution crée donc des doublons dans `cadastral_ownership_history`, `cadastral_boundary_history`, `cadastral_tax_history`, `cadastral_building_permits`, et les hypothèques sont dupliquées y compris pour les contributions « update ». Aucun doublon en base aujourd'hui (aucune contribution approuvée depuis la migration), le problème frappera à la prochaine approbation.

### 3. Statut de paiement des taxes en français côté front

`cccApproval.ts:110` insère `payment_status: 'En attente'` alors que le trigger insère `'pending'` : deux valeurs pour le même état, contraire au standard « statuts en anglais en base ».

### 4. Récupération de la parcelle sans filtre `deleted_at`

`cccApproval.ts:63-67` cherche la parcelle par `parcel_number` sans `is('deleted_at', null)`, alors que le trigger exclut les parcelles supprimées. Sur un numéro réutilisé après suppression logique, `maybeSingle()` peut échouer (plusieurs lignes) ou viser la mauvaise parcelle.

### 5. Dépendances implicites fragiles (non bloquantes aujourd'hui)

- `useFormValidation.ts` exige `rentalConfiguration` (L157-158) sans connaître `isSingleUnitRentalCategory` ; la validation ne passe que grâce à l'auto-remplissage `single` fait dans `ConstructionSection.tsx:98-108`. Si l'effet ne s'exécute pas (démontage/remontage rapide d'onglet), le blocage est sans issue puisque le sélecteur est masqué.
- Deux effets de `ConstructionSection.tsx` écrivent `hostingCapacity`/`occupantCount` (agrégation multi-locaux L128-140, purge non résidentiel/terrain nu L143-161) ; le bon résultat dépend de l'ordre de déclaration des hooks plutôt que d'une garde explicite.
- Les règles de capacité/occupation sont dupliquées entre construction principale (`useFormValidation.ts:148-213`) et constructions supplémentaires (L214-282).

### 6. Points vérifiés sans anomalie

`sale_listing`, `permit_request_data`, `source_form_type`, `current_owners_details` sont bien écrits par le payload et recopiés par le trigger (branches INSERT et UPDATE) ; `check_contribution_abuse` est appelée avant insertion ; `disputeDocuments` est correctement remonté au hook parent ; les prédicats Terrain nu / non résidentiel / mono-local sont partagés entre affichage et validation.

## Correctifs proposés

### A. Priorité 1 — perte de données et doublons
- Mesures d'appartement : trancher entre (a) persister — migration `ALTER TABLE cadastral_contributions ADD COLUMN apartment_length numeric, apartment_width numeric, apartment_height numeric, apartment_orientation text` (+ colonnes miroir sur `cadastral_parcels` et recopie dans les deux branches du trigger) et ajout au payload, ou (b) abandonner — retirer les champs de l'interface, de l'UI, du récapitulatif et de la validation. Recommandation : (a), la donnée est déjà exigée à l'utilisateur et utile en Analytics.
- Supprimer les insertions d'historiques du front (`cccApproval.ts`) et laisser le trigger comme unique chemin d'écriture — y compris pour les hypothèques, qu'il faudra alors couvrir aussi pour les contributions « update ». `approveContributionCore` se limite au changement de statut et au retour des avertissements.
- Aligner le statut de paiement sur `'pending'` si une insertion front subsiste.
- Ajouter `is('deleted_at', null)` à la recherche de parcelle.

### B. Priorité 2 — robustesse des dépendances
- Importer `isSingleUnitRentalCategory` dans `useFormValidation.ts` pour ne plus exiger `rentalConfiguration` quand le sélecteur est masqué.
- Fusionner les deux effets capacité/occupation de `ConstructionSection.tsx` en un seul, avec branches mutuellement exclusives.
- Extraire une fonction de validation partagée capacité/occupation/loyer, utilisée par la construction principale et par les constructions supplémentaires.

## Détails techniques

Migration SQL : colonnes `apartment_*` sur `cadastral_contributions` et `cadastral_parcels`, mise à jour de `sync_approved_contribution_to_parcel` (INSERT + UPDATE, et hypothèques pour les contributions « update »).

Fichiers front : `src/hooks/useCadastralContribution.tsx`, `src/components/admin/ccc/cccApproval.ts`, `src/hooks/ccc/useFormValidation.ts`, `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`.

Ordre suggéré : A puis B, chaque bloc livrable indépendamment.
