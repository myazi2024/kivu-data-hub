

## Audit — Service « Demander un lotissement » (post-fixes P0)

État global : **les P0 critiques précédents sont résolus** (edge function sécurisée, paiement Stripe branché, `parcel_id` inséré, debounce, documents obligatoires). Mais **5 nouveaux bugs** ont été introduits par les fixes, dont **1 bloquant** sur l'accès aux documents.

---

### 🔴 P0 — Bug bloquant (régression)

#### 1. Documents inaccessibles aux admins — `getPublicUrl` sur bucket privé
`StepDocuments.tsx:83` appelle `supabase.storage.from('cadastral-documents').getPublicUrl(path)` et stocke l'URL résultante en DB. Or le bucket `cadastral-documents` est **privé** (`public=false` confirmé en DB). Conséquence : les liens stockés dans `requester_id_document_url` / `proof_of_ownership_url` retournent **403** à l'ouverture. Les admins ne pourront pas consulter les pièces pour examiner la demande → workflow d'approbation cassé.

**Correction** : stocker le `path` (pas l'URL) en DB et générer des signed URLs à la lecture côté admin (pattern déjà utilisé pour les autres services cadastraux). Migration légère : adapter `StepDocuments` pour stocker `path` et la vue admin pour appeler `createSignedUrl(path, 3600)` à la demande.

---

### 🟠 P1 — Cohérences & incohérences UX

#### 2. Détection rural/urbain cassée dans l'edge function
`subdivision-request/index.ts:67` fait `parent_parcel.location.toLowerCase().includes("village")`. Or côté client la `location` est construite par `[commune, quartier, avenue].filter(Boolean).join(', ')` — le mot « village » n'y figure jamais. Tous les calculs basculent en `urban` même pour les parcelles rurales → tarif erroné.

**Correction** : passer `section_type` explicite depuis le client (déjà calculé dans `computeFee`) ou détecter via présence de `quartier` vs `village` (champ séparé qu'il faut transmettre dans `parent_parcel`).

#### 3. Affichage tarif `?? 20` partout — incohérent avec l'edge
- `SubdivisionRequestDialog:109` : `feeLabel = ... ${form.submissionFee ?? 20}$`
- `StepSummary:42` : `feeAmount = submissionFee ?? 20`
- Edge fallback : `Math.max(10, lots.length * 10)`

L'utilisateur peut voir « 20$ » et être facturé 30$ (3 lots × 10). 

**Correction** : ne pas afficher de fallback ; si `loadingFee=true`, afficher un spinner et désactiver le bouton (déjà fait pour le bouton, à compléter pour les labels).

#### 4. Écran « Demande soumise avec succès » = code mort
`StepSummary` lignes 44-82 affichent un écran de succès quand `submitted=true`. Mais le flow réel fait `window.location.href = payment.url` immédiatement après `setSubmitted(true)` → l'utilisateur voit Stripe, jamais l'écran de succès. À l'inverse si Stripe échoue, on affiche un toast d'erreur sans état de succès.

**Correction** : soit supprimer le bloc `submitted`, soit le réserver au cas « paiement indisponible » (afficher la référence + lien tableau de bord).

#### 5. Type `SubdivisionDocuments` dupliqué
Défini à la fois dans `useSubdivisionForm.ts:13-17` et `StepDocuments.tsx:11-15`. Risque de divergence si un champ change.

**Correction** : déplacer le type vers `subdivision/types.ts` et l'importer aux deux endroits.

---

### 🟡 P2 — Dette persistante

#### 6. Approbation admin non-atomique (déjà identifié)
`AdminSubdivisionRequests.saveApprovedLots` (lignes 178-214) insère les lots un à un côté client après l'UPDATE du statut. Si un insert échoue à mi-parcours : statut `approved` mais lots partiellement créés. **Aucun rollback possible.** + viole `atomic-cross-table-updates-fr`.

**Correction recommandée** : nouvelle edge function `approve-subdivision` (SERVICE_ROLE, transactionnelle) qui fait UPDATE statut + INSERT lots + UPDATE `cadastral_parcels.is_subdivided` en une seule transaction.

#### 7. Modularisation toujours hors-norme
- `StepLotDesigner.tsx` : 1246 LOC
- `LotCanvas.tsx` : 1711 LOC

→ Extraire helpers géométriques vers `subdivision/utils/geometry.ts`, splitter `LotCanvas` par mode (vertex/edge/lot/road).

#### 8. Notifications hors helper standard (déjà identifié)
Edge `subdivision-request` insère directement dans `notifications` au lieu d'utiliser `notificationHelper`.

---

### ✅ Vérifications cross-fonctionnelles — RAS

| Vérification | État |
|---|---|
| Edge `subdivision-request` calcule fee côté serveur | ✅ |
| `parcel_id` correctement transmis hook → edge → insert | ✅ |
| `reference_number` généré dans l'edge (plus de risque NOT NULL) | ✅ |
| Documents obligatoires bloquent `isStepValid('documents')` | ✅ |
| Debounce 400ms sur `computeFee` | ✅ |
| `create-payment` reconnaît `subdivision_request` (lignes 13, 222-249) | ✅ |
| Success/cancel URLs configurées (`/cadastral-map?payment=…`) | ✅ |
| Brouillon localStorage + undo/redo + validation géométrique | ✅ |

---

### Plan d'action proposé (par priorité)

| # | Action | Fichier(s) | Impact |
|---|---|---|---|
| **P0** | Stocker `path` au lieu d'`URL publique` + signed URLs côté admin | `StepDocuments.tsx`, `useSubdivisionForm.ts`, `AdminSubdivisionRequests.tsx` | **Bloquant** examen admin |
| P1 | Passer `section_type` explicite à l'edge (calcul rural/urban côté client) | `useSubdivisionForm.ts`, `subdivision-request/index.ts` | Tarification correcte |
| P1 | Supprimer fallbacks `?? 20` ; bloquer affichage tant que `loadingFee` | `SubdivisionRequestDialog.tsx`, `StepSummary.tsx` | Cohérence facturation |
| P1 | Supprimer ou refondre l'écran « submitted » dans `StepSummary` | `StepSummary.tsx`, `useSubdivisionForm.ts` | Code mort / fallback paiement |
| P1 | Déduplication type `SubdivisionDocuments` → `subdivision/types.ts` | `types.ts`, `useSubdivisionForm.ts`, `StepDocuments.tsx` | Maintenance |
| P2 | Edge `approve-subdivision` atomique (UPDATE + INSERT lots + flag parcelle) | nouvelle edge + `AdminSubdivisionRequests.tsx` | Intégrité données |
| P2 | Migrer notifications vers `notificationHelper.createNotification` | `subdivision-request/index.ts` | Standardisation |
| P2 | Extraire utils géométriques + splitter `LotCanvas` par mode | `LotCanvas.tsx`, `StepLotDesigner.tsx`, `utils/geometry.ts` | Maintenance |

### Décisions à confirmer

1. **Pour les pièces jointes** : signed URLs courte durée (1h) à la demande côté admin, OU bucket public dédié ? Recommandation : signed URLs (cohérent `storage-and-audit-hardening-fr`).
2. **Pour `approve-subdivision`** : on inclut l'edge function dans cette passe de fix, ou on la traite séparément vu qu'elle touche aussi `AdminSubdivisionRequests` ? Recommandation : à inclure (gain d'atomicité immédiat).
3. **Pour l'écran « submitted »** : suppression pure, ou conservation comme fallback si Stripe indisponible ? Recommandation : conservation comme fallback.

