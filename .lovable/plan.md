# Bug — Crash au clic sur « Un seul local » / « Divisé en plusieurs locaux »

## Cause racine

`src/components/cadastral/RentalConfigurationFields.tsx` — composant `MonthlyRentFields` viole les **Rules of Hooks** de React.

L'ordre actuel est :

```
Line 183: useMemo(total)            // hook #1
Line 191: useMemo(minRentalDate)    // hook #2
Line 197: if (!state.rentalConfiguration) return null;   ← early return conditionnel
Line 210: const showFloorSelect = Number(numberOfFloors) >= 1;
Line 211: useMemo(floorOptions)     // hook #3 — DERRIÈRE l'early return
```

Avant le clic, `state.rentalConfiguration` est `undefined` → le composant sort tôt et n'appelle que 2 hooks.
Après le clic (single ou multi), il devient défini → l'early return n'est plus pris et un **3ᵉ hook** apparaît.

React lève alors :
> *"Rendered more hooks than during the previous render."*

L'exception remonte jusqu'à `ErrorBoundary` (`src/components/ErrorBoundary.tsx`), qui affiche le fallback « Une erreur est survenue ». Le clic sur l'un ou l'autre bouton produit donc systématiquement le crash.

Aucun lien avec Radix Select, la validation, ou l'agrégation de capacité — ces parties ne s'exécutent qu'après que le premier rendu post-clic ait abouti.

## Correction

Déplacer **tous** les hooks (`useMemo` pour `floorOptions`) **au-dessus** de l'early return dans `MonthlyRentFields`.

```tsx
// MonthlyRentFields — réordonner :
const total = useMemo(...);
const minRentalDate = useMemo(...);
const showFloorSelect = Number(numberOfFloors) >= 1;
const floorOptions = useMemo(() => {
  const max = Math.max(0, Math.min(50, Number(numberOfFloors) || 0));
  return Array.from({ length: max + 1 }, (_, i) => ({ value: floorValue(i), label: floorLabel(i) }));
}, [numberOfFloors]);

if (!state.rentalConfiguration) return null;  // early return APRÈS tous les hooks
```

Aucun autre changement nécessaire : la logique métier, les Selects, et l'agrégation `Σ hostingCapacity` sont corrects.

## Audit défensif (mêmes patterns ailleurs)

Vérifier rapidement qu'aucun autre composant CCC modifié récemment n'a un hook après un early return conditionnel :
- `RentalConfigurationSelector` (même fichier) — pas d'early return, OK.
- `GeneralTab.tsx` (useEffect d'agrégation ligne 132) — placé en tête, OK.
- `AdditionalConstructionBlock.tsx` (useEffect ligne 209) — placé en tête, OK.
- `MarketValueTab.tsx` — à scanner par sécurité.

Si un autre cas est détecté, appliquer la même règle : tous les hooks avant tout `return`/`if return`.

## Fichier modifié

- `src/components/cadastral/RentalConfigurationFields.tsx` (réordonnancement de ~10 lignes dans `MonthlyRentFields`)

## Vérification

1. Ouvrir la CCC, onglet Infos, choisir Usage = Location.
2. Cliquer « Un seul local » → champ Loyer mensuel apparaît, aucun crash.
3. Cliquer « Divisé en plusieurs locaux » → cartes Local #1/#2 s'affichent avec étage / occupation / capacité / date / loyer.
4. Basculer entre les deux modes plusieurs fois — aucun crash.
5. Reproduire dans une construction additionnelle.
