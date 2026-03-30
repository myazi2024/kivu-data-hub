

# Corriger le dialogue d'avertissement à la désactivation du mode test

## Problème
Il y a deux dialogues qui se superposent :
1. **TestModeConfigCard** (lignes 146-172) : un AlertDialog non contrôlé qui s'ouvre au clic sur "Désactiver le mode test", puis appelle `onSave`
2. **AdminTestMode** (lignes 232-266) : le dialogue de nettoyage qui s'ouvre si `total > 0`

Le premier dialogue se ferme quand l'utilisateur confirme, puis `saveConfiguration()` tente d'ouvrir le second. Ce chevauchement empêche le second dialogue d'apparaître correctement. De plus, si `total === 0`, aucun avertissement ne s'affiche du tout.

## Solution
Supprimer le dialogue de confirmation redondant dans `TestModeConfigCard` et centraliser toute la logique dans `AdminTestMode.tsx` via `saveConfiguration()` :

- **Si `total > 0`** : afficher le dialogue existant (nettoyage proposé)
- **Si `total === 0`** : afficher un dialogue de confirmation simple ("Vous allez désactiver le mode test, les opérations affecteront la production")
- **Pas de double dialogue** : `TestModeConfigCard` affiche toujours un bouton simple qui appelle `onSave`

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/test-mode/TestModeConfigCard.tsx` | Supprimer le AlertDialog conditionnel (lignes 145-178), toujours afficher un bouton simple qui appelle `onSave` |
| `src/components/admin/AdminTestMode.tsx` | Ajouter un second état `showDisableConfirmDialog` pour le cas `total === 0`. Dans `saveConfiguration`, si on désactive : si `total > 0` → cleanup dialog, sinon → confirm dialog simple |

