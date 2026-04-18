

## Audit — Espace admin "Historiques & Litiges"

### 1. Périmètre (7 vues, 6 tables, ~3 100 LOC)

| Vue | LOC | Table | Vol. BD |
|---|---|---|---|
| `AdminLandDisputes` | 511 | `cadastral_land_disputes` | 52 |
| `AdminDisputeAnalytics` | 246 | `cadastral_land_disputes` | – |
| `AdminMortgages` (+`mortgage/`) | 661 + 7 fichiers | `cadastral_mortgages` (+ `_payments`) | 293 + 0 |
| `AdminTaxHistory` | 253 | `cadastral_tax_history` | 1 506 |
| `AdminTaxDeclarations` | 659 | `cadastral_contributions` (filtré) | – |
| `AdminOwnershipHistory` | 335 | `cadastral_ownership_history` | 1 004 |
| `AdminBoundaryHistory` | 303 | `cadastral_boundary_history` | 234 |

### 2. Anomalies critiques (P0 — bloquant)

**A. Désalignement de statuts hypothèques (CRITIQUE).** En BD : `cadastral_mortgages.mortgage_status` contient seulement `completed` (118), `approved` (117), `in_review` (58). Or l'UI filtre/affiche `'active'` et `'paid'` (badges, KPIs `activeCount`, `paidCount`, totalAmount). Résultat : **toutes les KPIs hypothèques sont à 0**, le filtre "actives" ne montre rien. La normalisation (`normalizeMortgageStatus`) ignore ces 3 valeurs réelles.
→ Décider canon (`active/paid/...` métier vs `approved/in_review/completed` workflow), migrer la colonne ou refondre l'UI. Recommandé : adopter le standard EN workflow (`pending/in_review/approved/rejected/completed/cancelled`) déjà en place ailleurs + colonne séparée `lifecycle_state` (`active/paid/defaulted/renegotiated`) pour le métier post-approbation.

**B. Statuts FR non normalisés sur `cadastral_land_disputes`.** `current_status` reste en FR (`en_cours, familial, conciliation_amiable, autorite_locale, arbitrage, tribunal, appel, demande_levee, resolu, leve`). Viole la mémoire « FR labels banned in DB » et le pattern des audits précédents (Demandes & Procédures déjà migrés). Conséquences : analytics croisés cassés, pas de réutilisation des helpers EN.
→ Mapper FR→EN : workflow (`open/under_review/closed/lifted`) + colonne séparée `resolution_stage` pour les niveaux (familial → tribunal → appel).

**C. Aucun audit / trigger sur les 6 tables.** Zéro entrée trigger sur `cadastral_land_disputes`, `cadastral_mortgages`, `cadastral_tax_history`, `cadastral_ownership_history`, `cadastral_boundary_history`. Les changements de statut passent sans trace (`audit_logs` en best-effort côté front, jamais sur tax/ownership/boundary).
→ Trigger générique `audit_history_changes` réutilisant le pattern de l'audit "Demandes & Procédures".

**D. Hypothèques : motif de rejet non contraint.** Pas de trigger `enforce_rejection_motive` côté BD ; uniquement un check côté front. Un appel direct peut rejeter sans motif.

### 3. Anomalies fonctionnelles (P1)

1. **AdminTaxHistory : pas de cross-link parcelle** (clic → vue parcelle). 1 506 lignes sans navigation.
2. **AdminBoundaryHistory : pas de prévisualisation document** PDF/image (`boundary_document_url` ignoré sauf téléchargement).
3. **AdminOwnershipHistory : aucune détection d'incohérence** (chaîne de propriété trouée ou rupture entre `ownership_end_date` du précédent et `ownership_start_date` du suivant).
4. **AdminDisputeAnalytics : étiquettes nature dépréciées** (`limite_terrain, revendication_propriete, heritage_succession, empiètement`) ne correspondent PAS à `DISPUTE_NATURES` (`succession, delimitation, construction_anarchique, expropriation, double_vente, occupation_illegale, contestation_titre, servitude, autre`). Les graphiques affichent `autre` partout.
5. **AdminLandDisputes : pas d'escalade automatique stale**. Colonnes `escalated/escalated_at` ajoutées par l'audit précédent mais aucune intégration UI ni cron.
6. **AdminMortgages : `cadastral_mortgage_payments` table vide et inexploitée**. UI pas de saisie/visualisation des paiements, pas d'alerte échéance dépassée, pas de calcul "amorti vs restant dû".
7. **AdminTaxDeclarations (659 LOC)** : monolithique, à modulariser (Stats/Filters/DetailDialog).
8. **`AdminMortgages.tsx` (661 LOC)** : encore trop lourd malgré sous-dossier `mortgage/`, 3 dialogs imbriqués (approve/reject/return) — à scinder en hook métier.

### 4. Manques (P2)

- **Hub "Historiques"** : vue transversale par parcelle (timeline propriété + bornage + hypothèque + taxes + litiges) — actuellement éclaté en 7 onglets sans pivot.
- **Détection litiges-hypothèques** : pas d'alerte "parcelle sous hypothèque ET litige actif" (risque créancier).
- **Export consolidé** : chaque vue a son CSV, mais pas d'export "dossier parcelle complet" PDF/CSV.
- **Réconciliation tax history ↔ tax declarations** : 1 506 historiques vs déclarations CCC, pas de check de cohérence (montants, années).
- **Quittances hypothécaires (`generate_mortgage_receipt`)** : aucun générateur de reçu, alors que l'enum `document_type` inclut `mortgage_receipt`.
- **Escalation cron** : `escalate_stale_requests` créé pour Demandes mais pas étendu à `cadastral_land_disputes` (non listé dans la RPC).

### 5. Plan d'implémentation par paliers

**(A) P0 uniquement (~2 h, surtout SQL)**
- Migration statuts hypothèques : ajouter `lifecycle_state` ENUM (`active/paid/defaulted/renegotiated/cancelled`), migrer données, refondre UI Mortgages KPIs/filtres.
- Migration statuts litiges FR→EN : `current_status` → workflow EN + `resolution_stage` séparé, mapping front via shared types.
- Trigger `audit_history_changes` sur 5 tables (logs vers `request_admin_audit` ou nouvelle `history_audit`).
- Trigger `enforce_rejection_motive` sur `cadastral_contributions` filtré `contribution_type IN ('mortgage_*')`.

**(B) P0 + P1 (~4 h)**
- A + correction labels DisputeAnalytics, cross-link parcelle TaxHistory, preview PDF Boundary, détection chaîne ownership trouée, intégration UI escalade litiges, modularisation TaxDeclarations + Mortgages (extraction hook `useMortgageActions`).
- Ajout `cadastral_mortgage_payments` UI (saisie + alerte échéance).

**(C) Plan complet P0+P1+P2 (~6 h)**
- B + Hub Historiques transversal par parcelle (timeline 5 sources), alerte croisée litige+hypothèque, RPC `generate_mortgage_receipt`, RPC `reconcile_tax_records`, extension escalade cron aux litiges, export consolidé "dossier parcelle".

### Question

Quel périmètre dois-je implémenter ?

- **(A) P0** — corrige immédiatement les bugs bloquants (statuts hypothèques cassés, litiges FR→EN, audit BD).
- **(B) P0 + P1** — ajoute cross-navigation, modularisation, paiements hypothécaires.
- **(C) Plan complet** — ajoute hub transversal, alertes croisées, exports consolidés.

