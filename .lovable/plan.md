

# Augmenter la taille du logo sur la page About

## Changement

Multiplier par deux la taille du logo à côté du titre "À propos du BIC".

### `src/pages/About.tsx` — Ligne 28

```diff
-                className="h-16 w-auto object-contain opacity-90 -mr-2"
+                className="h-32 w-auto object-contain opacity-90 -mr-2"
```

**Taille actuelle** : `h-16` (64px)  
**Nouvelle taille** : `h-32` (128px)

Le logo occupera maintenant l'espace visuel proportionnel au titre principal.

