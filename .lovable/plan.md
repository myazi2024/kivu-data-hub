

# Correction du label dynamique — Catégorie de bien

## Changement

Ligne 1076 de `GeneralTab.tsx`, remplacer `formData.constructionType` par `formData.propertyCategory` :

```tsx
// Avant
Votre {formData.constructionType?.toLowerCase() || 'bien'} est-il habité ?

// Après
Votre {formData.propertyCategory?.toLowerCase() || 'bien'} est-il habité ?
```

Exemple : si "Maison" est sélectionné comme Catégorie de bien → **"Votre maison est-il habité ?"**

## Fichier impacté
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx` (1 ligne)

