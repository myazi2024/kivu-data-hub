## Audit — Admin "Demandes d'expertise immobilière"

Périmètre : `AdminExpertiseRequests.tsx` + `expertise/*` + `AdminExpertiseFeesConfig.tsx` + flux paiement/PDF/RLS associés. Comparé aux patterns appliqués sur Mutations / Land Title / Subdivision / Mortgages.

### Constats actuels (état des lieux base de données)
- 176 demandes — **0 assignée** (`assigned_to` jamais peuplé).
- 70 demandes `completed` mais **70 sans `certificate_url`** (bucket public + URL non rétro-remplie).
- 35 `in_progress` vieilles de **1 889 j** en moyenne, **71 `pending` à 1 784 j** → aucune escalade malgré la colonne `escalated_at` existante.
- Triggers `trg_audit_decisions_exp` + `trg_enforce_rejection_exp` actifs, mais le hub admin n'affiche jamais la timeline `request_admin_audit`.

---

### P0 — Sécurité & intégrité (bloquant)

1. **Sceau & certificat — naming et accès**
   - `handleUploadStamp` utilise `Date.now()` (collision + violation règle core `crypto.randomUUID()`), `upsert:true`, sans validation MIME / taille.
   - `certificate_url` stocké via `getPublicUrl` ⇒ exposé. Aligner sur le pattern PII paid-access : URL signée à la demande via RPC `get_signed_expertise_certificate(request_id)` + bucket privé.
   - Backfill : RPC one-shot pour régénérer / re-signer les 70 certificats existants ou marquer `certificate_url` à NULL et forcer regénération.

2. **Recherche ILIKE non échappée**
   - `query.or("reference_number.ilike.%${searchQuery}%,...")` injecte `%` / `,` / `\` bruts ⇒ filtre cassé + risques. Utiliser un helper `escapeIlike()` partagé (déjà appliqué côté Mutations) et basculer sur `to_tsvector` indexé pour `parcel_number + reference_number + requester_name`.

3. **Génération PDF côté navigateur**
   - `generateExpertiseCertificatePDF` + upload Storage côté client = lourd, dépendant de la session admin et non rejouable. Migrer vers une edge function `generate-expertise-certificate` (parité subdivisions / permis), appelée depuis le dialog avec service-role pour upload privé.

4. **`generateReferenceNumber` (`useRealEstateExpertise.tsx`)** — utilise `Math.random()` : remplacer par `crypto.randomUUID().slice(0,8)` (règle core).

---

### P1 — Workflow & parité fonctionnelle

5. **Workflow d'assignation manquant**
   - Aucune action « Assigner un expert » : ajouter un dialog `ExpertiseAssignDialog` qui peuple `assigned_to` + `assigned_at` + passe le statut à `assigned` puis `in_progress`. Notification au demandeur + entrée audit.
   - Lister les experts éligibles via `has_role(user_id,'expert')` (la policy `is_expert_or_admin` existe déjà).

6. **Timeline d'audit dans le détail**
   - Brancher `useRequestAudit('real_estate_expertise_requests', request.id)` dans `ExpertiseDetailsDialog` (section « Historique des décisions »), comme pour mortgages/disputes.

7. **SLA & escalade**
   - Brancher `useServiceSLA` + colonne `escalated_at` : badge « En retard » / « Escaladé » dans la table, et action admin « Escalader » qui pose `escalated_at = now()` + audit + notification interne.
   - Ajouter une stat « En retard » à `ExpertiseStatsCards`.

8. **Statut `assigned` absent du workflow réel**
   - Le calcul `inProgress = ['in_progress','assigned']` masque deux états distincts. Exposer 5 KPIs : Pending / Assigned / In progress / Completed / Rejected. Filtre déjà disponible.

9. **Process dialog : garde-fous serveur**
   - Côté `complete` : bloquer si `total_built_area_sqm <= 0` ou `market_value_usd <= 0` ou `payment_status != 'paid'`. La règle paiement existe côté UI mais n'est pas appliquée serveur — ajouter check dans un trigger `BEFORE UPDATE` (ou RPC `complete_expertise_request`).
   - Encapsuler `complete` / `reject` dans une RPC SECURITY DEFINER unique `process_expertise_decision(request_id, action, payload)` pour atomicité (update + audit + notification + invoice).

10. **Notifications standardisées**
    - Remplacer l'`insert('notifications')` ad hoc par `notificationHelper.notifyExpertiseDecision(...)` (parité hub demandes), avec `action_url` calculé.

---

### P2 — Performance & UX

11. **Stats : 1 RPC unique**
    - 4 requêtes count séquentielles. Étendre `get_admin_pending_counts` ou créer `get_admin_expertise_stats()` retournant `{pending, assigned, in_progress, completed, rejected, overdue, unpaid}` en un appel.

12. **TanStack Query**
    - Migrer `fetchRequests` vers `useQuery(['admin-expertise', page, status, search])` + invalidation via `useAdminAnalytics().trackAdminAction({ module:'expertise', ...})` (déjà importé) pour cohérence cache.

13. **Pagination & filtres**
    - `setStatusFilter` / `setSearchQuery` ne réinitialisent pas `currentPage` ⇒ peut afficher une page vide. Reset en `useEffect`.
    - Debounce 300 ms sur `searchQuery`.

14. **Export CSV**
    - `exportToCSV` exporte les 10 lignes courantes au lieu de l'ensemble filtré. Utiliser `csvExportSecure` (streaming par batch de 1000) déjà standard dans Mutations.

15. **Modularisation `AdminExpertiseRequests.tsx` (398 lignes)**
    - Extraire la logique « process » dans `useExpertiseProcessing(request)` (hook) ; le composant page se limite à la composition (pattern admin-component-modularization-fr).
    - Dialog process : passer un objet `draft` au lieu de 16 props.

16. **Bulk actions**
    - Sélection multi-lignes pour : assigner à un expert, rejeter en masse avec motif, exporter sélection (parité Mutations).

17. **Lien paiement / facture**
    - Afficher `expertise_payments` lié dans `ExpertiseDetailsDialog` (montant, méthode, `transaction_id`, statut), avec lien vers `AdminUnifiedPayments`. Bouton « Rembourser » via `process-refund` si annulation.

18. **Config frais — historisation**
    - `AdminExpertiseFeesConfig` n'écrit pas dans `system_config_audit`. Aligner sur le pattern config (snapshots + audit) pour traçabilité tarifaire.

---

### Détail technique

```text
SQL (migrations)
├── RPC complete_expertise_request(req_id uuid, p_value numeric, p_notes text, p_expert jsonb)
├── RPC reject_expertise_request(req_id uuid, p_reason text)
├── RPC get_admin_expertise_stats() returns jsonb
├── RPC get_signed_expertise_certificate(req_id uuid) returns text  -- 10 min signed URL
├── Trigger BEFORE UPDATE check_expertise_completion_invariants
└── Backfill: UPDATE … set certificate_url = NULL where status='completed' and certificate_url ilike '%/public/%'

