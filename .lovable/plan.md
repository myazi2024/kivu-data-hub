

# Corriger la synchronisation filtre-carte pour Kongo-Central (et robustifier le matching)

## Problème identifié

Le filtre lieu envoie les noms de provinces depuis `geographicData.ts` (ex: `"Kongo-Central"` avec trait d'union), mais la carte utilise `PROVINCE_META` qui a `"Kongo Central"` (sans trait d'union). La recherche exacte dans `handleProvinceFilter` échoue silencieusement :

```
// ligne 185 — match exact qui échoue
const province = provincesData.find(p => p.name === provinceName);
```

Pour Kwilu, les noms correspondent dans les deux sources — le problème est peut-être un bug d'animation similaire déjà corrigé, ou un autre comportement intermittent.

## Solution

**Fichier : `src/components/DRCInteractiveMap.tsx`**

1. **Ligne 22** — Corriger le nom dans `PROVINCE_META` pour qu'il soit cohérent avec `geographicData.ts` :
   - `"Kongo Central"` → `"Kongo-Central"`

2. **Ligne 185** — Rendre le matching robuste avec une normalisation (retirer tirets, espaces, casse) pour éviter tout problème futur :
```tsx
const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');
const province = provincesData.find(p => normalize(p.name) === normalize(provinceName));
```

Cela garantit que même si d'autres légères différences existent entre les deux sources de noms, le matching fonctionnera toujours.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCInteractiveMap.tsx` | Ligne 22 : corriger nom, Ligne 185 : matching normalisé |

