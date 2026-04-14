

# Audit detaille du formulaire CCC

## Bugs identifies

### 1. ReviewTab ne peut pas afficher l'environnement sonore (critique)
**Fichier**: `ReviewTab.tsx` lignes 328-339, `CadastralContributionDialog.tsx` lignes 192-211

Le ReviewTab lit `formData.soundEnvironment` et `formData.nearbySoundSources`, mais ces valeurs ne sont jamais ecrites dans `formData`. Elles sont stockees dans des etats separes (`soundEnvironment`, `nearbySoundSources`) qui ne sont pas passes au ReviewTab. Resultat : la section "Environnement sonore" du recapitulatif est **toujours vide**.

**Correction** : Passer `soundEnvironment` et `nearbySoundSources` comme props distinctes au ReviewTab et les utiliser directement au lieu de `formData.soundEnvironment`.

### 2. `handleClose` ne reinitialise pas l'environnement sonore
**Fichier**: `useCCCFormState.ts` lignes 1033-1067

La fonction `handleClose` reinitialise tous les etats du formulaire sauf `soundEnvironment` et `nearbySoundSources`. Apres fermeture et reouverture du formulaire pour une autre parcelle, les anciennes valeurs sonores persistent.

**Correction** : Ajouter `setSoundEnvironment(''); setNearbySoundSources('');` dans `handleClose`.

### 3. Erreur runtime Leaflet `_leaflet_pos`
**Fichier**: `CadastralMap.tsx` ligne 519

`map.setView()` est appele sur une carte dont le container DOM a ete detruit. Cela produit l'erreur `Cannot read properties of undefined (reading '_leaflet_pos')`. Il faut verifier `map._container` et `map._loaded` avant d'appeler `setView`.

### 4. Score CCC ne comptabilise pas l'environnement sonore
**Fichier**: `useCCCFormState.ts` lignes 806-877

Le `calculateCCCValue` ne prend pas en compte `soundEnvironment` ni `nearbySoundSources`, alors qu'ils sont obligatoires. Le score devrait inclure 1 point pour l'environnement sonore et 1 point bonus si les sources de bruit sont renseignees.

**Correction** : Ajouter `totalFields += 1; if (soundEnvironment) filledFields += 1;` et un bonus conditionnel pour les sources de bruit.

## Problemes de logique

### 5. `isOnSite` non persiste dans localStorage
**Fichier**: `LocationTab.tsx` ligne 626

L'etat `isOnSite` est un `useState` local au composant `SoundEnvironmentBlock`. Si l'utilisateur navigue vers un autre onglet et revient, il perd son choix et doit re-repondre "Etes-vous sur la parcelle ?". Ce n'est pas sauvegarde dans `saveFormDataToStorage`.

**Correction** : Remonter `isOnSite` dans `useCCCFormState` et l'inclure dans la sauvegarde localStorage.

### 6. Le chargement depuis la DB ne restaure pas l'environnement sonore (mode edition)
**Fichier**: `useCCCFormState.ts` lignes 1088-1195 (bloc `fetchContribution`)

En mode edition (`editingContributionId`), les champs `sound_environment` et `nearby_noise_sources` de la contribution existante ne sont jamais restaures dans les etats `soundEnvironment` / `nearbySoundSources`.

**Correction** : Ajouter apres la restauration des `buildingShapes` :
```
if (contrib.sound_environment) setSoundEnvironment(contrib.sound_environment);
if (contrib.nearby_noise_sources) setNearbySoundSources(contrib.nearby_noise_sources);
```

### 7. Decompte `calculateCCCValue` : les `totalFields` sont fragiles
Le nombre de `totalFields` est incremente par blocs (14, 3, 7, 1, 2, 2, 3, 1, 1 = 34 de base), mais certaines branches ajoutent dynamiquement (`leaseType`, `previousPermitNumber`), rendant le denominator imprevisible. Pas un bug bloquant, mais rend le score difficile a auditer.

## Redondances / Optimisations

### 8. Multiples `useState` de warning avec pattern identique
Les paires `showXWarning` / `highlightIncompleteX` (6 paires, 12 etats) suivent toutes le meme pattern `setTimeout` de 3-5s. Cela pourrait etre factorise dans un hook `useTimedWarning()`.

### 9. MATERIALS_BY_NATURE_FALLBACK duplique les picklists
**Fichier**: `useCCCFormState.ts` lignes 1331-1340

`MATERIALS_BY_NATURE_FALLBACK` et `STANDING_BY_NATURE_FALLBACK` dupliquent les valeurs de `CCC_STATIC_PICKLIST_REGISTRY` dans `useCCCFormPicklists.tsx`. Ils devraient etre importes de la source unique.

## Resume des corrections

| # | Severite | Fichier(s) | Action |
|---|----------|-----------|--------|
| 1 | Critique | ReviewTab.tsx, CadastralContributionDialog.tsx | Passer sound props au ReviewTab |
| 2 | Majeur | useCCCFormState.ts (handleClose) | Reset sound states |
| 3 | Majeur | CadastralMap.tsx | Guard map.setView() |
| 4 | Moyen | useCCCFormState.ts (calculateCCCValue) | Ajouter scoring sonore |
| 5 | Moyen | LocationTab.tsx, useCCCFormState.ts | Persister isOnSite |
| 6 | Majeur | useCCCFormState.ts (fetchContribution) | Restaurer sound en edition |
| 7 | Info | useCCCFormState.ts | Documentation |
| 8 | Info | useCCCFormState.ts | Factorisation optionnelle |
| 9 | Mineur | useCCCFormState.ts | Supprimer duplication fallbacks |

### Fichiers impactes
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx`
- `src/components/cadastral/CadastralContributionDialog.tsx`
- `src/hooks/useCCCFormState.ts`
- `src/pages/CadastralMap.tsx`
- `src/components/cadastral/ccc-tabs/LocationTab.tsx`

