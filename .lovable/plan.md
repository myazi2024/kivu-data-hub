

## Refacturation pass-through — workflow & contrôle de cohérence

### Contexte
Aujourd'hui les frais providers (Stripe/MoMo) sont stockés sur `payment_transactions.provider_fee_usd` mais absorbés par BIC (`net_amount_usd` = revenu net). Pour certains contrats (revendeurs grands comptes, partenaires institutionnels), ces frais doivent être **refacturés au client final** sous forme de ligne dédiée — avec une facture pass-through générée automatiquement et un contrôle de cohérence garantissant que ce qui est refacturé = ce qui a été réellement payé au provider.

### Objectif
Permettre à l'admin de définir des **règles de refacturation** par contrat (revendeur, partenaire, méthode de paiement), générer automatiquement une **facture pass-through** mensuelle agrégeant les frais réellement supportés, et bloquer toute incohérence entre frais providers réels et montants refacturés.

### Architecture

**1. Table `passthrough_rules`**
Règles configurables par admin :
- `scope_type` (`reseller` | `partner` | `payment_method` | `global`)
- `scope_id` (FK selon scope, null si global)
- `markup_pct` (marge ajoutée sur les frais, ex: 0 = pass-through pur, 5 = +5%)
- `min_amount_usd` (seuil minimum pour générer une facture)
- `billing_cycle` (`monthly` | `quarterly`)
- `active`, `created_by`, `created_at`

**2. Table `passthrough_invoices`**
Factures pass-through générées :
- `period_start`, `period_end`, `scope_type`, `scope_id`
- `total_provider_fees_usd` (somme réelle issue de `payment_transactions`)
- `markup_amount_usd`, `total_billed_usd`, `currency`
- `status` (`draft` | `validated` | `sent` | `paid` | `disputed` | `cancelled`)
- `transaction_count`, `consistency_check_passed` (boolean)
- `invoice_number` (séquence dédiée `PT-YYYYMM-NNNN`)
- `pdf_url`, `sent_at`, `paid_at`

**3. Table `passthrough_invoice_lines`**
Détail ligne par ligne pour traçabilité :
- `passthrough_invoice_id`, `payment_transaction_id`
- `provider`, `provider_fee_usd`, `markup_usd`, `billed_usd`
- `transaction_date`

**4. RPC `generate_passthrough_invoices(period_start, period_end)`**
- SECURITY DEFINER, admin only
- Pour chaque règle active : agrège les `payment_transactions` du scope sur la période
- Vérifie `total_billed_usd = sum(provider_fee_usd) * (1 + markup_pct/100)` → `consistency_check_passed`
- Crée brouillon `passthrough_invoices` + lignes détaillées
- Skip si total < `min_amount_usd`
- Idempotent (clé unique scope + période)

**5. RPC `validate_passthrough_invoice(invoice_id)`**
- Recalcule à partir des `payment_transactions` réelles au moment de la validation
- Bloque si écart > 0.01 USD entre stocké et recalculé
- Passe statut `draft` → `validated`, génère `invoice_number`

**6. Trigger `check_passthrough_consistency`**
- Sur INSERT/UPDATE de `passthrough_invoice_lines`
- Vérifie cohérence ligne par ligne : `billed_usd = provider_fee_usd * (1 + markup/100)`
- Refuse l'opération si écart détecté

**7. Cron mensuel `auto_generate_passthrough`**
- 1er du mois à 02:00 UTC
- Appelle `generate_passthrough_invoices` pour le mois précédent
- Notifie admins via `notifications` (canal `finance`)

### UI Admin — module `AdminPassthroughBilling`
Nouvelle entrée sidebar **Finance → Refacturation pass-through** (`tab=passthrough`).

3 onglets :
- **Règles** : CRUD `passthrough_rules`, toggle actif/inactif, preview impact (somme frais éligibles 30j)
- **Factures** : liste `passthrough_invoices` avec filtres période/statut/scope, badge cohérence (vert/rouge), actions valider/envoyer/annuler, drill-down lignes détaillées, export CSV/PDF
- **Anomalies** : factures avec `consistency_check_passed = false`, factures en `disputed`, transactions éligibles non refacturées (orphelines)

### Sécurité & cohérence
- RLS : lecture/écriture admin uniquement (`has_role(auth.uid(), 'admin')`)
- Toutes RPC en SECURITY DEFINER avec `SET search_path = public`
- Statuts EN normalisés (mémoire `status-normalization-pattern-fr`)
- Écart de tolérance hardcodé à 0.01 USD (cents)
- Vue `passthrough_billing_summary` : KPI total facturé, marge, taux de cohérence (mois courant + 12 derniers mois)

### Mémoire à créer
`mem://admin/passthrough-billing-fr.md` — règles configurables par scope, génération mensuelle automatique, double contrôle cohérence (trigger ligne + RPC validation), idempotence par clé unique scope+période.

### Fichiers
- Migration SQL : tables + RPC + trigger + cron + RLS
- `src/components/admin/AdminPassthroughBilling.tsx` (orchestrateur 3 onglets)
- `src/components/admin/passthrough/PassthroughRulesTab.tsx`
- `src/components/admin/passthrough/PassthroughInvoicesTab.tsx`
- `src/components/admin/passthrough/PassthroughAnomaliesTab.tsx`
- `src/components/admin/passthrough/PassthroughInvoiceDetailDialog.tsx`
- Édition `src/components/admin/sidebarConfig.ts` + `src/pages/Admin.tsx` (lazy import)
- Mémoire + mise à jour `mem://index.md`

### Hors scope
- Pas d'envoi email automatique (reste manuel dans onglet Factures)
- Pas de génération PDF avancée (réutilise `generateInvoicePdf` existant)
- Pas de support multi-devise (USD only en v1, alignement reste de la stack billing)

