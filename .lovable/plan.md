

## Audit — Configuration & gestion du service de demande de Lotissement (espace admin)

### Périmètre couvert

5 écrans admin (sidebar « Procédures fonciers ») :
1. **Demandes Lotissement** (`AdminSubdivisionRequests`) — file de traitement
2. **Config Frais Lotissement** (`AdminSubdivisionFeesConfig`) — barème `subdivision_rate_config`
3. **Règles de zonage** (`AdminSubdivisionZoningRules`) — `subdivision_zoning_rules`
4. **Lots & voies créés** (`AdminSubdivisionLots`) — `subdivision_lots`
5. **Analytics Lotissement** (`AdminSubdivisionAnalytics`)

Plus 2 edge functions : `subdivision-request` (création) et `approve-subdivision` (approbation atomique).

---

### ✅ Points forts confirmés

- **Soumission sécurisée** : edge `subdivision-request` calcule les frais côté serveur (anti-falsification), génère `reference_number` (`LOT-YYYY-XXXXXXXX`), valide CNI/preuve de propriété obligatoires, applique le pattern `pattern-soumission-securisee-fr`.
- **Approbation atomique** : edge `approve-subdivision` insère lots + flag `is_subdivided` + notification, avec **rollback du statut** si l'insertion des lots échoue.
- **Statuts EN normalisés** (`pending/in_review/approved/rejected/returned/awaiting_payment/completed`) — conformes à `status-normalization-pattern-fr`.
- **SLA, escalade, motif de rejet/renvoi obligatoire**, validation conformité zonage en temps réel via RPC `validate_subdivision_against_rules`, badge Conforme/Non conforme par ligne.
- **Audit log** sur édition admin de lots (`AdminSubdivisionLots` → `audit_logs`).
- **Documents privés** servis via signed URLs (bucket `cadastral-documents`).
- **Aperçu visuel** du plan dans le dialog de détails (`SubdivisionMiniMap`).
- **Frais multi-paramètres** : tarif/m², palier dégressif, min/max par lot, voirie ($/ml), espaces communs ($/m²), avec calculateur d'aperçu.

---

### ⚠️ Écarts & dette technique identifiés

