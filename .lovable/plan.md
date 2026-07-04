# Rollback Storage granulaire — Onglet Valeur (CCC)

## Objectif
Chaque fois qu'une image (annonce vente, annonce location, rapport d'expertise) est retirée de l'onglet Valeur — via la croix, un remplacement, un décochage `listForRent`, un `wouldSell=false`, ou un vidage du champ rapport — le fichier correspondant doit être supprimé du bucket `cadastral-documents`. En parallèle, chaque upload doit être suivi pour rollback global en cas d'échec de soumission (déjà en place pour les autres onglets).

## Comportement actuel
- `StorageFileUpload.onChange(url, path)` expose déjà le path Storage, mais `MarketValueTab` ignore le 2e argument.
- Les suppressions UI (croix, purge `listForRent=false`, purge `wouldSell=false`, effacement `appraisalReportUrl`) ne font que filtrer le state → fichier orphelin garanti.
- `useFormPersistence` expose déjà `trackUploadedPath` et `rollbackUploadedFiles` (bucket `cadastral-documents`), consommés par les autres onglets mais pas par MarketValueTab.

## Changements

### 1. `useFormPersistence.ts` — nouveau `removeUploadedPath`
Ajouter une méthode publique :
```ts
removeUploadedPath: (path: string) => Promise<void>
```
- Retire `path` du tracker (`submitUploadedPathsRef.current`) si présent.
- Best-effort `supabase.storage.from('cadastral-documents').remove([path])`, silencieux en cas d'erreur (log console).
- Exposée dans `UseFormPersistenceResult`.

### 2. `useCCCFormState.ts` — propagation
Ajouter `removeUploadedPath` à la destructuration de `useFormPersistence` et au retour du hook (à côté de `trackUploadedPath`).

### 3. `CadastralContributionDialog.tsx` — props
Récupérer `trackUploadedPath` et `removeUploadedPath` depuis `useCCCFormState`, les passer à `<MarketValueTab>`.

### 4. `MarketValueTab.tsx` — utilisation
- Ajouter deux props : `trackUploadedPath?: (p: string) => void`, `removeUploadedPath?: (p: string) => Promise<void>`.
- Helper local `pathFromPublicUrl(url)` : extrait `<prefix>/<uuid>.<ext>` à partir de `.../storage/v1/object/public/cadastral-documents/<path>`. Retourne `null` si non reconnu (pas de suppression → aucune régression si des URL héritées ne matchent pas).
- Nouveau helper local `dropImage(url)` : `const p = pathFromPublicUrl(url); if (p) void removeUploadedPath?.(p);`
- Wiring dans les 3 uploaders :
  - **Vente** (`updateSale` bloc) : `onChange={(url, path) => { … if (path) trackUploadedPath?.(path); … }}`
  - **Location par unité** (`updateListing` bloc) : idem.
  - **Rapport d'expertise** (`appraisalReportUrl` `StorageFileUpload`) : au changement, si l'ancienne URL existait et diffère (ou devient nulle), appeler `dropImage(oldUrl)` ; tracker le nouveau path.
- Wiring des suppressions :
  - Croix image (vente + location) : appeler `dropImage(url)` avant `updateSale/updateListing`.
  - `setWouldSell(false)` : après purge, `saleImages.forEach(dropImage)`.
  - Case `listForRent` décochée : `oldEntry.coverImageUrls?.forEach(dropImage)` avant reset.
  - Effacement `appraisalReportUrl` (fenêtre 6 mois hors bornes ou décochage `hasRecentAppraisal`) : `dropImage(oldReportUrl)`.

### 5. Hors périmètre
- Pas de changement de schéma DB, ni de bucket.
- Pas de refactor du `StorageFileUpload` (déjà compatible).
- Pas d'ajout d'analytics.
- Les autres onglets (déjà audités) ne sont pas touchés.

## Détails techniques
- `pathFromPublicUrl` : `const marker = '/storage/v1/object/public/cadastral-documents/'; const i = url.indexOf(marker); return i === -1 ? null : url.slice(i + marker.length).split('?')[0];`
- Suppressions best-effort : jamais bloquantes, jamais de toast d'erreur (comportement `rollbackUploadedFiles` déjà en place).
- Idempotent : `remove()` sur path déjà supprimé n'échoue pas (Supabase renvoie 200 vide).

## Fichiers touchés
- `src/hooks/ccc/useFormPersistence.ts`
- `src/hooks/useCCCFormState.ts`
- `src/components/cadastral/CadastralContributionDialog.tsx`
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx`
