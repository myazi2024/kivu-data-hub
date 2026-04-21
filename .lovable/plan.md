

## Audit — Organisation comptable des revenus de l'application

### Périmètre

Recensement de toute la chaîne « génération de revenu » : du paiement client jusqu'à la sortie comptable (FEC), en passant par facturation, transactions, rapprochement, commissions revendeurs, avoirs/remboursements et anomalies.

### 1. Schéma actuel — Vue d'ensemble

```text
                    ┌─────────────────── Sources de revenus ────────────────────┐
                    │ Cadastral │ Expertise │ Autorisation │ Mutation │ Titre  │
                    │ (search)  │ (RFI)     │ (Permis)     │ Foncier  │ Foncier│
                    │ Hypothèque│ Lotissement│ Publications (Stripe)            │
                    └────────────────────────────┬─────────────────────────────┘
                                                  │
                              ┌───────────────────┴───────────────────┐
                              ▼                                       ▼
                  payment_transactions                       orders (Stripe kiosque)
                  (toutes méthodes : carte/MoMo)             expertise_payments
                              │                              permit_payments
                              │ trigger                       cadastral_mortgage_payments
                              ▼ sync_invoice_on_tx_completed
                  cadastral_invoices (facture canonique)
                              │
                ┌─────────────┼──────────────┬──────────────┬───────────────┐
                ▼             ▼              ▼              ▼               ▼
        reseller_sales   payment_refunds   cadastral_     billing_      invoice_
        (auto trigger)                    credit_notes   anomalies     reminders
                                          (avoirs)      (écarts)       (relances)
                              │
                              ▼
                  unified_payments_view (vue SQL)
                              │
                              ▼
                  RPC export_fec_period → AdminFECExport (CSV FEC fiscal)
```

### 2. Tables comptables (DB)

| Table | Rôle | Statut |
|---|---|---|
| `payment_transactions` | Journal brut de tous les paiements (toutes méthodes, sources) | ✅ Actif, trigger de sync |
| `cadastral_invoices` | Facture canonique normalisée (numérotation, signature, code DGI) | ✅ Actif, immutable une fois `paid` |
| `orders` | Commandes Stripe (kiosque publications) | ✅ Actif, voie parallèle |
| `expertise_payments` / `permit_payments` / `cadastral_mortgage_payments` | Paiements spécialisés par service | ✅ Actifs |
| `reseller_sales` | Ventes attribuées à un revendeur (commission) | ✅ Auto via trigger `generate_reseller_sale_on_paid_invoice` |
| `payment_refunds` | Remboursements (statut, provider, motif) | ✅ Actif |
| `cadastral_credit_notes` + `cadastral_credit_note_seq_year` | Avoirs (numérotation annuelle) | ✅ Actif |
| `billing_anomalies` + `billing_anomaly_resolutions` | Écarts détectés et résolutions | ✅ Actif (panneau dans dashboard) |
| `invoice_reminders` | Historique des relances impayés | ✅ Actif |
| `archived_invoices` / `archived_transactions` | Archives historiques | ✅ Présent (pas d'UI dédiée d'archivage) |
| `currency_config` | USD ↔ CDF, taux validé serveur | ✅ Actif, `exchange_rate_used` figé sur facture |
| `discount_codes` + `resellers` | Codes promo + agents revendeurs | ✅ Actifs |
| `tax_payment_fees_config` | Frais paiement (taxes) | ✅ Actif |
| `bic_invoice_seq_year` | Compteur annuel pour numérotation | ✅ Actif |
| `billing_config_audit` | Audit toutes modifs config facturation | ✅ Actif (via `logBillingAudit`) |
| `payment_methods_public` | Vue publique safe des méthodes | ✅ Actif |
| `unified_payments_view` | Vue SQL agrégeant invoices + tx + paiements spécialisés | ✅ Actif |

### 3. RPCs / fonctions PostgreSQL

| Fonction | Rôle |
|---|---|
| `get_billing_summary(p_from, p_to)` | KPIs dashboard financier (revenus totaux, par source, par méthode) |
| `sync_invoice_on_tx_completed` | Trigger : marque facture `paid` quand transaction passe `completed` |
| `generate_reseller_sale_on_paid_invoice` | Trigger : crée vente revendeur si code revendeur utilisé |
| `regenerate_orphan_reseller_sales` | Récupère ventes revendeurs manquées (orphelins) |
| `prevent_paid_invoice_mutation` | Trigger : bloque modif d'une facture payée (intégrité comptable) |
| `generate_normalized_invoice_number` / `assign_normalized_invoice_number` / `set_invoice_number` | Numérotation canonique annuelle BIC-YYYY-XXXXXX |
| `create_cadastral_invoice_secure` (+ v2) | Création facture côté serveur (sécurité) |
| `get_reseller_statistics` | Stats revendeurs (commissions, taux conv) |
| `reconcile_tax_records` | Rapprochement taxes |
| `purge_test_billing_data` | Purge données mode test |
| `export_fec_period(_start, _end)` | Génère écritures FEC (Fichier des Écritures Comptables, format fiscal légal) |

