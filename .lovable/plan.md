

## Audit — Espace admin "Demandes & Procédures"

### 1. Périmètre

**10 composants, ~8 050 LOC** + 7 tables de demandes côté BD.

| Composant | LOC | Table | Vol. |
|---|---|---|---|
| `AdminCCCContributions` | **1 883** | `cadastral_contributions` | 0 |
| `AdminMutationRequests` | **1 124** | `mutation_requests` | 52 |
| `AdminExpertiseRequests` | **1 113** | `real_estate_expertise_requests` | 176 |
| `AdminLandTitleRequests` | 803 | `land_title_requests` | 176 |
| `AdminSubdivisionRequests` | 663 | `subdivision_requests` | 26 |
| `AdminMortgages` | 661 | `cadastral_mortgages` | 293 |
| `AdminTaxDeclarations` | 659 | `cadastral_tax_history` | — |
| `AdminLandDisputes` | 511 | `cadastral_land_disputes` | 52 |
| `AdminBuildingPermits` | 381 | `cadastral_building_permits` | 351 |
| `AdminTaxHistory` | 253 | — | — |

### 2. Anomalies BD

| # | Anomalie | Mesure | Sévérité |
|---|---|---|---|
| **A1** | **0 trigger** sur les 7 tables de demandes (workflow 100% côté UI/Edge) | 0/7 | **Critique** |
| **A2** | **70 land_title approved sans certificat généré** + **21 mutations approved sans certificat** → certificate generation cassée ou manuelle | 91 | **Critique** |
| **A3** | **10 subdivisions approved sans lots** → workflow lotissement incomplet | 10/26 | Élevée |
| **A4** | **`cadastral_building_permits` utilise statuts FR libres** (`Conforme`/`En attente`/`Non autorisé`) au lieu de l'enum standard (`pending`/`in_review`/`approved`/`rejected`) → incohérence avec les 6 autres tables et les filtres `RESOLVED_STATUSES` | 351 lignes | Élevée |
| **A5** | **104 expertises stale > 30 j** (pending/in_review) sans relance auto | 104/176 | Élevée |
| **A6** | **69 land_title stale > 30 j** + **21 mutations stale** + **11 subdivisions stale** | 101 | Élevée |
| **A7** | **58 hypothèques `en_défaut`** sans workflow de relance/saisie automatique visible | 58/293 | Élevée |
| **A8** | **21 litiges `en_cours` > 60 j** sans escalade auto | 21/52 | Moyenne |
| **A9** | **0 contribution CCC** alors que `AdminCCCContributions` = 1 883 LOC (sur-dimensionné pour table vide ; mais OK si récemment purgée) | 0/0 | Faible |
| **A10** | **`cadastral_land_disputes` utilise statuts FR** (`en_cours`/`resolu`/`demande_levee`) — même problème qu'A4 | 52 | Moyenne |
| **A11** | **`cadastral_mortgages` utilise statuts FR** (`active`/`en_défaut`/`soldée`) — même problème, accent dans une valeur enum | 293 | Moyenne |

### 3. Audit fonctionnel UI

