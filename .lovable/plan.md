

## Audit — Section "Facturation & Commerce" (admin)

### Périmètre audité (9 entrées sidebar)

| # | Entrée | Composant | État |
|---|---|---|---|
| 1 | Config Facturation | `AdminBillingConfig` | OK (refonte 9 onglets récente) |
| 2 | Devises / Taux | `AdminCurrencyConfig` | OK (audit log présent) |
| 3 | Factures | `AdminInvoices` | ⚠️ Limites & doublons |
| 4 | Transactions | `AdminTransactions` | 🔴 Source incomplète |
| 5 | Commissions | `AdminCommissions` | 🔴 N+1 + doublon avec #6 |
| 6 | Commissions Revendeurs | `AdminResellerCommissions` | ⚠️ Doublon fonctionnel avec #5 |
| 7 | Ventes Revendeurs | `AdminResellerSales` | ⚠️ Bouton "regenerate" non fonctionnel |
| 8 | Revendeurs | `AdminResellers` | OK |
| 9 | Codes de Remise | `AdminDiscountCodes` | OK |

### Problèmes identifiés

#### 🔴 P1 — `AdminTransactions` ne montre que les `payments`, pas les vraies transactions
- La source est `payments` (carte/MoMo de cadastral) → **manque** : achats publications (`orders`), demandes payées (mutation, titre, expertise, autorisation, hypothèque, litige).
- La table unifiée `payment_transactions` (mentionnée dans la mémoire architecture paiement) **n'est pas interrogée**.
- Conséquence : "Journal des Transactions" affiche un sous-ensemble trompeur. Le calcul "Taux de réussite" est faux à l'échelle plateforme.

#### 🔴 P2 — `AdminCommissions` : requêtes N+1 + doublon avec `AdminResellerCommissions`
- Pour chaque vente, deux `select().single()` enchaînés (resellers puis profiles). Sur 200+ ventes → 400+ requêtes séquentielles.
- Doit être remplacé par un join `select('*, resellers(business_name, reseller_code, commission_rate, profiles(...))')` ou un RPC agrégé.
- **Doublon** : `AdminCommissions` + `AdminResellerCommissions` exposent quasiment la même donnée (reseller_sales). À fusionner ou à différencier explicitement (ex : "Commissions à payer" vs "Performance par revendeur").

#### 🔴 P3 — `AdminResellerSales` : bouton "Regénérer orphelins" est un toast vide
- `regenerateOrphans()` ne fait que `toast.info('…trigger lors du prochain passage…')` — aucune action réelle.
- Aucune RPC `regenerate_reseller_sales(invoice_ids[])` exposée. À implémenter ou retirer le bouton.

#### ⚠️ P4 — `AdminInvoices` : limite 2000 + filtre `TEST-%` incomplet
- `.limit(2000)` non paginé côté SQL → invisibles au-delà.
- Le filtre `not('parcel_number', 'ilike', 'TEST-%')` exclut les factures cadastrales TEST mais rate les autres préfixes test (autres services).
- Stats (`totalRevenue`, `pendingRevenue`) calculées sur le sous-ensemble client, donc **fausses** dès que >2000 factures.

#### ⚠️ P5 — Vues éclatées, pas de hub financier
- Pas d'écran "Tableau de bord financier" (alors que `AdminFinancialDashboard.tsx` existe dans le repo mais n'est **pas exposé** dans la sidebar).
- L'admin doit naviguer 5 écrans pour répondre à : "Combien on a encaissé ce mois ? Combien on doit aux revendeurs ? Quel taux d'échec MoMo ?".

#### ⚠️ P6 — Anomalies de facturation présentes mais cachées
- `BillingAnomaliesPanel` existe (3 types : tx complétée/facture impayée, remise sans code, code expiré actif) mais **n'est intégré à aucun écran** de la section.

#### ⚠️ P7 — Réconciliation paiement absente du menu
- `AdminPaymentReconciliation` et `AdminPaymentMonitoring` existent mais ne figurent **pas** dans la sidebar "Facturation & Commerce" (section "Paiements" séparée).
- Cohérence à revoir : tout ce qui touche $ devrait être regroupé.

