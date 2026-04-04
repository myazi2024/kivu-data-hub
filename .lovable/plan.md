

# Fix: "Ces donnees sont exactes" doit ouvrir la suite du formulaire

## Probleme

Quand l'utilisateur clique sur "Ces donnees sont exactes", rien ne se passe car `showValorisationUpdate` est deja `false` (valeur initiale). Le useEffect (ligne 354) ne se re-declenche pas.

De plus, les useEffects en cascade (lignes 368-416) interferent avec le remplissage initial : quand `propertyCategory` est set, le cascade reset `constructionType` si la valeur n'est pas dans le mapping `CATEGORY_TO_CONSTRUCTION_TYPES`, ce qui declenche a son tour le reset de `constructionNature` et `declaredUsage`. Les champs deviennent vides, le bloc Eligibilite ne s'affiche pas, et le bouton "Determiner le titre" reste bloque.

## Solution

### 1. Introduire un etat explicite pour le choix du radio

Remplacer la derivation implicite (`showValorisationUpdate ? 'update' : 'exact'`) par un etat `valorisationChoice` a 3 valeurs : `null` (pas encore choisi), `'exact'`, `'update'`.

- Initial : `null` (aucun radio selectionne)
- Cliquer "Ces donnees sont exactes" → `'exact'`
- Cliquer "Proposer une mise a jour" → `'update'`
- `showValorisationUpdate` devient derive : `valorisationChoice === 'update'`

### 2. Adapter le useEffect d'auto-remplissage

Le useEffect (ligne 354) reagit a `valorisationChoice` au lieu de `showValorisationUpdate`. Quand `valorisationChoice === 'exact'` et `parcelValorisationData` existe, il set les 8 etats. Un flag `skipCascadeRef` (useRef) est active pendant le remplissage pour empecher les useEffects cascade de reset les valeurs.

### 3. Proteger les cascades avec le flag

Les useEffects cascade (lignes 368, 384, 442) verifient `skipCascadeRef.current` avant de reset. Le flag est desactive apres un tick (via setTimeout ou un micro-task).

### Detail technique

```
const [valorisationChoice, setValorisationChoice] = useState<null | 'exact' | 'update'>(null);
const showValorisationUpdate = valorisationChoice === 'update';
const skipCascadeRef = useRef(false);

useEffect(() => {
  if (valorisationChoice === 'exact' && parcelValorisationData) {
    skipCascadeRef.current = true;
    setPropertyCategory(parcelValorisationData.propertyCategory || '');
    setConstructionType(parcelValorisationData.constructionType || '');
    setConstructionNature(parcelValorisationData.constructionNature || '');
    setConstructionMaterials(parcelValorisationData.constructionMaterials || '');
    setDeclaredUsage(parcelValorisationData.declaredUsage || '');
    setStanding(parcelValorisationData.standing || '');
    setFloorNumber(parcelValorisationData.floorNumber || '');
    setConstructionYear(...);
    setTimeout(() => { skipCascadeRef.current = false; }, 0);
  }
}, [valorisationChoice, parcelValorisationData]);
```

Chaque useEffect cascade ajoute en premiere ligne :
```
if (skipCascadeRef.current) return;
```

### 4. Adapter le RadioGroup

```
<RadioGroup
  value={valorisationChoice || ''}
  onValueChange={(val) => setValorisationChoice(val as 'exact' | 'update')}
>
```

Aucun radio n'est pre-selectionne → l'utilisateur doit faire un choix explicite.

### 5. Adapter handleConfirmClose

Ajouter `setValorisationChoice(null)` au reset.

### Fichier modifie
- `src/components/cadastral/LandTitleRequestDialog.tsx`

