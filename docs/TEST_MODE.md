# Mode Test

## Architecture

Le mode test est un système transversal contrôlé depuis l'admin (`AdminTestMode`) et stocké dans `cadastral_search_config` (clé `test_mode`).

## Configuration

```json
{
  "enabled": true,
  "auto_cleanup": true,
  "test_data_retention_days": 7
}
```

## Composants du système

### 1. Provider `TestEnvironmentProvider`
- Détecte les routes `/test/*` via `useLocation()`
- Expose `isTestRoute` à tous les composants enfants

### 2. Hook `useTestMode`
- Charge la config depuis Supabase
- Écoute les changements en temps réel via `postgres_changes`
- Expose : `isTestModeActive`, `testMode`, `loading`

### 3. Bannière `TestEnvironmentBanner`
- Affichée automatiquement sur les routes `/test/*`
- Indicateur visuel pour distinguer test/production

### 4. Filtre `applyTestFilter()`
- Filtre les requêtes Supabase selon le contexte :
  - Route test : `ilike(column, 'TEST-%')`
  - Route production : `not(column, 'ilike', 'TEST-%')`

### 5. Données de test
- Toutes les données test ont un préfixe `TEST-` sur leur identifiant de référence
- Convention : `parcel_number`, `reference_number`, `invoice_number`, `permit_number`
- **Couverture étendue (avr. 2026)** : lots/voies de lotissement (`subdivision_lots`,
  `subdivision_roads`), paiements d'hypothèques (`cadastral_mortgage_payments`),
  hypothèques (`cadastral_mortgages`), autorisations de bâtir (`cadastral_building_permits`)
  et certificats (`generated_certificates`) sont alimentés et tracés au registre.
- **Catalogue dynamique** : `generateInvoices` lit les `service_id` actifs depuis
  `cadastral_services_config` au runtime (fallback sur la liste par défaut).
- **Service access** : provisionné automatiquement par le trigger
  `trg_provision_service_access_on_paid` (P3) — plus de génération manuelle.

### 6. Nettoyage

#### Manuel — RPC `cleanup_all_test_data()`
- Purge **immédiate** de toutes les données préfixées `TEST-` (respecte l'ordre FK).
- Vérifie le rôle `admin`/`super_admin` (RAISE EXCEPTION sinon).
- Loggue dans `audit_logs` (`MANUAL_TEST_DATA_CLEANUP`) avec total + détail par table.
- Appelée depuis l'admin via le bouton « Nettoyer tout ».

#### Automatique — RPC `cleanup_all_test_data_auto()` + cron `cleanup-test-data-daily-rpc`
- Cron pg_cron exécuté chaque jour à **03:00 UTC** : `SELECT public.cleanup_all_test_data_auto();`.
- Aucun JWT en clair dans le cron (appel SQL direct, pas d'edge function).
- Ne supprime que les données plus anciennes que `test_data_retention_days` (config `test_mode`).
- N'agit que si `test_mode.enabled = true` ET `test_mode.auto_cleanup = true`.
- Loggue dans `audit_logs` (`AUTO_TEST_DATA_CLEANUP`).

#### Edge Function `cleanup-test-data` — dépréciée
- Conservée pour compat mais **non utilisée par le cron** (qui appelle directement la RPC).
- Toujours utilisable manuellement par un admin authentifié si besoin.

### 6.bis Trigger anti-insert prod (`prevent_test_data_in_prod`)
- BEFORE INSERT sur 10 tables (parcels, contributions, invoices, codes, disputes,
  expertise, titres, mutations, lotissements, conflits limites).
- Bloque toute ligne dont la colonne marqueur commence par `TEST-` quand
  `test_mode.enabled = false`. Évite que des tests ne fuient en production.

### 6.ter Registry `test_entities_registry`
- Table publique listant les entités test (table_name, marker_column, label_key).
- Source unique pour `count_test_data_stats()` (côté serveur) et `TEST_ENTITIES`
  (côté client, `src/constants/testEntities.ts`).
- Utilisée par l'export CSV pré-purge.

### 7. Simulation de paiement
- Bouton « Simuler le paiement (test) » dans le catalogue de services
- Contourne la RPC sécurisée, insère directement en DB avec statut `pending` et préfixe `TEST-`
- `processTestPayment` crée une transaction `TEST_SIMULATION`, marque la facture payée, accorde l'accès

## Routes miroir

| Production | Test | Description |
|------------|------|-------------|
| `/map` | `/test/map` | Analytics / Données foncières (Construction, Titres, etc.) |
| `/cadastral-map` | `/test/cadastral-map` | Carte cadastrale |
| `/mon-compte` | `/test/mon-compte` | Espace utilisateur |
