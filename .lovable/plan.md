

# Génération automatique des données test à l'activation du mode test

## Changement
Quand l'admin active le mode test et sauvegarde, les données test se génèrent automatiquement après l'enregistrement de la configuration. Le bouton "Générer données de test" et son dialogue de confirmation sont supprimés.

## Implémentation

### 1. `AdminTestMode.tsx` — Déclencher la génération après activation
Dans `saveConfiguration`, après le `refreshConfiguration()`, détecter si le mode test vient d'être **activé** (transition `!savedConfig.enabled → config.enabled`) et appeler `generateTestData()` automatiquement :

```typescript
// Après refreshConfiguration + refreshStats
if (!savedConfig.enabled && validatedConfig.enabled) {
  await generateTestData();
}
```

Même logique dans le cas où `saveConfiguration(true)` est appelé directement.

### 2. `TestDataStatsCard.tsx` — Supprimer le bouton "Générer"
- Retirer le bouton "Générer données de test" et son `AlertDialog` de confirmation
- Retirer les props `onGenerate`, `generatingData`, `generationSteps`, `currentStep` du composant
- Conserver la barre de progression (`GenerationProgress`) mais la piloter depuis le parent `AdminTestMode` directement (ou la déplacer dans `AdminTestMode`)

### 3. Conserver la progression visible
La `GenerationProgress` sera affichée dans `AdminTestMode.tsx` (au-dessus ou à la place de la card stats) pendant la génération automatique, pour que l'admin voie l'avancement.

| Fichier | Modification |
|---------|-------------|
| `AdminTestMode.tsx` | Appel auto `generateTestData()` après activation |
| `TestDataStatsCard.tsx` | Suppression bouton "Générer" + props associées |

