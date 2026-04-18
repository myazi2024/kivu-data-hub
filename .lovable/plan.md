
## Étape 2/4 — Extraction de `useFormPersistence`

### Objectif
Extraire toute la logique de persistance localStorage + tracking des fichiers uploadés du hook monolithique vers `src/hooks/ccc/useFormPersistence.ts`. Aucune modification du comportement observable, contrat de retour identique.

### Périmètre extrait
Depuis `src/hooks/useCCCFormState.ts` :
- Constantes `STORAGE_KEY`, `STORAGE_SCHEMA_VERSION`
- `useEffect` de **chargement** initial du brouillon (`loadVersioned`) avec gestion `expired` / `schema_mismatch` / `parse_error` (toast utilisateur)
- `useEffect` de **sauvegarde debounced** (1 500 ms) via `saveVersioned` sur changement de `formData` + slices liés
- `submitUploadedPathsRef` (tracking des chemins Storage uploadés pendant la session)
- `trackUploadedPath(path)` — ajoute un chemin au ref
- `rollbackUploadedFiles()` — supprime les fichiers du bucket en cas d'échec submit
- `clearDraft()` — purge localStorage après submit réussi ou abandon explicite
- `hasRestoredDraft` (flag exposé pour bandeau "Brouillon restauré")

### Signature du nouveau hook

```ts
// src/hooks/ccc/useFormPersistence.ts
export function useFormPersistence(params: {
  user: User | null;
  formData: CCCFormData;
  currentOwners: Owner[];
  previousOwners: Owner[];
  parcelSides: ParcelSide[];
  gpsCoordinates: GPSCoord[];
  buildingShapes: BuildingShape[];
  // ... autres slices à persister
  setFormData: (d: CCCFormData) => void;
  setCurrentOwners: (o: Owner[]) => void;
  // ... autres setters pour restore
}): {
  hasRestoredDraft: boolean;
  trackUploadedPath: (path: string) => void;
  rollbackUploadedFiles: () => Promise<void>;
  clearDraft: () => void;
}
```

### Garanties non-régression
- Mêmes clés localStorage (`STORAGE_KEY`, `STORAGE_SCHEMA_VERSION` inchangés).
- Même délai de debounce (1 500 ms).
- Mêmes toasts (texte identique, mêmes variants).
- `rollbackUploadedFiles` reste appelé depuis le `catch` de `handleSubmit` dans l'orchestrateur.
- `clearDraft` reste appelé après submit réussi et dans `handleClose` si l'utilisateur confirme l'abandon.

### Plan d'exécution
1. Créer `src/hooks/ccc/useFormPersistence.ts` avec la signature ci-dessus.
2. Déplacer le `useEffect` de chargement (premier mount, dépend de `user`).
3. Déplacer le `useEffect` de sauvegarde debounced (clearTimeout sur cleanup).
4. Déplacer `submitUploadedPathsRef`, `trackUploadedPath`, `rollbackUploadedFiles` (utilise `supabase.storage.from(...).remove()`).
5. Déplacer `clearDraft`.
6. Dans `useCCCFormState.ts` : remplacer le code extrait par `const { hasRestoredDraft, trackUploadedPath, rollbackUploadedFiles, clearDraft } = useFormPersistence({ ... })`.
7. Vérifier que `handleSubmit`, `handleClose`, et les composants d'upload utilisent toujours `trackUploadedPath` / `rollbackUploadedFiles` / `clearDraft` exposés via le contrat de retour de `useCCCFormState`.

### Validation post-implémentation
- TypeScript compile sans erreur.
- Le contrat de retour public de `useCCCFormState` reste strictement identique (mêmes noms, mêmes types).
- Test manuel rapide après déploiement : recharger le formulaire en cours de saisie → brouillon restauré, soumettre → brouillon purgé.

### Note runtime error
"Map container is already initialized" est une erreur connue de `ParcelMapPreview` (mapbox réinitialisation), **non liée** à cette extraction. À traiter séparément si demandé.

### Fichiers
- **Créé** : `src/hooks/ccc/useFormPersistence.ts` (~200 l)
- **Modifié** : `src/hooks/useCCCFormState.ts` (suppression du bloc persistance, ajout de l'appel au sous-hook)
- **Inchangés** : 5 onglets, `CadastralContributionDialog`, `useCadastralContribution`, tous les composants d'upload
