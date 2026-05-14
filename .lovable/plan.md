## Audit — Demande de lotissement (carte cadastrale)

Périmètre : `SubdivisionRequestDialog`, `useSubdivisionForm`, `Step*`, edge functions `subdivision-request` / `approve-subdivision` / `generate-subdivision-plan`, table `subdivision_requests`, RLS storage.

### A. Bugs bloquants (P0)

1. **Rules of Hooks cassées (`UserSubdivisionRequests.tsx` L127)** : `useState(downloadingId)` déclaré APRÈS un `return` conditionnel. React lance « Rendered more hooks than during the previous render » dès qu'une demande approuvée apparaît. → Remonter le hook au top du composant.

2. **Inférence `sectionType` divergente** entre client et serveur :
   - `useSubdivisionForm.computeFee` : `province && !quartier ? 'rural' : 'urban'`
   - `submit` + `StepInfrastructures` + edge function : `quartier ? 'urban' : (village ? 'rural' : 'urban')`
   → L'utilisateur voit un montant calculé sur un tarif rural et est facturé sur un tarif urbain (ou inverse). Centraliser dans un helper `inferSectionType(parcelData)` partagé front + edge.

3. **Surfaces des lots non revérifiées côté serveur** : l'edge function applique le tarif à `lot.areaSqm` envoyé par le client. Un utilisateur peut spoofer la surface et payer 1 $ pour un lot de 10 000 m². → Recomputer chaque `areaSqm` à partir des `vertices` + `metricFrame` server-side (`buildMetricFrame` est déjà importé).

4. **Frais d'instruction (admin) double-facturent la soumission** : `approve-subdivision` fait `total_amount_usd = submission_fee_usd + processing_fee_usd` quand `awaiting_payment`. La soumission a déjà été payée → l'invoice du paiement final inclut à nouveau les frais de soumission. → `total_amount_usd = processing_fee_usd` (ou utiliser `remaining_fee_usd` qui existe déjà en DB).

5. **Lots jamais matérialisés quand `processing_fee_usd > 0`** : `approve-subdivision` n'insère `subdivision_lots` que si `status === 'approved'`. Aucun callback côté webhook Stripe / `update-payment-status` ne re-déclenche la matérialisation après paiement final. → Ajouter un déclencheur (webhook Stripe ou edge dédiée `finalize-subdivision-approval`) qui passe `awaiting_payment → approved` puis exécute la matérialisation.

6. **Absence de vérification de propriété** : aucun check que `auth.uid()` est `current_owner_id` de `cadastral_parcels` ni qu'il existe un mandat (notarial / procuration). N'importe quel utilisateur authentifié peut lotir n'importe quelle parcelle. → Vérifier ownership dans l'edge function ; rejeter sinon (sauf `requester.type ∈ {mandatary, notary}` avec doc justificatif présent).

### B. Bugs / incohérences (P1)

7. **Documents requis hardcodés vs configurables** : l'edge exige `requester_id_document_url` + `proof_of_ownership_url` mais l'admin peut les retirer/renommer dans `subdivision_required_documents`. → Faire valider la liste contre `subdivision_required_documents WHERE is_required` filtrée par `requester_type`.

8. **Champs identité perdus** : `entitySubTypeOther` envoyé jamais persisté ; `propertyTitleType` envoyé mais ignoré ; `title_issue_date` jamais envoyé. → Ajouter colonnes manquantes ou stocker dans `additional_documents`/jsonb.

9. **Drafts non scopés utilisateur** : clé `subdivision-draft-v2-${parcelNumber}` partagée. Sur appareil partagé, A voit le brouillon de B. → Préfixer par `userId`. Ajouter `versionSchema` pour invalider proprement.

10. **`lots_data` dupliqué** : stocké à la fois dans `lots_data` et dans `subdivision_plan_data.lots`. Dérive possible. → Garder `subdivision_plan_data` source unique, déprécier `lots_data` (vue calculée).

11. **422 ROAD_INFRA_VIOLATIONS / PARENT_AREA_OUT_OF_RANGE** affichés par un toast unique sans surligner la voie/lot fautif. → Dans le client, parser la réponse, marquer la voie concernée et naviguer vers l'onglet `designer` ou `parcel`.

12. **Province/Cascade urbain vs rural** : la liste `candidates` côté edge n'inclut pas `province` pour le cas urbain. Une règle de zonage province-level ne s'applique jamais. → Ajouter `geo.province` après `geo.ville`.

