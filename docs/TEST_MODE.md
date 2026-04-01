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
- Convention : `parcel_number`, `reference_number`, `invoice_number`

### 6. Nettoyage automatique
- Edge Function `cleanup-test-data` supprime les données test expirées
- Respecte l'ordre FK (enfants → parents)
- Journalisé dans `audit_logs`

### 7. Simulation de paiement
- Bouton « Simuler le paiement (test) » dans le catalogue de services
- Contourne la RPC sécurisée, insère directement en DB avec statut `pending` et préfixe `TEST-`
- `processTestPayment` crée une transaction `TEST_SIMULATION`, marque la facture payée, accorde l'accès

## Routes miroir

| Production | Test |
|------------|------|
| `/map` | `/test/map` |
| `/cadastral-map` | `/test/cadastral-map` |
| `/mon-compte` | `/test/mon-compte` |
