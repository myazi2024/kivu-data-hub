## Audit — Service "Taxes foncières" vs formulaire CCC

### 1. Contexte

Deux entrées créent des `cadastral_contributions` avec `tax_history` :
- **Formulaire CCC** (`useCCCFormState` / `useCadastralContribution`) — saisie globale d'une parcelle, inclut un tableau `taxDeclarations[]` riche (avec `constructionRef`, `remainingAmount`, gestion multi-bâtiments via `additionalConstructions`).
- **Dropdown Actions → "Taxes foncières"** (`TaxManagementDialog`) — 4 sous-flux (Foncier / Bâtisse / Locatif / Ajouter paiement) qui insèrent des `tax_history` à raison d'un objet par soumission.

L'objectif de l'audit : vérifier la cohérence des données collectées et la logique d'usage par rapport à la source de vérité (CCC).

---

### 2. Constats — points d'incohérence

**A. Multi-construction non gérée par le service Taxes**
- CCC : `additionalConstructions[]` + `constructionRef` permet de déclarer un loyer/taxe par bâtiment (ex. IRL par locataire/par construction).
- Service Taxes : `BuildingTaxCalculator`, `IRLCalculator`, `PropertyTaxCalculator` ne lisent que les champs racine `parcelData.construction_*`. Aucune sélection de bâtiment cible. Sur une parcelle à plusieurs constructions, l'utilisateur déclare implicitement pour la "construction principale" → données fausses pour les autres bâtiments.

**B. `constructionRef` jamais écrit par le service Taxes**
- CCC écrit `tax.constructionRef` dans `tax_history` (ligne 794 de `useCCCFormState`).
- `PropertyTaxCalculator`, `BuildingTaxCalculator`, `IRLCalculator`, `TaxFormDialog` n'écrivent jamais `constructionRef`. Conséquence : les déclarations faites depuis la carte ne peuvent pas être rattachées à un bâtiment précis quand la parcelle en a plusieurs, ce qui casse l'affichage côté CCC (qui assume `'main'` par défaut pour IRL — ligne 1052).

**C. Champs surchargés / inventés vs CCC**
- `BuildingTaxCalculator` introduit `buildingCondition` (`bon`/`moyen`/`mauvais`) et `numberOfFloors` qui n'existent pas dans le schéma CCC (`construction_nature`, `construction_materials`, `construction_year`). Stockés dans `tax_history.building_condition` / `floors` → données orphelines, jamais relues, jamais affichées côté admin CCC.
- `PropertyTaxCalculator` introduit `roofingType` (idem, jamais consommé ailleurs).

**D. Mapping `usage_type` divergent**
- CCC picklist : `Habitation, Location, Commerce, Bureau, Entrepôt, Industrie, Agriculture, Terrain vacant, Parking, Usage mixte`.
- `taxSharedUtils.detectUsageType` mappe correctement, mais à la soumission `PropertyTaxCalculator` réécrit `declared_usage` en valeurs legacy : `Résidentiel / Commercial / Industriel / Agricole`. Cela écrase potentiellement la valeur CCC d'origine si la contribution est ensuite fusionnée. **Risque d'écrasement de donnée propre.**

**E. Mapping `construction_type` perdant**
- CCC stocke `construction_nature` (`Durable / Semi-durable / Précaire / Non bâti`) — terminologie technique.
- `PropertyTaxCalculator` et `BuildingTaxCalculator` écrivent `construction_type` en `En dur / Semi-dur / En paille` (legacy), pas `construction_nature`. Deux champs en concurrence dans la même table → ambiguïté.

**F. Doublon "Ajouter un paiement" vs CCC**
- L'onglet "Ajouter un paiement" (`TaxFormDialog` embedded) propose les mêmes 7 types de taxes que CCC, mais sans `constructionRef`, sans `remainingAmount` (alors que CCC distingue paiement partiel + reste dû), sans intégration aux locataires IRL.
- CCC permet `Payé partiellement` + `remainingAmount`, le service "Ajouter" propose le statut mais pas le champ → perte d'information.

**G. NIF + identité contribuable dupliqués à chaque sous-flux**
- Chaque calculateur redemande NIF + nom + pièce d'identité. CCC les a déjà saisis dans `taxpayer_identity` (et la parcelle a `current_owner_name`). Aucun pré-remplissage cross-flux : si l'utilisateur soumet Foncier puis Bâtisse, il ressaisit tout.

**H. Détection duplicate incomplète**
- `checkDuplicateTaxSubmission` filtre par `parcel_number + user_id + tax_type + tax_year` mais **ignore `constructionRef`**. Sur parcelle multi-bâtiments, impossible de déclarer Bâtisse pour 2 constructions de la même année.

**I. Onglets "Déclarer" séparés mais champs partagés**
- Les 3 calculateurs ont chacun leur propre `useState` pour `nif`, `ownerName`, `idDocumentFile`, `fiscalYear`. Aucune synchronisation. Sortir d'un onglet réinitialise tout (clé `key="foncier"` etc.).