13. **Validation server-side incomplète vs zoning admin** : la règle peut imposer surface min/max par lot, densité, largeur min des voies, % d'espaces verts… Le serveur ne valide que parent + per-road infra. → Étendre les checks (`lot_min_area_sqm`, `lot_max_area_sqm`, `road_min_width_m`, `min_common_space_pct`).

14. **Idempotence absente** : pas d'`Idempotency-Key` ; un double-clic réseau → 2 références créées (le `setSubmitting` couvre le cas UI mais pas un retry réseau du SDK Supabase). → Hash payload (parcel_number + user_id + plan signature) + `unique` partiel `WHERE status='pending'`.

15. **Fichiers orphelins** : aucun nettoyage du bucket `cadastral-documents` quand la demande est rejetée/annulée. → Cron `cleanup-orphan-subdivision-docs` ou suppression on-reject.

16. **Stripe fallback** : `markSubmittedFallback` laisse la demande en `submission_payment_status='pending'` sans retry visible. → Bouton « Reprendre le paiement » dans le tableau de bord (édite `submission_payment_id` en relançant `create-payment`).

17. **Auto-fill nom/prénom** : `meta.full_name.split(' ')` ne gère pas les noms composés ni post-nom. → Mapper séparément `meta.first_name`, `meta.last_name`, `meta.middle_name` lorsqu'ils existent.

### C. Optimisations (P2)

18. **Hook ordering `SubdivisionRequestDialog`** : `React.useMemo(STEP_CONFIG)` après `if (!open) return null` et `if (showIntro) return …`. Légal (les early-returns sont avant tous les hooks de ce composant) mais à risque ; sortir tous les hooks au sommet pour cohérence.

19. **Debounce fee 400 ms** OK ; ajouter `AbortController` sur les `select` Supabase pour annuler les requêtes obsolètes.

20. **Suppression de la duplication d'inférence section_type** (cf. #2) : créer `src/components/cadastral/subdivision/utils/sectionType.ts` + `supabase/functions/_shared/sectionType.ts`.

21. **Index manquant** : `idx_subdivision_requests_user_status_created (user_id, status, created_at desc)` — accélère `UserSubdivisionRequests`.

22. **Mobile 360 px** : 7 onglets en scroll horizontal — tronquer en icônes seulement sous `sm`, ajouter `aria-label`.

23. **Edge function logging** : remplacer les `.catch(()=>null)` silencieux par `console.error` structurés (déjà fait pour roads, à étendre).

24. **Contrainte CHECK trop laxiste sur statut** : aucune contrainte `status IN ('pending','in_review','awaiting_payment','approved','rejected','returned','cancelled')`. À ajouter.

### D. Plan d'implémentation (ordre proposé)

```text
P0 #1  Hooks order fix UserSubdivisionRequests
P0 #2  Helper sectionType partagé
P0 #3  Recompute server lot.areaSqm via metricFrame
P0 #4  Fix double-facturation processing fee
P0 #5  Webhook → finaliser approbation après awaiting_payment
P0 #6  Vérification ownership (cadastral_parcels.current_owner_id)
P1 #7-13 Validation, persistence, drafts scopés user, lots_data dépréciation
P1 #14-17 Idempotence, cleanup storage, Stripe retry, auto-fill profil
P2 #18-24 Refactors + index + UX mobile + logs structurés + CHECK enum
```

### E. Détails techniques (référence)

- **Tables touchées** : `subdivision_requests` (colonnes manquantes : `requester_entity_subtype_other`, `parent_parcel_title_type`, `parent_parcel_title_issue_date`, `idempotency_key`, contrainte CHECK status).
- **Edge functions à modifier** : `subdivision-request` (ownership, recompute area, validations zoning étendues, idempotence) ; `approve-subdivision` (split submission vs processing fee, finalisation différée) ; nouvelle `finalize-subdivision-approval` appelée par `stripe-webhook`.
- **Front** : `useSubdivisionForm.computeFee` aligné sur helper partagé ; `SubdivisionRequestDialog` — parsing erreurs typées (`ROAD_INFRA_VIOLATIONS`, `PARENT_AREA_OUT_OF_RANGE`) et rebascule onglet ; `UserSubdivisionRequests` — hook order + bouton « Reprendre paiement ».
- **Storage** : politique RLS `cadastral-documents` doit déjà imposer `path[0]=auth.uid()` (à vérifier) ; ajouter cron de purge des chemins non référencés.

Aucune modification effectuée — plan en attente d'approbation.