#### A. Cohérence calcul de frais client ↔ serveur
1. **Voirie & espaces communs ignorés côté serveur** (`subdivision-request/index.ts` L103-117) : seuls `area × ratePerSqm` sont sommés. Or `subdivision_rate_config` expose `road_fee_per_linear_m_usd` et `common_space_fee_per_sqm_usd`, et le calculateur admin les inclut. Les utilisateurs payent moins que ce que le barème prévoit → **manque à gagner**.
2. **Palier dégressif (`tier_threshold_sqm`/`tier_rate_per_sqm_usd`) non appliqué côté serveur** (présent uniquement dans le calculateur admin et l'UI client). Incohérence directe entre l'aperçu et la facturation réelle.
3. **Pas de `processing_fee_usd` configurable** : saisi à la main par l'admin à l'approbation, sans grille tarifaire.

#### B. Workflow & outillage admin
4. **Pas d'action « Réassigner »** : `assigned_to` est posé une seule fois par `handleStartReview`. Aucun moyen de transférer un dossier.
5. **Pas d'actions groupées** (bulk approve/reject/réassigner) — divergence avec AdminCCC/Mutation/Expertise (cf. `admin-component-modularization-fr`).
6. **Composant monolithique 806 lignes** (`AdminSubdivisionRequests.tsx`) — viole `complex-dialog-modularization-strategy-fr` (>1000 LOC dialogs ; ici on s'en approche). Devrait être splitté en `Stats/Filters/RequestList/RequestDetailsDialog/ActionDialog`.
7. **Pas de hub unifié** : les 5 écrans sont 5 entrées plates dans la sidebar. Pas de tabs « Demandes / Config / Lots / Analytics » comme pour CCC.
8. **`AdminBillingConfig` a un onglet « Lotissement »** (ligne 251) mais pointe vers une vue distincte de `AdminSubdivisionFeesConfig` → vérifier non-duplication.

#### C. Données & traçabilité
9. **`subdivision_roads` jamais insérée par `approve-subdivision`** : seule `subdivision_lots` est matérialisée. Les voies restent uniquement dans `subdivision_plan_data` JSON → impossibles à interroger/analyser, n'apparaissent pas dans `AdminSubdivisionLots` (qui ne montre que les lots malgré son titre « Lots & voies créés »).
10. **Édition admin d'un lot non répliquée vers `cadastral_parcels`** : si un lot devient une parcelle officielle, le changement de propriétaire/usage dans `AdminSubdivisionLots` ne propage rien (cf. `atomic-cross-table-updates-fr`).
11. **`subdivision_plan_data` non versionné** : un renvoi pour correction écrase la donnée précédente sans snapshot. Pas d'historique de plan.
12. **`approve-subdivision` n'écrit pas dans `request_admin_audit`** : l'audit générique des décisions admin (cf. `requests-procedures-admin-audit-fr`) est implémenté ailleurs mais pas ici.

#### D. Qualité de la file de traitement
13. **`fetchRequests` charge sans pagination** (`select('*')` complet) — risque de scalabilité au-delà de quelques milliers de demandes.
14. **Validation conformité lazy** déclenchée par `useEffect` mais relancée à chaque pagination → recalculs RPC redondants. Pas de cache / pas de TTL.
15. **`SubdivisionMiniMap` ne reçoit pas les `metricFrame`** : les surfaces affichées dans le dialog admin ne bénéficient pas de la projection GPS précise mise en place côté éditeur (cf. travaux récents).
16. **Pas d'export PDF/dossier complet** par demande (CSV uniquement) — divergence avec `AdminHistoryHub`.

#### E. UX & accessibilité
17. **`window.confirm` pour suppression** dans `AdminSubdivisionFeesConfig` et `AdminSubdivisionZoningRules` → remplacer par `AlertDialog` (cohérence design).
18. **Mix toast** : `sonner` (config/zoning/lots) vs `useToast` (requests) — harmoniser.
19. **Alertes de conformité** : tooltip texte uniquement, pas de drawer détaillé listant les violations.

#### F. Sécurité & RLS (à vérifier)
20. **`subdivision_zoning_rules` & `subdivision_rate_config`** : confirmer policies admin-only (les écrans utilisent `(supabase as any)` ce qui peut masquer des erreurs RLS).
21. **`subdivision_lots`** : édition publique vs admin. RLS doit limiter UPDATE aux admins (le code y suppose).

---

### 🎯 Plan correctif recommandé (priorisé)

#### P0 — Cohérence financière (impact direct revenus)
- **Étendre `subdivision-request` edge** : intégrer `road_fee_per_linear_m_usd × Σ longueur voies` et `common_space_fee_per_sqm_usd × Σ surface espaces communs` + palier dégressif. Le calcul doit reproduire à l'identique la formule du calculateur admin (extraire dans un module partagé `_shared/subdivisionFees.ts`).
- **Ajouter `processing_fee_grid`** : tarif standard configurable (pourcentage ou fixe) appliqué par défaut à l'approbation.

#### P1 — Workflow admin
- **Bulk actions** : sélection multi + approuver/rejeter/renvoyer/réassigner en lot (réutiliser pattern AdminCCC).
- **Action « Réassigner »** dans la liste (Select admin disponible).
- **Modulariser** `AdminSubdivisionRequests` en `requests/` (Stats, Filters, List, DetailsDialog, ActionDialog) ≤ 300 LOC chacun.
- **Hub à onglets** : `AdminSubdivisionHub` regroupant Demandes / Frais / Zonage / Lots / Analytics, avec une seule entrée sidebar « Lotissement ».

#### P2 — Complétude données
- **Matérialiser `subdivision_roads`** dans `approve-subdivision` (mêmes principes que les lots : geometry GPS dérivée, rollback si échec).
- **Inclure les voies** dans `AdminSubdivisionLots` (renommer en « Lots, voies & espaces ») avec un sélecteur de type.
- **Versionner `subdivision_plan_data`** dans `subdivision_plan_versions` à chaque renvoi/réédition.
- **Audit générique** : `approve-subdivision` insère dans `request_admin_audit` (action, old_status, new_status, motif).

#### P3 — Performance & UX
- **Pagination serveur** dans `fetchRequests` (range + count exact).
- **Cache validation conformité** (TTL 5 min, invalidé sur update du dossier).
- **Export dossier PDF** complet par demande.
- **Harmoniser toasts** (`useToast` partout) et remplacer `window.confirm` par `AlertDialog`.
- **Drawer de violations** au clic sur le badge « Non conforme ».

#### P4 — Sécurité
- **Audit RLS** de `subdivision_rate_config`, `subdivision_zoning_rules`, `subdivision_lots`, `subdivision_roads` ; supprimer les `as any` masquants après confirmation.

---

### Estimation d'effort

| Lot | Effort | Risque |
|---|---|---|
| P0 frais voirie/espaces/palier | Moyen | Faible (test edge function) |
| P1 modularisation + bulk + hub | Élevé | Moyen (refactor large) |
| P2 voies matérialisées + audit | Moyen | Faible |
| P3 perf/UX | Faible-Moyen | Faible |
| P4 RLS | Faible | Moyen (à tester en non-régression) |

### Fichiers concernés (référence)
- `src/components/admin/AdminSubdivisionRequests.tsx`, `AdminSubdivisionFeesConfig.tsx`, `AdminSubdivisionZoningRules.tsx`, `AdminSubdivisionLots.tsx`, `AdminSubdivisionAnalytics.tsx`
- `src/components/admin/sidebarConfig.ts`
- `supabase/functions/subdivision-request/index.ts`, `supabase/functions/approve-subdivision/index.ts`
- `src/hooks/useZoningRules.ts`
- Nouveaux : `_shared/subdivisionFees.ts` (formule unifiée), `AdminSubdivisionHub.tsx`, dossier `subdivision/` modularisé.

Dis-moi quels lots tu souhaites lancer en priorité et je prépare un plan d'implémentation détaillé pour chacun.