Edge functions
└── generate-expertise-certificate (PDF + upload privé + update + audit)

Front
├── src/hooks/useExpertiseProcessing.ts          (nouveau)
├── src/hooks/useExpertiseStats.ts               (RPC)
├── src/components/admin/expertise/
│   ├── ExpertiseAssignDialog.tsx                (nouveau)
│   ├── ExpertiseAuditTimeline.tsx               (nouveau, branché dans Details)
│   ├── ExpertisePaymentSection.tsx              (nouveau, dans Details)
│   ├── ExpertiseStatsCards.tsx                  (5 KPIs + En retard)
│   ├── ExpertiseFilters.tsx                     (debounce + reset page)
│   ├── ExpertiseRequestsTable.tsx               (badge SLA + sélection bulk + assigner)
│   └── ExpertiseProcessDialog.tsx               (draft object + RPC)
├── src/utils/escapeIlike.ts                     (réutilisé / créé si manquant)
├── src/lib/notificationHelper.ts                (+ notifyExpertiseDecision)
└── src/components/admin/AdminExpertiseRequests.tsx (refactor, useQuery + bulk)
```

### Hors-scope (à confirmer si vous le souhaitez)
- Génération automatique d'un PDF brouillon dès `assigned` (preview pour l'expert).
- Module mobile dédié à l'expert sur le terrain (capture photos + géoloc).

---

### Quelle portée souhaitez-vous lancer ?
- **P0 seul** — sécurité fichiers/recherche/PDF + référence UUID + backfill certificats.
- **P0 + P1 (recommandé)** — sécurité + assignation/audit/SLA/RPC atomique/notifications standard.
- **P0 + P1 + P2** — tout (RPC stats unique, TanStack Query, bulk, export complet, modularisation, paiements liés, audit config frais).
