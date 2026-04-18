

## Audit — Espace admin "Facturation & Commerce"

### 1. Périmètre

15 composants admin (~6 138 LOC) répartis en 5 familles :

| Famille | Composants principaux | LOC |
|---|---|---|
| Configuration paiement | `AdminPaymentMethods` (768), `AdminPaymentMode` (370), `AdminPaymentServiceIntegration` (505), `AdminCurrencyConfig` (184) | 1 827 |
| Facturation tarifs | `AdminBillingConfig` (579) | 579 |
| Vue opérationnelle | `AdminInvoices` (393), `AdminPayments` (293), `AdminTransactions` (338), `AdminPaymentMonitoring` (319), `AdminPaymentReconciliation` (294) | 1 637 |
| Commerce/Revendeurs | `AdminResellers` (470), `AdminDiscountCodes` (640), `AdminCommissions` (367), `AdminResellerCommissions` (263) | 1 740 |
| Synthèse | `AdminFinancialDashboard` (355) | 355 |

### 2. État BD réel — anomalies critiques

| # | Anomalie | Mesure | Sévérité |
|---|---|---|---|
| **A1** | **100 % des factures sont des tests** : 1 170/1 170 marquées `TEST` (parcel_number/email). 702 "payées", 468 "pending". Revenu déclaré 10 429 USD = entièrement fictif. | 1170/1170 | **Critique** |
| **A2** | **100 % des transactions de paiement sont test/bypass** : 712/712 avec provider `TEST_SIMULATION` ou méthode `TEST`. Aucun paiement réel jamais traité en prod. | 712/712 | **Critique** |
| **A3** | **10 transactions complétées pointent vers des factures non payées** (`tx.status=completed` mais `invoice.status≠paid`) → désynchro webhook/trigger | 10 | Élevée |
| **A4** | **Aucun trigger** sur `cadastral_invoices`, `payment_transactions`, `discount_codes`, `reseller_sales`, `orders`, `expertise_payments`. Synchronisation 100 % côté Edge Functions/client → fragile | 0 trigger | Élevée |
| **A5** | **234 factures avec `discount_amount_usd > 0` mais `discount_code_used IS NULL`** → traçabilité du code rompue, commission revendeur impossible | 234/234 | Élevée |
| **A6** | **0 vente revendeur** (`reseller_sales`=0) malgré 4 revendeurs et 234 factures avec remise → pipeline de commission **non câblé** | 0 sales | **Critique** |
| **A7** | **117 paiements expertise en attente > 24 h** (`expertise_payments` pending stale) | 117 | Élevée |
| **A8** | **468 factures pending stale** (>7 j) → aucune purge/relance auto | 468 | Élevée |
| **A9** | **4 codes promo expirés mais `is_active=true`** → toujours utilisables si check fait sur `is_active` seul | 4/5 | Moyenne |
| **A10** | **71 demandes titre foncier `pending` payment** + 0 `mutation pending` (OK) | 71 | Moyenne |

### 3. Audit fonctionnel UI

| # | Manque/Risque | Sévérité |
|---|---|---|
| F1 | `AdminInvoices` filtre les TEST côté client (`limit 2000`) → si TEST purgés un jour OK, mais ne montre **aucune facture réelle** aujourd'hui (toutes sont test) | Élevée |
| F2 | **Pas de purge** des factures/transactions TEST dans l'admin | Élevée |
| F3 | **Pas de réconciliation auto** : `AdminPaymentReconciliation` existe (294 LOC) mais 10 incohérences invoice/tx non détectées | Élevée |
| F4 | **Aucun écran "ventes revendeur"** alors que `reseller_sales` vide → la table n'est jamais alimentée par le webhook Stripe / mobile money | Critique |
| F5 | **`AdminCommissions` + `AdminResellerCommissions`** : doublon (367+263 LOC, rôles flous) | Moyenne |
| F6 | **Pas de relance automatique** des factures `pending > 7j` (468 lignes) | Moyenne |
| F7 | **Pas d'expiration auto** des codes promo (cron absent comme pour CCC) | Moyenne |
| F8 | **`AdminFinancialDashboard`** affiche revenus = somme `cadastral_invoices` payées → **10 429 USD entièrement fictifs** sans bandeau d'alerte mode test | Élevée |
| F9 | **`AdminPaymentMethods` 768 LOC** > seuil 1000 proche, modularisation conseillée | Faible |
| F10 | **Pas de timeline transaction** (création → tentative → webhook → completion) dans `AdminTransactions` | Moyenne |
| F11 | **Pas d'audit log** des modifications admin sur tarifs (`AdminBillingConfig`, `AdminExpertiseFeesConfig`, etc.) | Moyenne |
| F12 | **Pas de vue unifiée** des 5 sources de paiement (`cadastral_invoices`, `expertise_payments`, `mutation_requests`, `land_title_requests`, `orders`) — admin doit naviguer entre 5 écrans | Moyenne |
| F13 | **`exchange_rate_used` jamais utilisé** (0 transaction CDF) → mais infra prête. Pas d'alerte si taux >24h ancien | Faible |
| F14 | **Pas de détection anomalie** : aucun écran ne flague les 234 remises sans code, ni les 10 tx désynchro | Élevée |