### 4. Interfaces admin (sidebar « Facturation & Commerce »)

20 modules présents :

**Suivi & analyse**
- `financial` — Tableau de bord financier (KPIs, graphes, anomalies, mode test) ✅
- `payment-monitoring` — Surveillance temps réel ✅
- `payment-reconciliation` — Rapprochement bancaire ✅
- `transactions` — Liste consolidée avec types `payment | refund | commission | discount` et sources `cadastral | expertise | permit | publication` ✅
- `unified-payments` — Vue unifiée (SQL `unified_payments_view`) ✅

**Documents comptables**
- `invoices` — Factures clients ✅
- `credit-notes` — Avoirs (table dédiée + numérotation annuelle) ✅
- `refunds` — Remboursements (table dédiée, providers) ✅
- `invoice-reminders` — Relances impayés ✅
- `invoice-template` — Modèle (Identité/Fiscalité/Mise en page/Aperçu) ✅
- `fec-export` — **Export FEC fiscal** (RPC `export_fec_period`, 18 colonnes légales) ✅

**Revendeurs & promotions**
- `commissions` — Commissions à payer ✅
- `reseller-commissions` — Performance ✅
- `reseller-sales` — Ventes (+ régénération orphelins) ✅
- `resellers` — Liste revendeurs ✅
- `discount-codes` — Codes promo ✅

**Configuration**
- `payments` / `payment-methods` / `payment-mode` / `payment-integration` — Moyens, mode test/prod, intégration ✅
- `billing-config` — Frais & tarifs services ✅
- `currency-config` — Devises USD/CDF + taux ✅

### 5. Flux de revenu complet (d'un paiement à la comptabilité)

```text
1. Client paie un service (Stripe ou Mobile Money)
2. Edge function (create-payment / process-mobile-money) crée payment_transactions (status=pending)
3. Webhook Stripe ou simulateur MoMo → status=completed
4. Trigger sync_invoice_on_tx_completed → cadastral_invoices.status=paid + paid_at
5. Trigger generate_reseller_sale_on_paid_invoice → reseller_sales si code utilisé
6. Trigger prevent_paid_invoice_mutation gèle la facture (immutable)
7. Notification utilisateur, accès service accordé
8. Vue unified_payments_view agrège pour reporting
9. RPC get_billing_summary alimente le tableau de bord financier
10. Mensuel : RPC export_fec_period génère le FEC à transmettre à la DGI
11. Cycle d'ajustement : credit_notes (avoirs), payment_refunds (remboursements), invoice_reminders (relances)
12. Anomalies détectées → billing_anomalies + billing_anomaly_resolutions
```

### 6. Points forts

- **Source de vérité unique** : `cadastral_invoices` est canonique, immutable une fois payée (trigger), avec signature et code DGI
- **Intégrité référentielle** : triggers backend garantissent que tx payée ⇒ facture payée ⇒ vente revendeur créée
- **Numérotation conforme** : compteur annuel SQL `bic_invoice_seq_year`, format BIC-YYYY-XXXXXX
- **Conformité fiscale RDC** : export FEC complet (18 colonnes légales), TVA 16% centralisée, mentions DGI obligatoires
- **Séparation devises** : USD base + taux figé `exchange_rate_used` par facture (pas de drift rétroactif)
- **Audit complet** : `billing_config_audit` enregistre toute modif config (via `logBillingAudit` partout)
- **Détection d'anomalies** : table `billing_anomalies` + panneau dédié dans dashboard
- **Récupération orphelins** : RPC `regenerate_orphan_reseller_sales` pour rattraper les ventes manquées
- **Mode test isolé** : trigger anti-prod, RPC `purge_test_billing_data`, banner visuel
- **Vue unifiée SQL** : `unified_payments_view` agrège toutes les sources (cadastral + expertise + permis + publications + mutation + titre foncier)

### 7. Faiblesses & angles morts identifiés

