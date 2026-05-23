# Correction logique CCC — Terrain nu

## Bug confirmé

Dans `src/hooks/ccc/useFormValidation.ts`, la variable `isTerrainNu` (ligne 49) ne regarde que `constructionType === 'Terrain nu'` :

- Quand l'utilisateur choisit `propertyCategory = 'Terrain nu'`, la cascade (`useConstructionCascade`) auto-sélectionne `constructionType = 'Terrain nu'` (seul élément), mais **n'auto-sélectionne pas** `constructionNature` ni `declaredUsage`.
- Les lignes **86-87** exigent toujours `constructionNature` et `declaredUsage` sans exception → bouton "Suivant" bloqué avec messages erronés "Nature de construction" et "Usage déclaré" requis pour un terrain nu.

## Erreurs de logique similaires repérées

1. **Lignes 86-87** (`useFormValidation.ts`) : nature + usage requis même pour Terrain nu.
2. **Cascade `useConstructionCascade.ts`** : quand `constructionType === 'Terrain nu'`, les natures disponibles se réduisent à `['Non bâti']` mais aucune auto-sélection → l'utilisateur doit cliquer manuellement (mauvaise UX + source du bug ci-dessus).
3. **Cohérence `isTerrainNu`** : plusieurs endroits du fichier mélangent `!isTerrainNu`, `propertyCategory !== 'Terrain nu'` et `constructionType !== 'Terrain nu'` (lignes 114, 145, 235, 248). Harmoniser via un seul flag.
4. **`AdditionalConstructionBlock.tsx`** : utilise déjà `isNotTerrainNu` combiné (ligne 192) ✔, mais le sélecteur d'usage (ligne 296) reste désactivé tant que la nature est vide, même pour Terrain nu. Aligner avec auto-sélection cascade.

## Plan d'action (frontend uniquement)

### P0 — Débloquer "Terrain nu"
**`src/hooks/ccc/useFormValidation.ts`**
- Élargir `isTerrainNu` :
  ```ts
  const isTerrainNu =
    formData.constructionType === 'Terrain nu' ||
    formData.propertyCategory === 'Terrain nu';
  ```
- Conditionner lignes 86-87 par `!isTerrainNu` (comme déjà fait pour `constructionMaterials`, `standing`, `constructionYear`).
- Harmoniser les conditions composites lignes 114, 145, 235, 248 pour utiliser uniquement `isTerrainNu` (supprimer les `propertyCategory !== 'Terrain nu'` / `constructionType !== 'Terrain nu'` redondants).

### P1 — UX cascade (évite que le bug réapparaisse)
**`src/hooks/ccc/useConstructionCascade.ts`**
- Dans l'effet `ConstructionType → Natures` : si `natures.length === 1`, auto-sélectionner (`handleInputChange('constructionNature', natures[0])`). Cas concret : `Terrain nu → Non bâti`.
- Idem dans l'effet `Type+Nature → Usages` : si `usages.length === 1`, auto-sélectionner `declaredUsage`. Cas concret : `Terrain nu / Non bâti → Aucun usage` (ou unique selon picklist).

### P2 — Cohérence AdditionalConstructionBlock
**`src/components/cadastral/AdditionalConstructionBlock.tsx`**
- Appliquer la même auto-sélection locale (lignes 156-178) pour les natures/usages à 1 option.
- Vérifier que le `disabled` ligne 296 ne pénalise pas le cas Terrain nu (devient auto OK après auto-sélection P1).

## Hors scope
- Refonte des picklists serveur.
- Modification des edge functions.
- Refonte de `GeneralTab.tsx` (les conditions d'affichage `propertyCategory !== 'Terrain nu'` y sont déjà correctes).

## Vérification post-implémentation
1. Sélectionner `Catégorie = Terrain nu` → Type auto-rempli `Terrain nu`, Nature auto-remplie `Non bâti`, Usage auto-rempli si unique.
2. Cliquer "Suivant" → passage à l'onglet Localisation sans erreur.
3. Onglet Review : aucune entrée "Nature/Usage" manquante pour Terrain nu.
4. Cas Résidentielle/Durable inchangé (nature + usage toujours requis).
5. Construction supplémentaire avec Terrain nu : même comportement.
