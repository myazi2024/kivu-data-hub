

# Fix : Erreur de validation latitude négative sur toggle légende

## Problème

`validateNumericRange` (ligne 20 de `useConfigValidation.tsx`) contient un check générique `if (value < 0)` qui rejette toute valeur négative **avant** de vérifier les bornes min/max. La latitude par défaut étant `-4.0383`, elle déclenche systématiquement l'erreur "Latitude ne peut pas être négatif" — même si la plage valide est [-90, 90].

Ce check est redondant quand `min` est défini (le check `value < min` suffit), et incorrect pour les champs qui acceptent des valeurs négatives (latitude, longitude).

## Solution

Supprimer le check `if (value < 0)` générique dans `validateNumericRange`. Les validations `min`/`max` couvrent déjà tous les cas nécessaires.

## Modification

### `src/hooks/useConfigValidation.tsx` — lignes 20-26

Supprimer le bloc :
```ts
if (value < 0) {
  validationErrors.push({
    field,
    message: `${field} ne peut pas être négatif`,
    severity: 'error'
  });
}
```

Les champs qui ne doivent pas être négatifs ont déjà `min: 0` passé explicitement (surface, valeur de base, etc.), donc aucune régression.

| Fichier | Modification |
|---|---|
| `src/hooks/useConfigValidation.tsx` | Supprimer le check générique `value < 0` (lignes 20-26) |

