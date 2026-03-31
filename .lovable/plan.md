

# Distribution non-uniforme des parcelles test par province

## Objectif

Remplacer la distribution uniforme (20 parcelles/province) par une distribution pondérée avec un multiplicateur de 1 à 26 par province, classé par densité réaliste. Cela permet de tester la visualisation "Densité parcelles cadastrées" sur la carte d'accueil.

## Distribution proposée

| Province | Multiplicateur | Parcelles (20 × mult) | 15 SU × mult | 5 SR × mult |
|---|---|---|---|---|
| Kinshasa | ×26 | 520 | 390 | 130 |
| Haut-Katanga | ×25 | 500 | 375 | 125 |
| Sud-Kivu | ×24 | 480 | 360 | 120 |
| Nord-Kivu | ×23 | 460 | 345 | 115 |
| Ituri | ×22 | 440 | 330 | 110 |
| Kongo-Central | ×21 | 420 | 315 | 105 |
| Lualaba | ×20 | 400 | 300 | 100 |
| Tanganyika | ×19 | 380 | 285 | 95 |
| Tshopo | ×18 | 360 | 270 | 90 |
| Kasaï-Oriental | ×17 | 340 | 255 | 85 |
| Kwilu | ×16 | 320 | 240 | 80 |
| Équateur | ×15 | 300 | 225 | 75 |
| Kasaï-Central | ×14 | 280 | 210 | 70 |
| Haut-Lomami | ×13 | 260 | 195 | 65 |
| Maniema | ×12 | 240 | 180 | 60 |
| Lomami | ×11 | 220 | 165 | 55 |
| Kasaï | ×10 | 200 | 150 | 50 |
| Mongala | ×9 | 180 | 135 | 45 |
| Kwango | ×8 | 160 | 120 | 40 |
| Mai-Ndombe | ×7 | 140 | 105 | 35 |
| Sankuru | ×6 | 120 | 90 | 30 |
| Nord-Ubangi | ×5 | 100 | 75 | 25 |
| Sud-Ubangi | ×4 | 80 | 60 | 20 |
| Haut-Uélé | ×3 | 60 | 45 | 15 |
| Bas-Uélé | ×2 | 40 | 30 | 10 |
| Tshuapa | ×1 | 20 | 15 | 5 |

**Total : 7 020 parcelles** (contre 520 actuellement).

## Détails techniques

### Fichier modifié : `testDataGenerators.ts`

**1. Ajouter un champ `multiplier` au tableau `PROVINCES`**

Réordonner le tableau par densité décroissante et ajouter un multiplicateur :

```typescript
const PROVINCES = [
  { province: 'Kinshasa', multiplier: 26, ville: 'Kinshasa', ... },
  { province: 'Haut-Katanga', multiplier: 25, ... },
  // ... jusqu'à
  { province: 'Tshuapa', multiplier: 1, ... },
];
```

**2. Remplacer `PARCELS_PER_PROVINCE` par un calcul dynamique**

Supprimer la constante `PARCELS_PER_PROVINCE = 20` et utiliser :
```typescript
const BASE_PARCELS = 20;
const getParcelsForProvince = (pIdx: number) => BASE_PARCELS * PROVINCES[pIdx].multiplier;
```

**3. Refactorer `generateParcelNumbers`**

Boucle dynamique par province avec le nombre variable de parcelles :
```typescript
export function generateParcelNumbers(suffix: string): string[] {
  const numbers: string[] = [];
  for (let pIdx = 0; pIdx < PROVINCES.length; pIdx++) {
    const count = getParcelsForProvince(pIdx);
    for (let i = 0; i < count; i++) {
      numbers.push(`TEST-${pIdx}-${String(i).padStart(3, '0')}-${suffix}`);
    }
  }
  return numbers;
}
```

**4. Refactorer `generateParcels` et `generateContributions`**

Remplacer `Math.floor(idx / PARCELS_PER_PROVINCE)` par une logique de recherche du province-index basée sur des offsets cumulés :
```typescript
// Pré-calculer les offsets
const PROVINCE_OFFSETS = PROVINCES.reduce((acc, p, i) => {
  acc.push((acc[i - 1] || 0) + getParcelsForProvince(i));
  return acc;
}, [] as number[]);

function getProvinceIndex(globalIdx: number): { pIdx: number; localIdx: number } {
  let cumul = 0;
  for (let p = 0; p < PROVINCES.length; p++) {
    const count = getParcelsForProvince(p);
    if (globalIdx < cumul + count) return { pIdx: p, localIdx: globalIdx - cumul };
    cumul += count;
  }
  return { pIdx: PROVINCES.length - 1, localIdx: 0 };
}
```

**5. Adapter le ratio SU/SR**

Pour chaque province, les premiers 75% sont SU, les derniers 25% sont SR :
```typescript
const isSR = localIdx >= Math.floor(count * 0.75);
```

**6. Adapter les entités enfant proportionnellement**

Les fonctions qui créent des entités enfant (factures, titres, expertises, litiges, mutations, etc.) utilisent déjà `parcelNumbers.length` ou `PROVINCES.length`. Les volumes s'adaptent automatiquement au nouveau total (7 020). Le batching existant (par 50) gère le volume.

**7. Mettre à jour le message de succès** dans `useTestDataActions.ts` : remplacer le texte par `"7 020 parcelles test générées (26 provinces, densité variable)"`.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `testDataGenerators.ts` | Multiplicateurs, refactoring de la distribution, calcul dynamique des offsets |
| `useTestDataActions.ts` | Message de succès |