| # | Sujet | Constat | Impact |
|---|---|---|---|
| F1 | **Plan comptable absent** | Aucune table `chart_of_accounts` ni mapping service → compte comptable. L'export FEC est probablement câblé en dur dans la RPC | Difficulté à customiser le plan comptable, dépendance au code SQL |
| F2 | **Pas de période fiscale fermée** | Aucune table `fiscal_period` avec verrouillage (clôture mensuelle/annuelle). Une facture pourrait théoriquement être créée rétroactivement | Risque écart comptable post-clôture |
| F3 | **Pas de reporting TVA** | TVA collectée présente dans factures (16%) mais aucune vue/RPC dédiée « TVA à reverser » par période | Calcul manuel pour déclaration DGI mensuelle |
| F4 | **Archivage sans UI** | Tables `archived_invoices` / `archived_transactions` existent mais aucun module admin pour archiver/restaurer/consulter | Pas d'usage opérationnel actuel |
| F5 | **Devises figées sans historique de taux** | `currency_config` ne semble pas conserver l'historique des taux (juste taux courant). `exchange_rate_used` sur facture compense au cas par cas | Audit changement de taux difficile |
| F6 | **Frais providers non comptabilisés** | `AdminPaymentServiceIntegration` calcule des frais Stripe/MoMo en estimation (50/50 hardcodé), mais ces frais ne sont pas stockés ligne à ligne dans `payment_transactions` | Marge nette imprécise, pas de réconciliation provider |
| F7 | **Pas de balance âgée des créances** | Pas de vue « vieillissement des impayés » (0-30j, 30-60j, 60-90j, 90+) malgré relances présentes | Suivi recouvrement limité |
| F8 | **Commissions revendeurs : payment** | Table `reseller_sales.commission_paid` existe mais pas de workflow de batch payment/écriture comptable du paiement de commission | Suivi des paiements à reseller manuel |
| F9 | **Multi-sources éclatées** | Coexistence `payment_transactions`, `payments`, `orders`, `expertise_payments`, `permit_payments`, `cadastral_mortgage_payments` — la `unified_payments_view` réconcilie mais 6 tables à maintenir | Complexité maintenance et risque d'incohérence |
| F10 | **`commissions` vs `reseller-sales` vs `reseller-commissions`** | 3 modules sidebar concernent les commissions revendeurs, périmètres flous (« à payer » vs « performance » vs « ventes ») | Risque chevauchement UX |
| F11 | **Pas de journal d'écritures comptables interne** | FEC généré à la volée par `export_fec_period`, pas de table `accounting_journal_entries` persistant les écritures (donc pas de modification/réconciliation directe) | Pas d'écritures correctives traçables hors avoirs |
| F12 | **Pas de bilan / compte de résultat** | Tableau de bord financier = revenus + KPIs paiements, pas de P&L (charges, marge brute, EBITDA) | Reporting financier limité aux ventes |
| F13 | **Anomalies sans typologie standardisée** | `billing_anomalies.anomaly_type` est un text libre — pas d'enum ni de catalogue documenté | Risque hétérogénéité et difficile à grouper |
| F14 | **Aperçu modèle facture vs FEC** | Le `dgi_validation_code` est sur la facture mais aucun lien explicite avec une écriture FEC. La conformité « facture certifiée DGI » n'est pas auditée côté FEC | Risque fiscal si contrôle |
| F15 | **Pas de support multi-établissement** | Aucune notion de `establishment_id` / siège vs succursale dans factures | Bloquant si expansion |

### 8. Recommandations priorisées

**P0 — Conformité comptable**
- Créer `fiscal_periods` + RPC `close_fiscal_period(year, month)` qui verrouille les écritures
- Créer `accounting_journal_entries` pour persister les écritures (et permettre correctives)
- Ajouter vue `tva_collected_by_period` pour déclaration mensuelle DGI

**P1 — Maîtrise marge**
- Ajouter colonnes `provider_fee_usd` + `net_amount_usd` sur `payment_transactions`
- Edge functions enregistrent les frais réels remontés par Stripe/MoMo (au lieu de 50/50 estimé)
- Vue `revenue_net_by_period` pour KPI marge réelle dans dashboard

**P2 — Recouvrement**
- Vue `invoices_aging_report` (balance âgée 0-30/30-60/60-90/90+) intégrée dans `invoice-reminders`
- Workflow batch payment commissions revendeurs avec écriture comptable

**P3 — Cohérence UX**
- Fusionner ou clarifier les 3 modules commissions revendeurs (`commissions` / `reseller-commissions` / `reseller-sales`)
- Documenter dans `mem://` la frontière exacte entre `payment_transactions`, `payments`, `orders`, et payments spécialisés
- Standardiser `anomaly_type` en enum + catalogue

**P4 — Archivage / multi-établissement**
- UI minimal pour archived_invoices / archived_transactions
- Sauvegarder historique des taux de change dans `currency_rate_history`
- Préparer support `establishment_id` (nullable) pour évolution future

### Verdict global

L'architecture comptable est **mature pour une plateforme RDC** : facturation canonique immutable, conformité FEC, signature DGI, multi-devises, multi-méthodes, audit centralisé. Les bases techniques (triggers, RPCs, vue unifiée) sont solides.

Les **gaps prioritaires** sont :
1. Absence de **clôture périodique fiscale** (P0)
2. Absence de **journal d'écritures comptables** interne (P0)
3. Absence de **reporting TVA dédié** (P0)
4. **Frais providers non comptabilisés** finement (P1)
5. Absence de **balance âgée** (P2)

Les autres faiblesses (multi-modules commissions, archivage sans UI, multi-établissement) sont du **nice-to-have** ou du **nettoyage UX**.

