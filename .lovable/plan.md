## Audit — Service "Demander une autorisation" vs formulaire CCC

### 1. Contexte

Le menu Carte cadastrale → Actions → "Demander une autorisation" ouvre `BuildingPermitRequestDialog` qui propose deux sous-flux :
- **Autorisation de bâtir** (`requestType = 'new'`)
- **Autorisation de régularisation** (`requestType = 'regularization'`)

Les deux insèrent dans `cadastral_contributions` (`contribution_type = 'permit_request'`) avec un payload JSON `permit_request_data` + miroir partiel sur les colonnes racine (`construction_type`, `construction_nature`, `declared_usage`, `area_sqm`, `construction_year`).

Source de vérité technique : formulaire CCC (`useCCCFormState`, `useCCCFormPicklists`, picklists dépendantes type→nature→matériaux→standing→usage, gestion `additional_constructions[]`, `taxpayer_identity`).

À ne pas confondre avec `BuildingPermitFormDialog` / `BuildingPermitManagementDialog` (déclaration d'une autorisation **déjà obtenue**) déjà aligné par ailleurs ; le présent audit cible la **demande**.

---

### 2. Constats — incohérences avec CCC

**A. Picklists hard-codées, dépendances cassées (P0)**
`PermitFormStep.tsx` code en dur 4 valeurs `constructionType` (`Résidentielle / Commerciale / Industrielle / Agricole`) — il manque `Terrain nu`. La nature ne dépend pas du type (3 valeurs fixes au lieu du mapping CCC : `Agricole` doit pouvoir être `Non bâti`, `Terrain nu` doit forcer `Non bâti`). L'usage déclaré est une liste plate de 7 entrées, alors que CCC a un mapping `type_nature → usages` (16 combinaisons) qui interdit par exemple "Industrie" pour une construction Résidentielle Précaire.

**B. Pas de cascade ni de centralisation (P0)**
Aucune utilisation de `useCCCFormPicklists` ni de `resolveAvailableUsages` (utilitaire partagé déjà en place). Conséquence : si l'admin enrichit les picklists CCC (nouvelles natures, usages), le formulaire de demande ne suit pas. Divergence garantie à terme.

**C. Multi-construction ignorée (P0)**
`parcelData.additional_constructions[]` n'est jamais lue. Le pré-remplissage prend uniquement les champs racine (construction principale). Sur une parcelle à plusieurs bâtiments, l'utilisateur ne peut pas indiquer pour quel bâtiment il régularise/agrandit. Pas de `constructionRef` écrit dans `permit_request_data`. Même problème déjà identifié et corrigé pour Taxes foncières → solution réutilisable (`TaxBuildingTargetSelector` adaptable en `PermitBuildingTargetSelector`).

**D. Identité demandeur dupliquée vs `taxpayer_identity` (P1)**
Le formulaire redemande nom / téléphone / email / adresse alors que CCC a déjà collecté `taxpayer_identity` (NIF, nom officiel, pièce d'identité). Aucun pré-remplissage depuis `parcelData.current_owner_name` / `taxpayer_identity` ; pas de champ NIF (pourtant requis légalement pour toute demande administrative en RDC).

**E. Champs hors-CCC sans homogénéisation (P1)**
`roofingType`, `numberOfRooms`, `waterSupply`, `electricitySupply`, `numberOfFloors`, `architectName`, `architectLicense` ne sont pas dans le schéma CCC. Stockés dans `permit_request_data` JSON — OK comme métadonnée, mais :
- `roofingType` : valeurs (`Tôle ondulée / Tuile / Dalle béton / Chaume`) ne sont pas alignées sur `picklist_construction_materials` (`Béton armé / Briques / Tôles / Bois / Paille`). Risque d'incohérence : Précaire+Dalle béton est acceptable côté formulaire.
- `waterSupply` / `electricitySupply` : valeurs en dur (`REGIDESO`, `SNEL`) sans picklist admin → impossible à étendre.

**F. Mapping `regularization` partiel (P1)**
- `originalPermitNumber` est demandé seulement pour 3 raisons sur 5 (`requiresOriginalPermit`). OK.
- Mais `constructionDate` (année construction) écrit dans `construction_year` côté racine, écrasant potentiellement la valeur CCC d'origine si la parcelle en a déjà une → **risque d'écrasement** comme avec Taxes/Property.
- `complianceIssues` est texte libre — pas de picklist de conformité (zonage, recul, hauteur, COS) alors que CCC a `picklist_zoning_violation` (à vérifier en base).

**G. Détection de doublon trop large (P1)**
`checkDuplicateRequest` filtre par `parcel_number + user_id + contribution_type='permit_request'` et bloque s'il existe un `pending/approved/returned`. Ce filtre :
- Ignore le `requestType` : impossible de demander une régularisation après une autorisation de bâtir approuvée pour un nouveau bâtiment.
- Ignore le `constructionRef` (cf. C) : impossible de demander pour un 2e bâtiment.

**H. Surface / cohérence avec parcelle (P1)**
`plannedArea` est saisie librement et écrit `area_sqm` racine. Aucune vérification que `plannedArea ≤ parcelData.area_sqm` (surface au sol ne peut excéder la parcelle), ni d'avertissement si ratio > 100%. Sur régularisation, on devrait reprendre la surface de la construction ciblée et la rendre read-only.

**I. Frais : pas d'attache à la nature/standing (P2)**
`permit_fees_config` filtre seulement par `permit_type` (construction/regularization). Or, légalement les frais varient par superficie, par usage (commercial > résidentiel) et par standing. Le calculateur actuel est un montant fixe → sous-tarification systématique des grands projets commerciaux. À aligner sur la logique tarifaire de Subdivision/Mutation (paliers + multiplicateurs).

**J. Persistance localStorage non chiffrée (P2)**
`localStorage.setItem(permit_request_draft_<parcel>, JSON.stringify(formData))` stocke nom, téléphone, email, adresse en clair. À aligner sur le standard "PII paid access" et la mémoire `mobile-money-security-standard` : chiffrer ou ne stocker que les champs non-PII.

**K. Upload : génération de noms non sécurisée (P0 mineur)**
`fileName = permit_req_${Date.now()}_${Math.random().toString(36)...}` viole la règle projet (utiliser `crypto.randomUUID()`). Identique dans `BuildingPermitFormDialog` ligne 183.

---

### 3. Plan d'alignement proposé

#### Étape 1 — Picklists dynamiques + cascade CCC (P0)
- Importer `useCCCFormPicklists` et `resolveAvailableUsages` dans `PermitFormStep`.
- Remplacer les 3 `<Select>` (type / nature / usage) par des sélecteurs cascade pilotés par les picklists.
- Ajouter `Terrain nu` au type ; injecter `Non bâti` dans la nature pour Agricole/Terrain nu.
- Reset auto de `constructionNature` quand `constructionType` change ; reset de `declaredUsage` quand l'un des deux change (pattern déjà utilisé dans `useConstructionCascade`).

#### Étape 2 — Sélecteur de bâtiment cible (P0)
- Créer `PermitBuildingTargetSelector` (calqué sur `TaxBuildingTargetSelector`) affiché si `parcelData.additional_constructions?.length > 0`.
- Pré-remplir `constructionType / Nature / Usage / plannedArea / constructionDate` depuis le bâtiment ciblé.
- Écrire `constructionRef` (`'main'` ou `'extra-i'`) dans `permit_request_data`.
- Gardiens "main only" : ne mettre à jour les colonnes racine (`construction_type`, etc.) que si `constructionRef === 'main'`, sinon laisser tel quel.

#### Étape 3 — Identité demandeur partagée (P1)
- Pré-remplir `applicantName` depuis `parcelData.current_owner_name` ou `taxpayer_identity.full_name` ; `applicantPhone` / `applicantEmail` depuis `auth.user`.
- Ajouter champ **NIF** optionnel (pré-rempli depuis `taxpayer_identity.nif` si dispo).
- Réutiliser `useSharedTaxpayer` créé pour Taxes (extraction → hook générique `useSharedApplicant`).
- Joindre la pièce d'identité depuis `taxpayer_identity` si déjà uploadée (lien plutôt que ré-upload).

#### Étape 4 — Détection doublon affinée (P1)
- Étendre `checkDuplicateRequest(requestType, constructionRef?)` :
  - Doublon = même `parcel_number + user_id + requestType + constructionRef + status in (pending,returned)`.
  - Approuvé pour bâtir → ne bloque pas une régularisation ultérieure pour un autre bâtiment.

#### Étape 5 — Validation cohérence terrain (P1)
- Si `parcelData.area_sqm` connue : alerter (non bloquant) si `plannedArea > area_sqm * 0.8` (emprise) ou bloquer si `plannedArea > area_sqm`.
- Rendre `plannedArea` read-only en régularisation quand un bâtiment cible est sélectionné (utiliser `extra.area_sqm`).

#### Étape 6 — Champs métadonnées : aligner ou clarifier (P1)
- `roofingType` : retirer ou alimenter via `picklist_construction_materials` filtré par nature.
- `waterSupply` / `electricitySupply` : créer `picklist_utility_water` / `picklist_utility_power` (admin) ; fallback aux valeurs actuelles.
- Documenter en commentaire que ces champs vivent **uniquement** dans `permit_request_data` (pas de promotion en colonnes racine).

#### Étape 7 — Hardening technique (P0 mineur)
- Remplacer `Math.random().toString(36)` par `crypto.randomUUID()` dans `uploadAttachments` (ligne 84) et `BuildingPermitFormDialog` (ligne 183).
- Brouillon localStorage : retirer `applicantPhone / Email / Address` du JSON persisté (ne garder que les champs techniques) — alignement PII.

#### Étape 8 — Frais paramétrables (P2, hors périmètre minimal)
- Étendre `permit_fees_config` : ajouter colonnes `min_area_sqm`, `max_area_sqm`, `applicable_usage[]`, `applicable_nature[]`, `multiplier_per_sqm`.
- Migration SQL distincte ; refonte du calcul dans `usePermitRequestForm` (sélection de la ligne de barème + ajout multiplicateur surface).
- À traiter dans une itération séparée (impact admin + UX dédiée).

---

### 4. Détails techniques

Fichiers à modifier (P0 + P1) :
- `src/components/cadastral/building-permit-request/PermitFormStep.tsx` — picklists cascade, sélecteur bâtiment, alertes surface.
- `src/components/cadastral/building-permit-request/usePermitRequestForm.ts` — pré-remplissage `taxpayer`, dédup affinée, garde "main only", `crypto.randomUUID`.
- `src/components/cadastral/building-permit-request/types.ts` — ajouter `nif`, `constructionRef` à `PermitFormData`.
- `src/components/cadastral/building-permit-request/PermitBuildingTargetSelector.tsx` — **nouveau** (réutilise pattern Taxes).
- `src/components/cadastral/BuildingPermitRequestDialog.tsx` — passer `taxpayer` partagé, écrire `constructionRef` dans `permit_request_data`, garde "main only" sur colonnes racine, `crypto.randomUUID`.
- `src/components/cadastral/BuildingPermitFormDialog.tsx` — fix `crypto.randomUUID` (ligne 183).

Aucune migration SQL pour P0+P1 : `permit_request_data` est `jsonb` et accepte `constructionRef`, `nif`, `targetedBuildingArea` directement.

Migration optionnelle P2 (étape 8) : refonte `permit_fees_config`.

---

### 5. Hors périmètre

- Refonte du moteur de calcul des frais (étape 8) — itération séparée.
- Création de nouvelles picklists Supabase (utilities) — peut être différée, fallback en dur acceptable.
- Migration des `permit_request` historiques sans `constructionRef` — par défaut on suppose `'main'` à la lecture (cohérent avec le pattern Taxes).
- Workflow d'approbation côté admin (déjà en place via `useParcelTimeline` / hub demandes).

---

Souhaitez-vous implémenter **P0 seulement** (étapes 1, 2, 7) ou **P0 + P1** (étapes 1 à 7) en une seule passe ?
