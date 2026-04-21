

## Audit détaillé — Facturation & Commerce (admin)

### Verdict global

Module **fonctionnel mais hétérogène** : 19 entrées sidebar regroupent 4 sous-domaines (KPI, journaux, configuration, commissions) qui se chevauchent. Aucune régression bloquante, mais des **doublons fonctionnels**, des **plafonds clients** et des **incohérences UX** dégradent l'expérience admin et la fiabilité des chiffres.

### État détaillé (19 modules)

| Module | Statut | Observation |
|---|---|---|
| Tableau de bord financier | OK | RPC `get_billing_summary`, comparaison période précédente |
| Factures | ⚠️ | Stats RPC OK, mais **liste plafonnée à 2000** — voir B1 |
| Transactions | ⚠️ | 4 tables fusionnées en 5000 lignes max client-side — voir B2 |
| Réconciliation | ⚠️ | Pas de pagination serveur, **action « Réconcilier » sans audit log** — voir B3 |
| Monitoring paiements | ⚠️ | `select('*')` **sans `limit`** → risque mémoire — voir B4 |
| Paiements | OK | Edge function pour update statut |
| Commissions à payer | OK | Join + batch profiles |
| Performance revendeurs | OK | — |
| Ventes Revendeurs | OK | Détection orphelins + régénération |
| Revendeurs | OK | — |
| Codes de Remise | OK | — |
| Moyens de Paiement | OK | — |
| Mode de Paiement | OK | Audit + dialog confirmation |
| Intégration Services | OK | Compatibility scoring |
| Vue Unifiée | ⚠️ | 5 sources × 500 lignes — **double emploi avec Transactions** — voir B5 |
| Frais & Tarifs services | ⚠️ | 7 onglets, **bulk update non transactionnel + sans audit** — voir B6 |
| Modèle de facture | OK | Récemment refondu |
| Devises / Taux | OK | Audit log présent |

### Bugs et incohérences identifiés

#### B1 — Stats locales divergent des stats serveur (`AdminInvoices`)
La table affiche 2000 dernières factures (`limit(2000)`), filtre les TEST côté client, puis recalcule `totalDiscounts` sur cet échantillon. Si le compte total dépasse 2000 ou si beaucoup de TEST sont mêlés, le KPI **« Remises Totales »** est sous-estimé et incohérent avec **« Revenus Totaux »** (qui vient du RPC).
→ Effet : remontées admin contradictoires.

#### B2 — `AdminTransactions` dépend de jointures profiles client-side
Charge 4 tables en parallèle (5 000 lignes max), puis fait un second appel pour mapper user_id → email. Sur gros volumes : latence forte, doublons possibles entre `payments` (publication) et `payment_transactions` (cadastre) car aucune dédup par référence externe.
→ Effet : transactions comptées deux fois si trigger sync présent.

#### B3 — Réconciliation manuelle sans audit ni séparation des rôles
`AdminPaymentReconciliation.handleReconcile()` passe un statut à `completed` directement (`.update({ status: 'completed' })`) :
- pas de `logBillingAudit()` ni `logAuditAction()` (alors que la fonction existe `src/utils/billingAudit.ts`)
- pas de raison/commentaire obligatoire
- pas de vérification que la transaction a vraiment abouti côté provider
→ Risque : faux positifs, fraude interne, pas de traçabilité réglementaire.

#### B4 — Requête sans `limit` (`AdminPaymentMonitoring`)
```ts
.from('payment_transactions').select('*').order('created_at', { ascending: false })
```
Pas de `.limit()`. Plafond Supabase silencieux à 1000, mais sur 50k transactions le payload devient lourd à chaque ouverture du tab.
→ Effet : ralentissements, KPI calculés sur 1000 lignes uniquement.

#### B5 — Doublon « Transactions » ↔ « Vue Unifiée »
Les deux modules agrègent quasiment les mêmes sources (factures cadastre, payment_transactions, expertise, mutation, titre foncier). « Vue Unifiée » ajoute land_title/mutation, « Transactions » ajoute permit/publication. Aucune n'est exhaustive, et l'admin ne sait pas laquelle utiliser.
→ Effet : confusion + sources de vérité multiples.