### 4. Sécurité & cohérence

- **A4 = risque architectural** : tout repose sur les Edge Functions (`stripe-webhook`, `process-mobile-money-payment`) pour synchroniser facture↔transaction. Sans trigger BD garde-fou, un webhook qui échoue laisse l'incohérence (10 cas observés A3).
- **A6 = manque à gagner** : 234 factures avec remise → aucune commission générée pour les 4 revendeurs. Pipeline cassé entre `cadastral_invoices.discount_code_used` et `reseller_sales`.
- **A1/A2 = mode prod indéfini** : il faut confirmer que le projet n'a effectivement encore aucun client réel, ou que les TEST polluent la prod.

### 5. Recommandations priorisées

**P0 — Critique BD (migration + insert + cron)**
1. **Purger** ou archiver les 1 170 factures TEST + 712 transactions TEST (table `archived_*`).
2. **Trigger `sync_invoice_on_tx_completed`** : quand `payment_transactions.status='completed'`, forcer `cadastral_invoices.status='paid'` + propager à `orders/expertise/mutation/land_title` selon `metadata.payment_type`.
3. **Trigger `generate_reseller_sale_on_paid_invoice`** : quand facture passe `paid` ET `discount_code_used IS NOT NULL` → insérer `reseller_sales` avec commission calculée (rétro-actif sur les 234).
4. **Trigger `enforce_discount_code_traceability`** : `discount_amount_usd > 0` ⇒ `discount_code_used NOT NULL` (validation BD).
5. **Cron `expire_discount_codes`** : passer `is_active=false` quand `expires_at < now()` (style CCC codes).
6. **Cron `auto_cancel_stale_pending`** : `cadastral_invoices` + `expertise_payments` pending > 30j → `cancelled` + notification user.

**P1 — UX admin**
7. **Bandeau "Mode test actif"** dans `AdminFinancialDashboard` quand >50 % du volume = TEST.
8. **Onglet "Anomalies"** dans `AdminPaymentReconciliation` : tx désynchros, remises sans code, codes expirés actifs (vue agrégée).
9. **Écran `AdminResellerSales`** : liste des ventes générées + bouton "Régénérer rétro" sur les 234 factures orphelines.
10. **Vue unifiée paiements** : un seul tableau qui agrège les 5 sources avec colonne `payment_type`.
11. **Bouton "Purger TEST"** + confirmation double dans `AdminInvoices` / `AdminTransactions`.
12. **Action "Relancer client"** sur factures pending stale (email auto).
13. **Fusion** `AdminCommissions` + `AdminResellerCommissions` en un seul écran à onglets.

**P2 — Évolutions**
14. **Audit log** `billing_config_audit` (qui a changé quel tarif quand).
15. **Modulariser** `AdminPaymentMethods` (768 LOC) en sous-vues par provider.
16. **Timeline transaction** dans `AdminTransactions` (events JSON).
17. **Alerte taux de change ancien** (>24 h) dans `AdminCurrencyConfig`.
18. **Export comptable** mensuel (CSV multi-source pour comptable).

### 6. Question

Quel périmètre dois-je implémenter ?

- **(A) P0 uniquement** — purge BD + 4 triggers + 2 crons + rétro-génération `reseller_sales` (~1 h, surtout SQL)
- **(B) P0 + P1** — ajoute bandeau test, onglet anomalies, vue unifiée, écran ventes revendeur, bouton purge (~2 h 30)
- **(C) Plan complet P0+P1+P2** — ajoute audit log tarifs, modularisation, timeline, export comptable (~4 h)

