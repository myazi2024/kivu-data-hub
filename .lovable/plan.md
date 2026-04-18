

## Audit — Espace admin "Contributions CCC"

### 1. Architecture

| Composant | LOC | Rôle |
|---|---|---|
| `AdminCCCContributions.tsx` | **1 762** | Page principale (dépasse seuil 1000) |
| `useCadastralContribution.tsx` | 739 | Hook soumission/édition |
| `AdminCCCCodes.tsx` | 409 | Gestion codes générés |
| Dialogs liés | — | `AppealManagementDialog`, `PermitRequestDialog`, `DocumentsGalleryDialog` |

Onglets admin : `pending`, `approved`, `rejected`, `suspicious`, `appeals`, `all`. Realtime ON. Pagination interne. Test d'intégrité via RPC `validate_contribution_completeness`.

### 2. État BD réel — 6 anomalies majeures

| # | Anomalie | Mesure | Impact |
|---|---|---|---|
| **A1** | **3 510 contributions TEST** (`parcel_number ILIKE 'TEST-%'`) polluent la table | 100 % du volume réel | Volume BD artificiellement gonflé. Filtre côté UI (`.not('parcel_number','ilike','TEST-%')`) → l'admin n'en voit aucune mais elles consomment espace + faussent triggers anti-fraude |
| **A2** | **1 seul utilisateur unique** (e22b36e2…) a généré les 3 510 contributions | — | Soit compte bot/test, soit anti-fraude inactif (limite 10/24h pourtant documentée) |
| **A3** | **0 contribution approuvée** mais **1 170 codes CCC générés** (293 utilisés) | total_codes=1170, approved=0 | **Incohérence majeure** : trigger `generate_ccc_code_on_approval` aurait dû exiger `status='approved'`. Soit codes générés sur statuts intermédiaires supprimés, soit insertion manuelle. Codes utilisés = valeur monétaire injectée sans validation |
| **A4** | **702 contributions rejetées sans raison** (`rejection_reason IS NULL`) | 100 % des rejets | UX/audit cassés : utilisateur ne sait pas pourquoi rejeté, pas d'appel possible documenté |
| **A5** | **2 808 contributions en attente** (réelles, hors test : ~0) — chiffre dominé par tests | Backlog gonflé | Statistique `pending` faussée dans le dashboard |
| **A6** | **0 expiration / 0 invalidation** sur 1 170 codes | — | Logique d'expiration (90 j) **non appliquée** côté BD. Cron/trigger absent ou inactif |

### 3. Audit fonctionnel UI

| # | Manque/Risque | Sévérité |
|---|---|---|
| F1 | **Pas de purge des contributions TEST** — accumulation infinie | Élevée |
| F2 | **Bouton rejet sans champ raison obligatoire** (`rejection_reason` peut être null) | Élevée |
| F3 | **Pas d'export CSV des contributions filtrées** alors que `exportToCSV` est importé (vérifier usage) | Moyenne |
| F4 | **Pas d'action en masse** (approve/reject batch) — admin doit cliquer 1 par 1 sur 2 808 lignes | Élevée |
| F5 | **Realtime sans debounce** — rafraîchit `fetchContributions` (paginée 1000+ lignes) à chaque change | Moyenne perf |
| F6 | **Pas de filtre par utilisateur** — impossible d'isoler le compte qui a soumis 3 510 fois | Moyenne |
| F7 | **Pas d'onglet "Codes orphelins"** — 1 170 codes émis sans contribution approuvée invisibles | Élevée |
| F8 | **Score de complétude calculé à la volée** (RPC) seulement à l'ouverture détail — pas de colonne triable | Moyenne |
| F9 | **Fichier 1 762 LOC** > seuil 1000 → modularisation requise (mémoire projet) | Moyenne |
| F10 | **Approbation update parcel** : ~50 champs dupliqués entre les branches `update`/`insert` (DRY violé, risque drift) | Moyenne |
| F11 | **Pas de log audit** des actions admin (qui a approuvé/rejeté quoi quand) au-delà de `reviewed_by` | Moyenne |
| F12 | **Pas de visualisation appel** dans liste principale (badge `appeal_status`) | Faible |

### 4. Sécurité & cohérence

- **A3 = faille critique** : codes monétisables émis sans approbation. Vérifier RLS `cadastral_contributor_codes` INSERT + trigger source.
- Anti-fraude inopérant : 1 user / 3 510 contributions / 270 marquées suspectes (7,7 %) mais aucune blocage compte.
- `rejection_reason` devrait être NOT NULL au niveau contrainte BD si `status='rejected'`.

### 5. Recommandations priorisées

**P0 — Critique BD (migration + insert)**
1. **Investiguer & purger** les 1 170 codes CCC orphelins (status contribution ≠ approved). Identifier source (trigger défectueux, insert manuel).
2. **Audit utilisateur** `e22b36e2…` : bot/test/admin ? Bloquer si abusif.
3. **Purger** les 3 510 contributions TEST + codes associés.
4. **Activer expiration** : cron/trigger SQL pour passer `is_valid=false` quand `expires_at < now()`.
5. **Contrainte BD** : `rejection_reason NOT NULL` si `status='rejected'` (via trigger validation).

**P1 — UX admin (code)**
6. **Action en masse** : checkbox sélection + boutons "Approuver/Rejeter sélection".
7. **Filtre par utilisateur** + lien vers profil.
8. **Onglet "Codes orphelins"** dans `AdminCCCCodes` listant codes sans contribution approuvée.
9. **Champ raison de rejet obligatoire** (validation côté UI + BD).
10. **Export CSV** filtré.
11. **Debounce realtime** (300 ms) pour éviter refetch en rafale.

**P2 — Évolutions**
12. **Modulariser** `AdminCCCContributions.tsx` (>1000 LOC) en `views/{ListView, DetailView, ApprovalView, RejectionView}.tsx` + `hooks/useContributionApproval.ts`.
13. **Extraire** la duplication update/insert parcel en helper `mapContributionToParcel()`.
14. **Audit log** table `cadastral_contribution_audit` (admin_id, action, contribution_id, payload, timestamp).
15. **Colonne triable `completeness_score`** persistée (recalcul on update).
16. **Badge appel** dans la liste + compteur appels en attente onglet principal.

### 6. Question

Quel périmètre dois-je implémenter ?

- **(A) P0 uniquement** — investigation + purge BD + expiration codes (~1 h, surtout SQL)
- **(B) P0 + P1** — ajoute UX admin (actions en masse, filtres, export, raisons obligatoires) (~2 h)
- **(C) Plan complet P0 + P1 + P2** — modularisation 1762 LOC + audit log + score persisté (~4 h)