#### B6 — Bulk update prix non atomique (`AdminBillingConfig.applyBulkUpdate`)
Boucle séquentielle d'`UPDATE` un par un :
```ts
for (const update of updates) await supabase.from(...).update(...).eq('id', update.id);
```
- Pas de transaction → si erreur au milieu, état incohérent (50% des prix modifiés)
- Pas de `logBillingAudit()` global avant/après
- Pas de prévisualisation des nouveaux prix avant commit
- Pas de bouton « annuler » / rollback
→ Risque commercial direct.

#### B7 — `CadastralPaymentDialog.handleDownloadReceipt()` ignore le format admin
```ts
generateInvoicePDF(invoiceData, [], 'a4');  // hardcoded
```
Pas de lecture de `useInvoiceTemplateConfig().default_format`, contrairement à `CadastralResultCard` (corrigé). Le `servicesCatalog` est vide (`[]`) → le PDF affiche "Service inconnu" pour chaque ligne.
→ Effet : reçu post-paiement dégradé.

#### B8 — `CadastralClientDashboard.generatePDFInvoice()` même problème
Pas de format admin lu, mais au moins `catalogServices` est passé. À harmoniser via un helper unique `downloadInvoicePDF(invoice)` qui internalise format + catalogue.

#### B9 — Anomalies non actionnables
`BillingAnomaliesPanel` liste 3 types d'anomalies (tx complétée/facture impayée, remise sans code, code expiré actif) mais **aucun bouton de résolution** : pas de « marquer comme résolu », pas de lien profond vers la facture/transaction concernée. L'admin doit copier l'ID et chercher manuellement dans un autre onglet.

#### B10 — Test mode invisible sur plusieurs tabs
`TestModeBanner` n'est affiché que dans `AdminFinancialDashboard`. Quand le mode test est ON, les chiffres de `Factures`, `Transactions`, `Vue Unifiée`, `Réconciliation` mélangent prod + test sans avertissement.

#### B11 — Sidebar « Paiements » badge incohérent
Le badge `payments` (count `useAdminPendingCounts`) pointe vers `AdminPayments` qui ne couvre que les paiements **publications** (table `payments`). Les paiements cadastraux/expertise/permit pending ne sont pas comptés ici → admin pense qu'il n'y a rien à traiter.