#### ⚠️ P8 — Doublons avec sections "Paiements"
- Sidebar a aussi : Paiements unifiés, Méthodes de paiement, Mode paiement, Intégration paiement, Monitoring → certains chevauchent Transactions/Factures. Pas de hiérarchie claire.

### Plan de correction proposé

#### Étape 1 (P1, P4) — Source de vérité unique pour transactions/factures
- `AdminTransactions` : interroger `payment_transactions` (vue/table unifiée) au lieu de `payments` seul. Joindre type de service (publication, mutation, ccc, etc.) pour filtrage.
- `AdminInvoices` : ajouter pagination serveur (range), retirer le filtre TEST hardcodé (utiliser `is_test_data` ou registry `test_entities_registry` cf. mémoire test-mode).
- Stats agrégées via RPC `get_billing_summary(date_from, date_to)` plutôt que calcul client.

#### Étape 2 (P2) — Optimiser & dédoublonner commissions
- Remplacer N+1 par un `select` joint unique dans `AdminCommissions`.
- Renommer / réorganiser :
  - `AdminCommissions` → "Commissions à payer" (focus action : marquer payé)
  - `AdminResellerCommissions` → "Performance revendeurs" (focus analytique)
  - Sinon fusionner les deux écrans avec un toggle.

#### Étape 3 (P3) — RPC de régénération des ventes orphelines
- Créer `regenerate_orphan_reseller_sales()` qui scanne `cadastral_invoices` payées avec `discount_code_used` mais sans ligne `reseller_sales` et insère les manquantes (selon trigger existant).
- Brancher le bouton actuel sur cette RPC + afficher count avant/après.

#### Étape 4 (P5, P6) — Hub financier en tête de section
- Exposer `AdminFinancialDashboard` comme premier item de la section "Facturation & Commerce" (label "Tableau de bord financier").
- Y intégrer :
  - KPIs cumulés (revenus 7j/30j/YTD, par service, par méthode)
  - `BillingAnomaliesPanel` (déjà existant)
  - Top revendeurs, taux d'échec MoMo
  - Liens rapides vers Factures/Transactions filtrés

#### Étape 5 (P7, P8) — Restructurer la sidebar
Regrouper sous "Facturation & Commerce" tout ce qui touche $ :
```
Facturation & Commerce
├── 📊 Tableau de bord financier (nouveau, expose AdminFinancialDashboard)
├── 🧾 Factures
├── 💳 Transactions
├── 🔄 Réconciliation (déplacé)
├── 📡 Monitoring paiements (déplacé)
├── 💰 Commissions (à payer)
├── 📈 Performance revendeurs
├── 🏪 Revendeurs
├── 🎟️ Codes de Remise
├── ⚙️ Config Facturation
├── 💱 Devises / Taux
└── 🛠️ Méthodes de paiement (déplacé)
```
Le sous-menu "Paiements" actuel devient un alias historique ou est supprimé.

### Détails techniques

- **Fichiers modifiés** :
  - `src/components/admin/AdminTransactions.tsx` (source = payment_transactions)
  - `src/components/admin/AdminInvoices.tsx` (pagination serveur, RPC stats)
  - `src/components/admin/AdminCommissions.tsx` (join unique)
  - `src/components/admin/AdminResellerSales.tsx` (RPC orphelins)
  - `src/components/admin/sidebarConfig.ts` (regroupement)
  - `src/pages/Admin.tsx` (nouvelle route `financial-dashboard`)
- **Fichiers nouveaux** : aucun (réutilise `AdminFinancialDashboard` existant)
- **Migrations BD** :
  - `regenerate_orphan_reseller_sales()` (SECURITY DEFINER, admin only)
  - `get_billing_summary(p_from date, p_to date)` retournant agrégats
  - Si `payment_transactions` n'est pas une vue prête → créer vue `v_unified_transactions` joignant `payments`, `orders`, `expertise_payments`, etc.
- **Hors périmètre immédiat** : refonte UX du `AdminFinancialDashboard` (déjà autonome) — simplement l'exposer.

### Priorités

1. **P1 + P4 + P5** d'abord (source vérité + hub) → impact maximal sur la fiabilité des chiffres.
2. **P2 + P3** ensuite (perfs commissions + bouton fonctionnel).
3. **P7 + P8** (restructuration sidebar) en finition.

