# Ajouter le champ "Nationalité" au bloc Propriétaire actuel (formulaire CCC)

## Résumé

Ajouter un champ radio "Nationalité" (Congolais (RD) / Étranger) après "Propriétaire depuis" dans le bloc propriétaire actuel de l'onglet Infos. Le champ est obligatoire pour avancer dans le formulaire. La valeur est stockée dans le JSONB `current_owners_details` — aucune migration DB nécessaire.

## Modifications

### 1. `src/components/cadastral/ccc-tabs/GeneralTab.tsx`

**Interface `CurrentOwner**` (ligne 22-36) : ajouter `nationality: string` au type.

**UI** : Après le bloc "Propriétaire depuis" (après ligne 629), insérer un `RadioGroup` avec deux options :

- `Congolais (RD)`
- `Étranger`

Avec label "Nationalité" + indicateur obligatoire (`*`), et highlight destructive si `highlightRequiredFields && !owner.nationality`.

Le champ est visible pour tous les statuts juridiques (Personne physique, Personne morale, État).

### 2. `src/hooks/useCCCFormState.ts`

**Valeur par défaut** (lignes 1063, 393) : ajouter `nationality: ''` dans les initialisations de `CurrentOwner`.

**Restauration** (ligne 1151) : ajouter `nationality: o.nationality || ''` dans le mapping de restauration depuis DB/localStorage.

**Validation** (après ligne 634) : ajouter :

```ts
if (!firstOwner?.nationality) missing.push({ field: 'ownerNationality', label: 'Nationalité du propriétaire', tab: 'general' });
```

**CCC Value** (optionnel, léger) : incrémenter `totalFields += 1` et compter si `nationality` est rempli.

### 3. Aucune migration DB

La nationalité est stockée dans le champ JSONB `current_owners_details` qui sérialise déjà tous les attributs de `CurrentOwner`. Le champ sera automatiquement persisté et restauré.

### Fichiers modifiés (2)

- `src/components/cadastral/ccc-tabs/GeneralTab.tsx`
- `src/hooks/useCCCFormState.ts`