#### B12 — `BillingOverviewTab` lit 7 tables sans pagination ni cache
À chaque changement d'onglet `Frais & Tarifs services → Vue d'ensemble`, 7 SELECT en parallèle sont relancés. Pas de `useQuery`, pas de cache.
→ Effet : latence, charge DB inutile.

### Optimisations recommandées

| # | Action | Impact |
|---|---|---|
| O1 | Migrer `AdminInvoices` vers RPC `get_invoices_paginated(filters, page, size)` | Stats fiables, pas de plafond client |
| O2 | Créer une vue SQL `unified_payments_view` consommée par UN SEUL onglet (« Transactions ») et **supprimer** « Vue Unifiée » | -1 module, source unique |
| O3 | Wrapper `downloadInvoicePDF(invoice, services?)` dans `src/lib/invoiceDownload.ts` qui lit `default_format` + résout le catalogue → utilisé par 4 call-sites | Cohérence UX |
| O4 | RPC `bulk_update_prices(table, percentage, op)` côté SQL, transactionnelle + audit | B6 résolu |
| O5 | Boutons d'action sur `BillingAnomaliesPanel` (mark resolved + deeplink) | B9 résolu |
| O6 | Afficher `<TestModeBanner />` dans 5 tabs (Factures, Transactions, Réconciliation, Monitoring, Vue Unifiée) | B10 résolu |
| O7 | Étendre `useAdminPendingCounts` pour inclure expertise_payments + permit_payments + payment_transactions pending → badge global « Paiements à traiter » | B11 résolu |
| O8 | Ajouter `useQuery` (`@tanstack/react-query`) à `BillingOverviewTab` | B12 résolu |

### Fonctionnalités absentes / à créer

#### F1 — Avoirs / notes de crédit
Aucun mécanisme pour émettre un avoir lié à une facture déjà payée (remboursement partiel, annulation post-livraison). Obligatoire DGI.
→ Nouvelle table `credit_notes` + UI dédiée + numérotation `AV-…`.

#### F2 — Workflow remboursement
`AdminPayments.updatePaymentStatus()` peut passer à « refunded » mais **rien ne crédite Mobile Money / Stripe**. Pas d'edge function `process-refund`.
→ Effet : statut DB ≠ état réel chez le PSP.

#### F3 — Export comptable normalisé
Aucun export FEC (Fichier des Écritures Comptables) ni format compatible expert-comptable RDC. Seuls des CSV bruts sont disponibles.
→ Ajouter `exportFEC(period)` qui produit le fichier réglementaire.

#### F4 — Relances factures impayées
Pas de cron/edge function qui relance par email les factures `pending` > 48h. La table existe (`cadastral_invoices.status = 'pending'`), mais aucun automatisme.

#### F5 — Multi-établissement / multi-entité
`company_legal_info` ne supporte qu'une seule entité émettrice active. Si BIC ouvre une succursale (Lubumbashi), pas de moyen d'émettre depuis une seconde identité.

#### F6 — Liaison Facture ↔ Demande de service
Une facture cadastre ne porte aucune référence vers la demande qui l'a générée (CCC, mutation, expertise, permis). `AdminInvoices` ne permet pas de cliquer sur une facture pour voir la demande source. Réciproquement, les onglets demandes ne montrent pas la facture liée.
→ Ajouter colonne `source_request_id` + `source_request_type` sur `cadastral_invoices` + composant `<InvoiceLink />`.

#### F7 — Tableau de bord revendeurs auto-service
Les revendeurs n'ont pas d'espace dédié pour suivre leurs ventes/commissions. Tout est admin-only. Hors périmètre admin mais découle du module.

### Plan de correction prioritaire

#### Sprint 1 — Sécurité & fiabilité (bloquants)
1. **B3** — Audit + raison obligatoire sur la réconciliation manuelle (`AdminPaymentReconciliation`)
2. **B4** — Ajouter `.limit(1000)` explicite + pagination serveur sur `AdminPaymentMonitoring`
3. **B6** — RPC SQL `bulk_update_service_prices` transactionnelle avec audit
4. **B11** — Étendre `useAdminPendingCounts` pour englober tous les paiements pending

#### Sprint 2 — UX et cohérence
5. **B5 + O2** — Supprimer « Vue Unifiée » ; enrichir « Transactions » via vue SQL `unified_payments_view`
6. **B7 + B8 + O3** — Helper `downloadInvoicePDF()` partagé par les 4 call-sites
7. **B10** — Bannière test mode dans 5 tabs concernés
8. **B9** — Actions (résoudre + deeplink) sur `BillingAnomaliesPanel`
9. **B1** — RPC `get_invoices_paginated` consommée par `AdminInvoices`
10. **B12** — `useQuery` sur `BillingOverviewTab`

#### Sprint 3 — Fonctionnalités absentes (non urgentes mais structurantes)
11. **F1** — Avoirs / notes de crédit (table + UI + numérotation)
12. **F2** — Edge function `process-refund` (Stripe + Mobile Money)
13. **F4** — Cron de relance factures impayées
14. **F6** — Liaison facture ↔ demande source
15. **F3** — Export FEC

### Hors périmètre

- Pas de refonte du moteur PDF (`pdf.ts` stable)
- Pas de migration des 7 tables de fees (déjà cohérentes)
- Pas de modification des edge functions de paiement existantes
- Pas de F5 (multi-entité) sans demande métier explicite
- Pas de F7 (espace revendeur) — concerne le côté client

### Validation attendue après sprint 1+2

1. Réconciliation manuelle exige un motif + apparaît dans `audit_logs`
2. `Vue Unifiée` supprimée, `Transactions` couvre 100% des paiements via vue SQL
3. Téléchargement reçu post-paiement (`CadastralPaymentDialog`) respecte le format admin et affiche les vrais services
4. Badge sidebar « Paiements » reflète tous les paiements pending (cadastre + expertise + permit + publications)
5. Anomalies cliquables (lien profond) + bouton « marquer résolu »
6. `AdminInvoices` charge 50 lignes par page via RPC, stats serveur partout
7. Mode test affiche une bannière sur tous les tabs financiers
8. Bulk update prix : tout-ou-rien + ligne d'audit unique avec ancien/nouveau prix par item

