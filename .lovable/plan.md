## Audit — Dropdown Actions → "Demande de lotissement"

Périmètre : `SubdivisionRequestDialog.tsx` + `subdivision/hooks/useSubdivisionForm.ts` + steps + edge `subdivision-request`.

### 🔴 Bugs bloquants

**B1. `computeFee` n'est JAMAIS appelé** — `useSubdivisionForm.ts:73`
- La callback est définie mais aucun `useEffect` ne l'invoque sur `[lots, roads, parentParcel, metricFrame]`.
- Conséquence : `submissionFee` reste `null`, `loadingFee` reste `true` (init), le bouton final est **toujours désactivé** (`disabled={... || form.loadingFee || ...}`), le label affiche `… USD`, `StepSummary` n'a aucun breakdown. **Soumission impossible côté UI.**

**B2. Edge `subdivision-request` rejette Personne morale / État**
- Ligne 99 : `if (!body.requester?.firstName || !body.requester?.lastName || !body.requester?.phone) throw`.
- Pour "Personne morale", le front laisse `firstName` vide (raison sociale dans `lastName`) ; pour "État", les deux peuvent être vides → 400 systématique. Le client `isStepValid('parcel')` ne réclame pourtant que `lastName` pour PM.

**B3. `isStepValid('documents')` hardcodé** — `useSubdivisionForm.ts:509-512`
- Vérifie en dur `requester_id_document_url` + `proof_of_ownership_url`, ignorant la config admin (`useSubdivisionRequiredDocuments(requesterType)`).
- Si admin ajoute un doc obligatoire → non bloquant côté UI (faux positif). S'il retire `proof_of_ownership` → utilisateur bloqué sans pouvoir uploader (faux négatif).

### 🟠 Bugs mineurs / logique