| # | Manque/Risque | Sévérité |
|---|---|---|
| F1 | **3 composants > 1000 LOC** (`AdminCCCContributions` 1883, `AdminMutationRequests` 1124, `AdminExpertiseRequests` 1113) → modularisation requise (mémoire projet) | Élevée |
| F2 | **Pas de SLA / vue "demandes stales"** transversale → aucun écran agrège les 235 demandes en retard sur les 7 services | Élevée |
| F3 | **Pas de bouton "régénérer certificat"** sur land_title/mutation approved orphelins (91 cas) | **Critique** |
| F4 | **Pas de relance email auto** sur stale > 30 j | Élevée |
| F5 | **Statuts non normalisés** (FR vs EN) → filtres admin doivent dupliquer les valeurs ; risque d'oubli | Élevée |
| F6 | **Pas d'écran unifié "Demandes & Procédures"** — admin doit naviguer entre 9 onglets pour voir l'état global | Moyenne |
| F7 | **Pas d'audit log** des décisions admin (approve/reject/assign) sauf `cadastral_contribution_audit` et `permit_admin_actions` (5/9 services sans audit) | Élevée |
| F8 | **Pas de bulk actions** (approbation/rejet groupés) sur les listes admin | Moyenne |
| F9 | **Pas de timeline/historique** par demande (création → paiement → review → décision → certificat) | Moyenne |
| F10 | **Pas d'escalade automatique** des hypothèques `en_défaut` (58 cas) ni des litiges > 60j (21 cas) | Élevée |
| F11 | **Workflow subdivision incomplet** : 10/26 approuvées sans lots → bouton "Forcer génération lots" manquant | Élevée |
| F12 | **Pas de motif obligatoire** au rejet (vérifier coherence avec mémoire CCC) sur 8 services hors CCC | Moyenne |

### 4. Recommandations priorisées

**P0 — Critique BD/sécurité**
1. **Migration normalisation statuts** : aligner `cadastral_building_permits.administrative_status`, `cadastral_land_disputes.current_status`, `cadastral_mortgages.mortgage_status` sur enum standard (`pending`/`in_review`/`approved`/`rejected`/`completed`/`cancelled`). Mapping FR→EN puis mise à jour code.
2. **Trigger `audit_request_decisions`** générique sur les 7 tables → insertion dans `request_admin_audit` (qui/quand/ancien/nouveau statut/motif).
3. **RPC `regenerate_missing_certificates`** : balaye les 91 demandes approved sans certificat et déclenche la génération via edge function.
4. **Trigger `enforce_rejection_motive`** : reject ⇒ `rejection_reason NOT NULL` (uniformisé sur les 7 tables, comme CCC).
5. **Cron `auto_escalate_stale_requests`** : marque `escalated=true` les demandes > 30 j et notifie l'admin.

**P1 — UX admin**
6. **Nouvel écran `AdminRequestsHub`** : tableau de bord transversal (235 stales, 91 cert manquants, 58 hyp défaut, 21 litiges anciens) avec liens directs.
7. **Bouton "Régénérer certificat"** sur fiche land_title/mutation approved orpheline.
8. **Bouton "Forcer génération lots"** sur fiche subdivision approved sans lots.
9. **Action "Relancer client"** (email auto) sur demande stale.
10. **Bulk actions** (approve/reject multi-sélection) sur les 7 listes.
11. **Timeline d'audit** par demande (panneau latéral).
12. **Modulariser** `AdminCCCContributions`, `AdminMutationRequests`, `AdminExpertiseRequests` (>1000 LOC) en sous-composants `list/`, `detail/`, `actions/`, `filters/`.

**P2 — Évolutions**
13. **Workflow escalade hypothèques en_défaut** : étape "mise en demeure" + "saisie".
14. **Workflow escalade litige > 60 j** : passage automatique en "instruction prioritaire".
15. **Export comptable mensuel** des demandes approuvées (CSV multi-source).
16. **SLA configurable par type de service** (table `service_sla_config`) + KPI temps moyen de traitement.
17. **Vue `requests_health`** : indicateurs santé (% stale, % rejet, temps moyen, certificats manquants) par service.

### 5. Question

Quel périmètre dois-je implémenter ?

- **(A) P0 uniquement** — normalisation statuts FR→EN, trigger audit générique, RPC régénération certificats, trigger motif rejet, cron escalade stale (~1 h 30, surtout SQL)
- **(B) P0 + P1** — ajoute hub demandes transversal, bouton régen cert, bulk actions, modularisation 3 dialogs >1000 LOC, timeline audit, relance email (~3 h 30)
- **(C) Plan complet P0+P1+P2** — ajoute workflow escalade hyp/litiges, SLA configurable, export comptable, vue santé (~5 h)

