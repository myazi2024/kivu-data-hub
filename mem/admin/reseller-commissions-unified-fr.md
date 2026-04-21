---
name: Reseller commissions unified
description: Sidebar séparée Payouts revendeurs (opérationnel) vs Commissions revendeurs (analytique), vue reseller_commissions_summary, RPC orphelins serveur sans limite
type: feature
---

## Commissions revendeurs — séparation finale (Lot 3 + Cleanup)

### Sidebar (section Facturation & Commerce)
- **Payouts revendeurs** (`AdminCommissions`) — vue opérationnelle finance : table brute des commissions à verser, sélection multiple, marquage payé en lot.
- **Commissions revendeurs** (`AdminResellerCommissions`) — vue analytique : synthèse par revendeur (3 onglets Synthèse/Ventes/Paiements), KPI globaux.
- Cross-link explicatif (encart `bg-muted/40 border-dashed`) en tête de chaque module pour lever l'ambiguïté.
- `AdminResellerSales.tsx` **supprimé** (code mort, fonctionnalité absorbée par l'onglet Ventes de `AdminResellerCommissions`).

### DB
- Vue `reseller_commissions_summary` (security_invoker) : par revendeur — `total_sales_usd`, `total_commission_usd`, `commission_paid_usd`, `commission_pending_usd`, `sales_count`, `last_payout_at`
- RPC `regenerate_orphan_reseller_sales` : régénération serveur sans limite
- RPC `get_orphan_reseller_invoices_count()` (SECURITY DEFINER, search_path public) : compte serveur des factures payées avec code promo sans `reseller_sales` correspondante. Remplace le scan client limité à 2000 factures.

### UI `AdminResellerCommissions`
- 4 KPI globaux : Ventes / Commissions générées / À payer / Revendeurs actifs
- Onglet **Synthèse** : tableau revendeur + recherche
- Onglet **Ventes** : 500 dernières ventes
- Onglet **Paiements** : historique versements + renvoi vers « Payouts revendeurs » pour génération batch
- Bouton « Régénérer N orphelines » alimenté par RPC serveur

### Hors périmètre
- Refonte modèle commission (% fixe inchangé)
- Paiements automatisés (toujours manuels)
