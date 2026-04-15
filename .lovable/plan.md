

# Modifier le label "Est-il habité ?" dynamiquement

## Changement

Dans `src/components/cadastral/ccc-tabs/GeneralTab.tsx`, ligne 1076, remplacer le label statique par un label dynamique utilisant `formData.constructionType` :

```
"Est-il habité ?"  →  "Votre {constructionType} est-il habité ?"
```

Exemple : si l'utilisateur a sélectionné "Maison", le label affichera **"Votre Maison est-il habité ?"**

## Détail technique

Ligne 1076 — remplacer :
```tsx
<Label className="text-sm font-medium">Est-il habité ?</Label>
```
Par :
```tsx
<Label className="text-sm font-medium">
  Votre {formData.constructionType?.toLowerCase() || 'bien'} est-il habité ?
</Label>
```

Le `.toLowerCase()` harmonise la casse et le fallback `'bien'` couvre le cas improbable où `constructionType` serait vide (le bloc n'est affiché que si `constructionType` est défini, mais par sécurité).

## Fichier impacté
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx` (1 ligne)