**B4. Bascule auto vers `zoning`** (`useSubdivisionForm.ts:530-539`) : mutation du ref hors render fonctionne mais la condition `currentStep === 'parcel'` ne couvre pas le cas où la règle est chargée après navigation vers `designer` (l'onglet apparaît mais l'utilisateur n'y est pas redirigé — acceptable, à documenter).

**B5. Auto-fill identité** (l. 51) ré-écrit dès qu'un champ devient vide — combiné au brouillon localStorage scopé par user, OK, mais l'effet se ré-exécute à chaque changement de `authUser` (rare). Ajouter un guard `runOnce` par user.id.

**B6. Idempotency-Key** régénéré à chaque ouverture du dialog (ref locale) → un user qui ferme/réouvre crée 2 demandes distinctes en cas de double clic. Persister la clé tant que le brouillon n'est pas effacé.

### 🟡 Code mort / orphelins exposés et jamais consommés

Dans `useSubdivisionForm` return :
- `setLotsRaw`, `setSkipHistory`, `handleAutoSubdivide`, `setParentParcel`, `createdRequestId`, `historyVersion`, `updateLot`, `deleteLot`, `runValidation` → aucun consommateur externe (les steps réimplémentent localement `deleteLot` sans la garde `isParentBoundary`, ce qui est aussi un risque).
- `metricFrame` exposé mais `StepLotDesigner` recalcule le sien (l. 138) → duplication.

Dans `SubdivisionRequestDialog.tsx` :
- Imports inutiles : `Badge` (l.5), `inferSectionType` (l.22).

Arborescence :
- `subdivision/hooks/__tests__/` **vide**.
- `subdivision/utils/convertZoneType.ts` (212 LOC) : vérifier les références (paraît utilisé par `useZoningCompliance` — à confirmer pendant l'implémentation).

### 🟡 Redondances

- `REQUESTER_TYPE_LABELS` redéfini dans `StepSummary` ET `admin/subdivision/requests/types.ts` (constante partagée à créer).
- Calcul `feeLabel`/`feeAmount` dupliqué Dialog (l.142) + StepSummary (l.46).
- `ALL_STEP_CONFIG` (Dialog) vs `steps[]` (form) : deux sources de vérité pour la liste des étapes ; le filtre `.filter(s => form.steps.includes(s.key))` masque la dérive mais la rend fragile.
- Fallback fee (`10 * lots.length`) dupliqué front (l.116/149) et edge (`_shared/subdivisionFees.ts`) — laisser, mais commenter le couplage.

### ✅ Orphelins pertinents à garder (mais à brancher)

- `metricFrame` exposé : à consommer par `StepLotDesigner` (supprimer le calcul local).
- `runValidation` : à brancher sur un bouton "Revalider" du panneau validation OU à supprimer.
- `setParentParcel` : utile uniquement si on ajoute un mode override admin → supprimer pour l'instant.

---

## Plan de correction (ordonné par priorité)

### P0 — Débloquer la soumission
1. **Brancher `computeFee`** dans `useSubdivisionForm.ts` via `useEffect([lots, roads, metricFrame, parentParcel, parcelData])` avec debounce 300 ms. Initialiser `loadingFee=false` quand `lots.length===0`.
2. **Edge `subdivision-request`** : assouplir la validation `requester` selon `legalStatus` :
   - `Personne physique` → `firstName + lastName + phone`
   - `Personne morale` → `lastName (raison sociale) + rccmNumber + phone`
   - `État` → `rightType + stateExploitedBy + phone`
3. **Aligner `isStepValid('documents')`** sur `useSubdivisionRequiredDocuments(requesterType)` (passer la liste au hook ou exposer un helper `areRequiredDocsUploaded(documents, requesterType)`). Idem `case 'summary'`.

### P1 — Hardening
4. **Idempotency-Key persistant** : stocker dans le brouillon (`localStorage`), régénérer uniquement après `clearDraft()` ou submission réussie.
5. **Auto-fill identité** : guard `lastAutoFillUserIdRef` pour ne s'exécuter qu'une fois par `authUser.id`.
6. **Mémoriser `metricFrame` au niveau du form** comme unique source ; `StepLotDesigner` reçoit `metricFrame` en prop (supprimer le `useMemo` local).

### P2 — Nettoyage code mort / redondances
7. Retirer du `return` de `useSubdivisionForm` : `setLotsRaw`, `setSkipHistory`, `handleAutoSubdivide`, `setParentParcel`, `createdRequestId`, `historyVersion`, `updateLot`, `runValidation` (s'il n'est pas branché à un bouton). Conserver `deleteLot` et brancher `StepLotDesigner` dessus pour bénéficier de la garde `isParentBoundary` (supprimer le `deleteLot` local).
8. `SubdivisionRequestDialog` : supprimer imports `Badge`, `inferSectionType`.
9. Extraire `REQUESTER_TYPE_LABELS` dans `subdivision/constants.ts` ; réutiliser depuis `StepSummary` et admin.
10. Centraliser `feeLabel` dans un helper `formatFee(fee, loading)` partagé Dialog/StepSummary.
11. Supprimer le dossier vide `hooks/__tests__/`.

### P3 — UX
12. Toast explicite lorsque l'edge renvoie `loadingFee=true` au moment du clic (rare en cas de course).
13. Sur fallback Stripe (`markSubmittedFallback`), ajouter bouton "Aller au tableau de bord" pointant sur la demande créée (`/dashboard?tab=subdivisions&id=${createdRequestId}`) — réutilise `createdRequestId` (qui justifie de le garder dans le return).

### Détails techniques

- `computeFee` debounce : `useEffect` + `setTimeout(300)` + cleanup ; ne pas inclure `submissionFee` dans deps.
- Edge validation : utiliser un `switch (body.requester.legalStatus)` avec messages typés (`code: 'REQUESTER_INVALID'`) pour que le front (déjà capable de lire `err.code`) bascule sur l'étape `parcel`.
- `areRequiredDocsUploaded` : signature `(documents, requesterType) => boolean` qui appelle un sélecteur Supabase mémorisé via React Query (le hook actuel utilise probablement `useState` — réutiliser tel quel via `useSubdivisionRequiredDocuments`, mais comme `isStepValid` est sync, exposer aussi `requiredDocs` depuis `useSubdivisionForm` en intégrant le hook).
- Idempotency-Key : ajouter `idempotencyKey` au JSON sauvegardé dans `localStorage`, restaurer dans le `useRef` au mount.

### Hors scope
- Refonte canvas (`LotCanvas` 1755 LOC) — déjà couvert par la mémoire `subdivision-lot-designer-modularization`.
- Logique tarif côté edge (déjà auditée P0-P3 sub précédents).

Tâches de vérification post-implémentation : créer un brouillon avec 3 lots → vérifier que `submissionFee` apparaît dans `StepSummary`, que le bouton "Payer & soumettre (X.XX$)" devient cliquable, qu'une PM (RCCM saisi, firstName vide) passe l'edge, qu'ajouter/retirer un doc admin met à jour `isStepValid('documents')`.
