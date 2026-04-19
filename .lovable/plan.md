

## Audit du mode test — alignement avec les évolutions récentes

### Constat global

Le générateur couvre les **18 entités** déclarées et le registry `test_entities_registry` (11 tables) est cohérent avec les RPC `cleanup_*` et le trigger `prevent_test_data_in_prod` (10 tables). **Mais 5 écarts** sont apparus depuis les derniers chantiers (catalogue dynamique, trigger `provision_service_access`, hub historiques, hub commerce/billing, modularisation lotissement).

### Écarts détectés

#### 1. Catalogue de services désaligné (P1) — **moyen**
`generators/invoices.ts` et `generateServiceAccess` utilisent un pool **codé en dur** (`['information', 'location_history', 'history', 'obligations', 'land_disputes']`).
- Le pool ignore `display_order` et `required_data_fields` du catalogue dynamique.
- Si l'admin ajoute/désactive un service, les factures test deviennent incohérentes.
- **Action** : lire `cadastral_services_config` au runtime (`is_active=true`) au début de `generateInvoices` et utiliser uniquement les `service_id` actifs. Idem pour `generateServiceAccess`.

#### 2. Doublon `cadastral_service_access` avec le nouveau trigger (P3) — **élevé**
Depuis `trg_provision_service_access_on_paid`, chaque facture passée à `paid` provisionne automatiquement les accès. Or `generateInvoices` insère déjà des factures `paid` → le trigger crée les accès → puis `generateServiceAccess` réinsère → conflit potentiel `ON CONFLICT (user_id, parcel_number, service_type) DO NOTHING` (le trigger l'absorbe), mais **les deux sources divergent** sur le `service_type` (le trigger lit `selected_services`, le générateur invente une liste différente).
- **Action** : supprimer `generateServiceAccess` et son étape (Step 5). Le trigger fait foi → garantit aussi qu'on teste réellement le flux production.

#### 3. Lotissements — sous-tables manquantes — **moyen**
`generateSubdivisionRequests` insère dans `subdivision_requests` mais **jamais** dans `subdivision_lots` ni `subdivision_roads` (zéro ligne en DB). L'admin AdminSubdivision et le canvas LotCanvas restent vides en mode test.
- **Action** : après insertion de la demande, créer N lignes `subdivision_lots` (via `lots_data`) + 1-2 `subdivision_roads` par demande approuvée.

#### 4. Hypothèques — paiements absents (hub Historiques & Litiges) — **moyen**
`generateMortgages` n'alimente pas `cadastral_mortgage_payments` (0 ligne). Le hub historiques affiche les hypothèques sans échéances payées → impossible de tester `lifecycle_state` ni les RPC reçus/réconciliation.
- **Action** : pour chaque hypothèque `active|soldée`, générer 2-6 paiements (`payment_type` = `mensualite|solde_final`).

#### 5. Autorisations de bâtir — paiements + actions admin absents — **moyen**
`generateBuildingPermits` insère 0 ligne en prod (test_pIdx counts low + filtre i%10===7) et n'alimente ni `permit_payments` ni `permit_admin_actions`. Le module Autorisation ne peut pas être testé bout en bout.
- **Action** : (a) ajuster le filtre pour garantir ≥1 permit/province ; (b) pour chaque permit `approved|completed`, créer un `permit_payments` `status='completed'` ; (c) pour chaque permit non-`pending`, créer un `permit_admin_actions`.

#### 6. Étape de progression à mettre à jour
Renommer Step 5 `Accès aux services` → `Lots & routes de lotissement` (puisqu'on supprime l'accès manuel et qu'on ajoute lots/roads).

#### 7. Bonus alignement
- **Registry** : ajouter `cadastral_mortgages` (marker `reference_number` LIKE 'TEST-HYP-%'), `cadastral_building_permits` (marker `permit_number` LIKE 'TEST-PC%') et `generated_certificates` (marker `reference_number` LIKE 'TEST-CERT-%') au `test_entities_registry` pour que le compteur stats et l'export CSV pré-purge soient exhaustifs. Le RPC `cleanup_all_test_data` les nettoie déjà via cascade FK, donc pas de migration de purge nécessaire.

### Plan d'implémentation

| # | Action | Fichier(s) |
|---|---|---|
| 1 | Charger les `service_id` actifs depuis Supabase au début de `generateInvoices` | `generators/invoices.ts` |
| 2 | Supprimer `generateServiceAccess` + l'étape 5 + l'import dans `useTestDataActions` | `generators/invoices.ts`, `generators/index.ts`, `useTestDataActions.ts` |
| 3 | Créer `generators/subdivisionDetails.ts` → `generateSubdivisionLots` + `generateSubdivisionRoads`, appelés après `generateSubdivisionRequests` | nouveau + `useTestDataActions.ts` |
| 4 | Étendre `generators/mortgages.ts` → `generateMortgagePayments(mortgages)` | `generators/mortgages.ts`, `useTestDataActions.ts` |
| 5 | Étendre `generators/permits.ts` → ajuster filtre + `generatePermitPayments` + `generatePermitAdminActions` | `generators/permits.ts`, `useTestDataActions.ts` |
| 6 | Migration : ajouter 3 lignes au `test_entities_registry` (mortgages, permits, certificates) | nouvelle migration SQL |
| 7 | Renommer libellés des steps + mettre à jour `entities[]` dans `logAuditAction` | `useTestDataActions.ts` |
| 8 | Mettre à jour `docs/TEST_MODE.md` (suppression step service_access, ajout lots/roads/payments) | `docs/TEST_MODE.md` |

### Détails techniques

- **Trigger d'idempotence** : `provision_service_access_on_paid` couvre INSERT et UPDATE — donc l'insertion de factures `paid` directes est sans risque.
- **Catalogue dynamique** : si lecture du catalogue échoue, fallback sur la liste actuelle pour ne pas bloquer la génération.
- **Lots/roads** : `subdivision_lots.parcel_number` peut rester `NULL` (pas de FK obligatoire) ; `lot_number` calculé à partir de `lots_data`.
- **Mémoire** : mettre à jour `mem://admin/test-mode-hardening-fr` après implémentation pour refléter la complétude.

