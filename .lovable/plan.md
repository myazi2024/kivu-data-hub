## Audit — Admin "Demandes de mutation"

Périmètre : `AdminMutationRequests.tsx` (656 lignes) + `mutation/*` + `MutationFeesConfig.tsx` + flux paiement/certificat. Comparé aux patterns appliqués sur Expertise / Subdivision / Land Title.

### État des lieux base de données
- **52 demandes au total** : 21 `pending`, 21 `approved`, 10 `rejected` — **0 `in_review`, 0 `on_hold`, 0 `cancelled`, 0 `returned`**.
- **21 `pending` avec paiement reçu** (100 % payées) et âge moyen **2 001 jours** ⇒ aucune escalade ni alerte SLA, alors que la colonne `escalated_at` existe.
- **Aucun trigger** sur `mutation_requests` ni `mutation_fees_config` (Expertise en a 2, Subdivision aussi).
- Seules 3 fonctions SQL : `generate_mutation_reference`, `set_mutation_reference`, `prevent_paid_invoice_mutation`. **Aucune RPC atomique** `process_mutation_decision` / `get_admin_mutation_stats` / `get_signed_mutation_certificate`.
- Pas de colonne `assigned_to`/`assigned_at` (workflow d'attribution absent).

---

### P0 — Sécurité & intégrité (bloquant)

1. **Aucune RPC atomique pour `approve/reject/hold/return`**
   - Le composant fait 4 opérations client séquentielles (UPDATE + audit_logs INSERT + certificat + notification) ⇒ état incohérent possible si une étape échoue (ex. notification envoyée mais `status` non mis à jour). Encapsuler dans une RPC SECURITY DEFINER `process_mutation_decision(p_request_id, p_action, p_notes, p_rejection_reason)` qui :
     - vérifie `has_admin_role(auth.uid())`,
     - applique l'invariant `payment_status='paid'` côté serveur (actuellement seulement UI),
     - écrit `request_admin_audit` (pattern unifié déjà utilisé sur Expertise),
     - retourne `{new_status, audit_id}` pour invalidation cache.

2. **Génération du certificat côté navigateur**
   - `generateAndUploadCertificate('mutation_fonciere', …)` est exécutée dans le browser de l'admin : lourd, dépendant de la session, non rejouable, et `certificate_url` finit dans le bucket public (parité Expertise non respectée). Migrer vers une edge function `generate-mutation-certificate` (service-role + bucket privé) déclenchée par la RPC `process_mutation_decision` quand `action='approve'`.
   - Ajouter une RPC `get_signed_mutation_certificate(p_request_id, p_ttl_seconds default 600)` + helper front `openMutationCertificate()` (clone direct de `expertiseCertificateUrl.ts`).

3. **Recherche client-side sur 2 000 lignes**
   - `fetchRequests` charge **2 000 demandes** puis filtre en mémoire ⇒ ne tiendra pas à l'échelle, pagination cliente artificielle. Basculer côté serveur (`.range()` + filtre `.ilike()` avec `escapeIlike()` partagé) comme Expertise. Au passage, `searchQuery.toLowerCase()` n'échappe ni `%` ni `,` (déjà géré ailleurs via `escapeIlike`).

4. **Trigger d'invariants manquant**
   - Ajouter `BEFORE UPDATE` sur `mutation_requests` :
     - `status='approved'` ⇒ `payment_status='paid'` obligatoire (sinon `RAISE EXCEPTION`).
     - `status='rejected'` ⇒ `rejection_reason IS NOT NULL`.
     - Bloquer transition `approved → rejected/pending` (idempotence).
   - Ajouter trigger d'audit sur `mutation_fees_config` ⇒ `system_config_audit` (parité `expertise_fees_config`).

5. **`confirm()` natif**
   - `handleToggleFeeActive` utilise `window.confirm` (interdit par standard projet) ⇒ remplacer par `AlertDialog` shadcn.

---

### P1 — Workflow & parité fonctionnelle

6. **Statut `in_review` jamais utilisé**
   - Le filtre n'expose `in_review` que par calcul, mais aucune action ne fait passer une demande de `pending` → `in_review` (prise en charge). Ajouter une action « Prendre en charge » qui passe à `in_review` + `reviewed_by/reviewed_at` + audit + notification.
   - Conséquence : aujourd'hui le bouton « Traiter » ne s'affiche que si `status IN ('in_review','on_hold')`, mais comme aucune demande n'arrive jamais en `in_review`, **les 21 mutations payées en attente sont injoignables depuis l'UI** (régression critique). Soit ajouter l'action de prise en charge, soit autoriser aussi `pending` (si payé) dans le filtre du bouton Traiter.

7. **Timeline d'audit dans le détail**
   - Brancher `useRequestAudit('mutation_requests', request.id)` dans `MutationDetailsDialog` (section « Historique des décisions »), comme Expertise/Mortgages/Disputes.

8. **SLA & escalade**
   - Brancher `useServiceSLA` + `escalated_at` : badge « En retard » / « Escaladé » dans la table, action « Escalader » + KPI dédié dans `MutationStatsCards`.
   - Critères : `pending|in_review` payée depuis > 7 j ⇒ overdue ; > 15 j ⇒ proposer escalade.

9. **Notifications standardisées**
   - Remplacer l'`insert('notifications')` ad hoc par `notificationHelper.notifyMutationDecision(…)` (parité hub demandes), avec `action_url` calculé.

10. **Statuts réellement supportés**
    - `MUTATION_STATUS_LABELS` doit lister exactement : `pending`, `in_review`, `approved`, `rejected`, `on_hold`, `returned`, `cancelled` (vérifier l'enum). Aujourd'hui `cancelled`/`on_hold`/`returned` sont des cartes KPI mais sans aucune voie d'accès.

11. **Section paiement dans le détail**
    - Afficher la transaction (`payments`/`transactions`) liée : montant, méthode, `transaction_id`, statut, lien vers `AdminUnifiedPayments`. Bouton « Rembourser » via `process-refund` si `cancelled`.

---

### P2 — Performance, UX, modularisation

12. **TanStack Query + RPC stats unique**
    - Migrer `fetchRequests`/`fetchFees` vers `useQuery(['admin-mutation', page, filters])` (parité Expertise).
    - Créer `get_admin_mutation_stats()` retournant `{pending, in_review, approved, rejected, on_hold, returned, overdue, unpaid, revenue_usd}` en 1 appel (vs 6 `filter()` JS sur 2 000 lignes).

13. **Filtres**
    - `setSearchQuery` / `setStatusFilter` / `setTypeFilter` ne réinitialisent pas la page courante ⇒ page vide possible. Reset via `useEffect`.
    - Debounce 300 ms sur `searchQuery`.

14. **Export CSV**
    - `exportToCSV` exporte uniquement les `filteredRequests` chargés (max 2 000). Basculer sur `csvExportSecure` (streaming par batch de 1 000) déjà standard côté Mutations… non : utilisé sur `exportApprovedRequestsCSV`. Aligner ici.

15. **Bulk actions**
    - Sélection multi-lignes pour : approuver en lot (si payées), rejeter en lot avec motif unique, exporter sélection (parité Expertise/Mutations).

16. **Modularisation `AdminMutationRequests.tsx` (656 lignes)**
    - Extraire la logique « process » dans `useMutationProcessing(request)` (hook).
    - Extraire la logique « fees » dans `useMutationFeesAdmin()` (hook).
    - Le composant page se limite à la composition (pattern `admin-component-modularization-fr`).

17. **Analytics admin**
    - `trackAdminAction({module:'mutation'})` n'est appelé que sur `process`. Ajouter aussi sur `assign`/`escalate`/`fee_*` + `page_view` (déjà géré par `Admin.tsx`).

18. **Backfill 21 mutations payées orphelines**
    - Migration one-shot : pour les 21 demandes `pending` payées depuis > 30 j, soit `escalated_at = now()` + notification interne, soit notifier l'admin via une banner « 21 mutations payées en attente » dans le hub.

---

### Détail technique

```text
SQL (migrations)
├── RPC process_mutation_decision(req_id uuid, action text, notes text, rejection_reason text)
├── RPC get_admin_mutation_stats() returns jsonb
├── RPC get_signed_mutation_certificate(req_id uuid, ttl int default 600) returns text
├── Trigger BEFORE UPDATE check_mutation_invariants (paid+approved, rejection_reason, idempotence)
├── Trigger AFTER UPDATE audit_mutation_decisions ⇒ request_admin_audit
├── Trigger AFTER INSERT/UPDATE/DELETE audit_mutation_fees ⇒ system_config_audit
└── Backfill : escalated_at = now() pour mutations pending payées > 30 j

Edge functions
└── generate-mutation-certificate (PDF + upload bucket privé + update certificate_url + audit)

Front
├── src/hooks/useMutationProcessing.ts          (nouveau)
├── src/hooks/useMutationFeesAdmin.ts           (nouveau)
├── src/hooks/useMutationStats.ts               (RPC unique)
├── src/utils/mutationCertificateUrl.ts         (nouveau, pattern expertiseCertificateUrl)
├── src/lib/notificationHelper.ts               (+ notifyMutationDecision)
├── src/components/admin/mutation/
│   ├── MutationAuditTimeline.tsx               (nouveau, branché dans Details)
│   ├── MutationPaymentSection.tsx              (nouveau, dans Details)
│   ├── MutationStatsCards.tsx                  (+ overdue, in_review, returned)
│   ├── MutationFilters.tsx                     (debounce + reset page)
│   ├── MutationRequestsTable.tsx               (extrait : badge SLA + sélection bulk + prendre en charge)
│   └── MutationProcessDialog.tsx               (draft object + RPC)
└── src/components/admin/AdminMutationRequests.tsx (refactor, useQuery + bulk + AlertDialog)
```

### Hors-scope (à confirmer)
- Workflow d'attribution explicite à un agent (`assigned_to`) — peu utile vu le faible volume actuel.
- Génération automatique d'une preuve de mutation (acte) côté notaire/conservateur.

---

### Quelle portée souhaitez-vous lancer ?
- **P0 seul** — RPC atomique `process_mutation_decision` + invariants serveur + recherche serveur/escapeIlike + certificat privé via edge + remplacement `confirm()`. Débloque les 21 mutations payées orphelines.
- **P0 + P1 (recommandé)** — P0 + action « Prendre en charge » + timeline audit + SLA/escalade + section paiement dans Details + notifications standardisées.
- **P0 + P1 + P2 (complet)** — Tout : + RPC stats unique, TanStack Query, bulk actions, CSV streamé, modularisation hooks, audit fees, analytics étendu, backfill escalade.