---

### 3. Plan d'alignement proposé

#### Étape 1 — Sélecteur de bâtiment cible (P0)
Créer `TaxBuildingTargetSelector` (similaire à `BuildingTargetSelector` de l'expertise) :
- Lit `parcelData.additional_constructions` + construction principale.
- Affiché en haut des 3 calculateurs **et** de l'onglet Ajouter dès que `parcelData.additional_constructions?.length > 0`.
- Pré-remplit `constructionType`, `constructionYear`, `areaSqm` (au sol du bâtiment ciblé), `usageType` à partir du bâtiment sélectionné.
- Écrit `constructionRef` (`'main'` ou `'extra-i'`) dans chaque `tax_history` inséré.
- Étend `checkDuplicateTaxSubmission` pour inclure `constructionRef` dans la clé d'unicité.

#### Étape 2 — État de contribuable partagé (P1)
Remonter `nif / hasNif / ownerName / idDocumentFile / fiscalYear` dans `TaxManagementDialog` et les passer en props aux 4 sous-flux. Pré-remplir depuis `parcelData.current_owner_name` et — si l'utilisateur a déjà soumis une autre déclaration cette session — réutiliser sa saisie.

#### Étape 3 — Aligner mapping picklists (P0, schéma)
- Soumission : écrire **à la fois** `construction_nature` (valeurs CCC : `Durable/Semi-durable/Précaire`) **et** `construction_type` legacy pour compat, mais ne plus écraser `declared_usage` avec la valeur legacy (conserver telle quelle si la parcelle a déjà une valeur CCC ; sinon écrire la valeur picklist FR exacte : `Habitation`, `Commerce`, etc.).
- Centraliser ce mapping dans `taxSharedUtils.toCccConstructionNature()` et `toCccDeclaredUsage()`.

#### Étape 4 — Nettoyer les champs hors-périmètre CCC (P1)
- `building_condition`, `floors`, `roofing_type` : soit les promouvoir dans le schéma CCC (ajouter colonnes `building_condition`, `roofing_type`), soit les supprimer du calcul (la base légale RDC ne les requiert pas tous). Décision recommandée : **les conserver uniquement dans `tax_history`** comme métadonnées de calcul, pas dans les colonnes racine — clarifier via commentaire.

#### Étape 5 — "Ajouter un paiement" : parité avec CCC (P1)
Dans `TaxFormDialog` embedded :
- Ajouter champ `remainingAmount` si `paymentStatus === 'Payé partiellement'`.
- Ajouter sélecteur `constructionRef` (réutilise composant Étape 1).
- Pour IRL : permettre de rattacher à un locataire (lien optionnel).

#### Étape 6 — Pré-remplir l'historique (P2)
Avant soumission, lire `tax_history` existant de la parcelle : si une déclaration `tax_type + tax_year + constructionRef` existe déjà → afficher un avertissement plutôt qu'une erreur post-submit ; proposer d'éditer plutôt que de créer.

---

### 4. Détails techniques

Fichiers principaux à modifier :
- `src/components/cadastral/TaxManagementDialog.tsx` — état contribuable partagé + injection sélecteur bâtiment.
- `src/components/cadastral/tax-calculator/TaxBuildingTargetSelector.tsx` — **nouveau**.
- `src/components/cadastral/PropertyTaxCalculator.tsx`, `BuildingTaxCalculator.tsx`, `IRLCalculator.tsx` — accepter `constructionRef` + `targetBuildingData` en props ; écrire `constructionRef` dans `tax_history` ; utiliser nouveaux mappers.
- `src/components/cadastral/TaxFormDialog.tsx` — ajouter `remainingAmount`, `constructionRef`.
- `src/components/cadastral/tax-calculator/taxSharedUtils.ts` — ajouter `toCccConstructionNature`, `toCccDeclaredUsage`, étendre `checkDuplicateTaxSubmission(constructionRef?)`.

Aucune migration SQL n'est strictement requise : `tax_history` est `jsonb` et accepte `constructionRef` directement. Une migration optionnelle pourrait ajouter un index GIN sur `tax_history` pour accélérer la détection de doublons par `constructionRef`.

---

### 5. Hors-périmètre

- Refonte du calcul fiscal lui-même (taux, multiplicateurs) — non lié à la cohérence avec CCC.
- Ajout de nouvelles taxes (foncier non bâti, droits d'enregistrement) — à traiter séparément.
- Migration des données historiques (`tax_history` existants sans `constructionRef`) — par défaut on suppose `'main'` à la lecture, comme déjà fait ligne 1052 de `useCCCFormState`.

Souhaitez-vous que je procède à l'implémentation des étapes P0 (1 et 3) en priorité, ou l'ensemble P0 + P1 ?