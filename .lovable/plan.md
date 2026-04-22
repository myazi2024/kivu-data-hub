

## Audit — Service « Demander un lotissement »

État global : **fonctionnel mais avec dette technique critique** sur la sécurité paiement, l'intégrité référentielle et la modularisation. Le formulaire 4 étapes (parcelle → designer → plan → récap) fonctionne et le brouillon localStorage + undo/redo sont bien implémentés. **3 bugs bloquants identifiés.**

---

### 🔴 P0 — Bugs bloquants

#### 1. Violation du pattern de soumission sécurisée (Core rule)
`useSubdivisionForm.submit()` fait un `supabase.from('subdivision_requests').insert(...)` **directement depuis le client**. La règle Core (memory `payment/pattern-soumission-securisee-fr`) impose que tous les services payants passent par une edge function avec `SERVICE_ROLE_KEY`. Mutation, Expertise, Titre Foncier le font déjà — Lotissement est le seul service hors-pattern.

**Conséquences** :
- Le client peut forger `submission_fee_usd`, `total_amount_usd`, `status='approved'`.
- RLS `Users can create their own subdivision requests` autorise l'insert mais ne protège pas les montants.

#### 2. Workflow de paiement absent
`submit()` insère avec `submission_payment_status: 'pending'` puis affiche « Demande soumise avec succès » sans **aucune redirection vers Stripe/MoMo**. Comparé à `useLandTitleRequest` ou `useMutationRequest` qui invoquent une edge `*-payment` puis redirigent.

**Preuve DB** : sur 26 demandes existantes, **5 sont `approved` avec `submission_payment_status='pending'`** et 5 `rejected pending`. La passerelle de paiement n'est jamais déclenchée.

#### 3. `parcel_id` jamais inséré → orphelins + rollback test cassé
Le dialogue reçoit la prop `parcelId` (ligne 21 de `SubdivisionRequestDialog.tsx`), la passe au hook **mais le hook ne l'insère pas dans la table**. Or :
- La colonne `parcel_id uuid NULLABLE` existe dans `subdivision_requests`.
- Le rollback du Mode Test (`generators/rollback.ts:32`) fait `DELETE WHERE parcel_id IN (...)` → **les demandes test ne seront jamais purgées par cette passe** (seulement par le fallback `reference_number ILIKE 'TEST-SUB-%'`).
- Cross-link parcelle ↔ lotissement impossible côté admin.

#### 4. Risque schéma — `reference_number NOT NULL`
La table impose `reference_number NOT NULL` mais l'insert ne fournit pas la colonne (générée après via UPDATE). Si la DB n'a pas de DEFAULT (à vérifier — pas vu dans le schéma extrait), l'insert plante en prod. À ce jour ça passe peut-être grâce à un trigger ou un DEFAULT non listé — à confirmer pendant le fix.

---

### 🟠 P1 — Cohérence & sécurité

#### 5. Pièces jointes obligatoires absentes du formulaire
Colonnes présentes en DB mais aucun champ UI :
- `requester_id_document_url` (CNI demandeur)
- `proof_of_ownership_url` (titre / preuve propriété)
- `subdivision_sketch_url` (croquis annexe)
- `additional_documents` jsonb

Le formulaire devrait imposer au minimum CNI + preuve de propriété (cohérent avec Mutation/Titre Foncier).

#### 6. Tarif fallback incohérent
- Code fallback : `setSubmissionFee(20)` quand aucun rate trouvé.
- DB rates par défaut : `urban=0.5$/m² min 10`, `rural=0.3$/m² min 5`.
- Le 20$ ne correspond à rien de configuré → utiliser plutôt `min_fee_per_lot_usd × number_of_lots` ou lever une erreur.

#### 7. Fee recompute non-debounced
`useEffect([lots]) → computeFee()` déclenche un appel Supabase à **chaque drag de sommet** dans le canvas (potentiellement plusieurs fois par seconde). À debouncer (300-500ms) ou à mémoïser sur `lots.length` + somme des aires arrondies.

---

### 🟡 P2 — Dette technique & qualité

#### 8. Violation Core rule « Dialogs > 1000 lines »
- `StepLotDesigner.tsx` : **1246 LOC** (avec convexHull, lineSegmentIntersection, etc.)
- `LotCanvas.tsx` : **1711 LOC**

→ Extraire utils géométriques vers `subdivision/utils/`, modes canvas vers sous-composants.

