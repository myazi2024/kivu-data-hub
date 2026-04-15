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

### 6. Nettoyage

#### Méthode recommandée : RPC serveur
- La fonction `cleanup_all_test_data()` supprime toutes les données test en respectant l'ordre FK (enfants → parents)
- Appelable depuis l'admin via le bouton « Nettoyer tout » ou manuellement : `SELECT cleanup_all_test_data()`
- Peut être planifiée via une tâche cron SQL

#### Méthode dépréciée : Edge Function
- L'Edge Function `cleanup-test-data` n'est plus recommandée
- Utilisez la RPC serveur à la place

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
