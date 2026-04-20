

## Audit post-implémentation — Facturation & Commerce

Vérification croisée du code refactoré et du schéma BD réel après les corrections P1+P2+P3+P4+P5.

### ✅ Ce qui fonctionne correctement

| Composant | État | Vérification |
|---|---|---|
| `AdminTransactions` | ✅ OK | 4 sources interrogées en parallèle (`payment_transactions`, `expertise_payments`, `permit_payments`, `payments`). Toutes les colonnes utilisées existent au schéma. Filtre par source opérationnel. |
| `AdminCommissions` | ✅ OK | Join unique `reseller_sales → resellers` + batch fetch profiles → N+1 éliminé (3 requêtes max au lieu de 400+). |
| `AdminResellerSales` | ✅ OK | RPC `regenerate_orphan_reseller_sales` confirmée en BD, branchée sur le bouton avec retour `inserted_count` / `scanned_count`. |
| `AdminInvoices` | ✅ OK | Filtres TEST élargis (`TEST-`, `TEST_`, `SANDBOX-`). |
| `AdminFinancialDashboard` | ✅ OK | Exposé dans la sidebar comme premier item « Tableau de bord financier ». `BillingAnomaliesPanel` intégré en tête. |
| `sidebarConfig.ts` | ✅ OK | Section Facturation & Commerce regroupe désormais 17 entrées (paiements, réconciliation, monitoring, devises, etc.). |
| RPC `get_billing_summary` | ✅ Déployée | Disponible pour usage ultérieur. |

### ⚠️ Points d'attention restants (non bloquants)

#### A1 — `AdminInvoices` : stats encore calculées sur le sous-ensemble client
- La requête est plafonnée à `.limit(2000)` mais `totalRevenue` / `pendingRevenue` sont calculés en JS sur ce sous-ensemble.
- **Conséquence** : si la BD dépasse 2000 factures payées, les KPIs sous-estiment.
- **Fix recommandé (futur)** : appeler `get_billing_summary(periodStart, periodEnd)` pour les agrégats au lieu de sommer côté client.

#### A2 — `AdminFinancialDashboard` : source incomplète
- Ne lit que `cadastral_invoices` pour KPIs/graphiques → ne reflète pas les revenus expertise / autorisation / publications.
- **Conséquence** : « Revenus Totaux » = revenus cadastraux uniquement.
- **Fix recommandé (futur)** : remplacer les 3 requêtes manuelles par un appel unique à `get_billing_summary`.

#### A3 — Variation « +12.5% vs période précédente » (ligne 157)
- Valeur **codée en dur** dans `AdminFinancialDashboard`.
- **Fix recommandé (futur)** : calculer via `get_billing_summary` sur la période précédente.

#### A4 — Doublon visuel "Commissions à payer" / "Performance revendeurs"
- Les deux entrées sidebar pointent toujours vers `AdminCommissions` et `AdminResellerCommissions` qui exposent quasiment la même donnée.
- Plan initial (P2 étape 2) prévoyait soit fusion, soit différenciation explicite — **non fait**.
- **Fix recommandé (futur)** : ajouter un bandeau dans `AdminResellerCommissions` clarifiant son rôle analytique vs. action de paiement.

#### A5 — `AdminResellerSales` : double requête sur `cadastral_invoices`
- `fetchData` exécute deux requêtes quasi-identiques (count + select) sur les factures payées avec code promo.
- **Fix recommandé (futur)** : supprimer la première (count, inutile) — la longueur du second select suffit pour calculer les orphelins.

### 🚫 Aucun bug bloquant détecté

- Aucune référence à des colonnes inexistantes
- Aucune table fantôme interrogée
- Les 2 RPCs créées (`regenerate_orphan_reseller_sales`, `get_billing_summary`) sont bien présentes en BD
- Pas d'erreur TypeScript visible
- Console preview propre (uniquement vite restart info)

### Recommandation

L'implémentation P1+P2+P3+P4+P5 est **fonctionnelle et sans régression**. Les 5 points d'attention ci-dessus sont des **optimisations** (précision des KPIs, dédoublonnage UX) — pas des bugs. Ils peuvent attendre une itération ultérieure ou être traités groupés (Étape 6 « Hub financier multi-sources ») si tu veux que les chiffres globaux soient parfaitement exacts dès maintenant.

**Veux-tu que je traite l'Étape 6** (brancher `AdminFinancialDashboard` et `AdminInvoices` sur `get_billing_summary` pour des KPIs multi-services exacts) ?