#### 9. Typage relâché — `as any` pervasif
- `parcelData?: any` dans plusieurs interfaces
- `supabase.from('subdivision_requests' as any)` car table absente de `types.ts`
- `(c: any) => ({ lat: c.lat, lng: c.lng })` sur les GPS coordinates
- `subdivision_rate_config as any`

→ Régénérer les types Supabase ou typer manuellement `SubdivisionRequestRow`.

#### 10. Workflow d'approbation admin non-atomique
`AdminSubdivisionRequests.handleStatusUpdate()` fait un simple UPDATE du statut. À l'approbation, **aucune création automatique** des `subdivision_lots` / `subdivision_roads` à partir de `lots_data` jsonb (seul le générateur de mode test fait cette explosion). Conséquence : `LotCanvas` admin n'a rien à afficher pour les vraies demandes approuvées.

#### 11. Notifications hors helper standard
Insert direct dans `notifications` au lieu d'utiliser `notificationHelper.createNotification()` (rule mémoire `architecture/notification-system-standardization`).

---

### ✅ Ce qui fonctionne bien

| Élément | État |
|---|---|
| Brouillon localStorage auto-save + restore | ✅ |
| Undo/redo via historyRef pattern | ✅ Conforme `canvas-history-ref-pattern-fr` |
| Validation géométrique (snap, polygon area, validateSubdivision) | ✅ |
| FormIntroDialog + WhatsAppFloatingButton | ✅ Cohérent autres services |
| RLS subdivision_requests (admin/owner/pending guard) | ✅ |
| Fee dynamique par localisation + section_type | ✅ Bonne logique |
| Calcul fee côté client cohérent avec rate config (min/max/round) | ✅ |
| Generator test mode + rollback fallback `TEST-SUB-%` | ✅ |

---

### Plan d'action proposé (par priorité)

| # | Action | Fichier(s) principal(aux) | Impact |
|---|---|---|---|
| P0 | Créer edge function `subdivision-payment` (insert avec SERVICE_ROLE + génère `reference_number` + retourne `checkout_url`) | nouvelle `supabase/functions/subdivision-payment/index.ts` + `useSubdivisionForm.submit` | **Critique** sécurité |
| P0 | Inclure `parcel_id` dans l'insert (passer prop → hook → payload) | `useSubdivisionForm.ts`, `SubdivisionRequestDialog.tsx` | Haut (rollback test + cross-link) |
| P0 | Brancher redirection Stripe/MoMo après création (réutiliser `pattern-soumission-securisee-fr`) | `useSubdivisionForm.submit`, `StepSummary` | Critique (revenue leak) |
| P1 | Ajouter étape « Pièces jointes » (CNI demandeur + preuve propriété + croquis optionnel) | nouveau `StepDocuments.tsx` + extension du STEP_CONFIG | Moyen |
| P1 | Remplacer fallback 20$ par calcul `min_fee × number_of_lots` | `useSubdivisionForm.computeFee` | Moyen |
| P1 | Debounce 400ms sur `computeFee` | `useSubdivisionForm` | Moyen |
| P2 | Extraire helpers géométriques de `StepLotDesigner` vers `utils/geometry.ts` (convexHull, lineSegmentIntersection) | `StepLotDesigner.tsx`, `utils/geometry.ts` | Maintenance |
| P2 | Edge `approve-subdivision` qui éclate `lots_data` jsonb en lignes `subdivision_lots`/`subdivision_roads` à l'approbation admin | nouvelle edge + `AdminSubdivisionRequests` | Moyen |
| P2 | Régénérer types Supabase pour supprimer les casts `as any` sur `subdivision_requests` et `subdivision_rate_config` | `src/integrations/supabase/types.ts` | Faible |
| P2 | Migrer notifications vers `createNotification()` helper | `useSubdivisionForm.submit` | Faible |

### Décisions à confirmer avant implémentation

1. **Paiement** : faut-il un workflow en 2 temps (frais de soumission ~10-50$ → examen → frais finaux après validation), ou paiement unique total ?
2. **Pièces jointes** : obligatoires (bloque la soumission) ou optionnelles (bloque l'examen côté admin) ?
3. **Eclatement `lots_data` → `subdivision_lots`** : à l'approbation admin (recommandé) ou immédiatement à la soumission (plus lourd, perte de flexibilité) ?

