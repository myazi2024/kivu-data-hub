

# Augmenter l'ombre de la barre de recherche cadastrale et du dropdown Actions

## Problème

Sur la carte cadastrale (`/cadastral-map`), deux éléments ont des ombres trop discrètes :
1. **Barre de recherche** (ligne 990) : utilise `shadow-xl`
2. **Panneau Actions / détails parcelle** (ligne 1325) : utilise un shadow custom léger

## Modifications

**Fichier** : `src/pages/CadastralMap.tsx`

### 1. Barre de recherche (ligne 990)
Remplacer `shadow-xl` par une ombre custom 3x plus intense :
```
shadow-xl → shadow-[0_10px_40px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2)]
```

### 2. Panneau détails parcelle + Actions (ligne 1325)
Tripler l'intensité de l'ombre existante :
```
shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25),0_4px_16px_-4px_rgba(0,0,0,0.15)]
→
shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.75),0_4px_16px_-4px_rgba(0,0,0,0.45)]
```

Seul le fichier `src/pages/CadastralMap.tsx` est modifié (2 lignes).

