

# Nettoyer automatiquement les données test à la désactivation du mode test

## Problème
Quand le mode test est désactivé, les données préfixées `TEST-%` restent dans la base et sont visibles dans toute l'application (parcelles, contributions, factures, etc.). Aucun filtre ne les exclut des requêtes normales.

## Solution retenue
Deux actions complémentaires :

### 1. Nettoyage automatique à la désactivation
Dans `AdminTestMode.tsx`, lors de la sauvegarde de la configuration avec `enabled: false` alors qu'il était `true` avant, appeler automatiquement `cleanup_all_test_data()` via RPC avant d'enregistrer la config. Afficher un dialogue de confirmation prévenant l'utilisateur que les données test seront supprimées.

### 2. Dialogue de confirmation
Ajouter un `AlertDialog` qui s'affiche quand l'utilisateur passe de activé → désactivé et qu'il reste des données test (total > 0). Le dialogue propose :
- **Désactiver et supprimer** : appelle `cleanup_all_test_data()` puis sauvegarde
- **Désactiver sans supprimer** : sauvegarde sans nettoyage (mais affiche un avertissement)
- **Annuler**

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/AdminTestMode.tsx` | Ajouter la logique de détection (désactivation + données restantes) et le dialogue de confirmation avant sauvegarde |

## Détails techniques

Dans `saveConfiguration()` :
```typescript
// Si on désactive et qu'il reste des données test
if (savedConfig.enabled && !config.enabled && total > 0) {
  setShowCleanupDialog(true);
  return;
}
```

Nouveau dialogue avec deux options :
- "Désactiver et nettoyer" → `supabase.rpc('cleanup_all_test_data')` puis sauvegarde
- "Désactiver uniquement" → sauvegarde directe

