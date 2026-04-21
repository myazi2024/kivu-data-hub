---
name: Reseller commissions unified
description: Refonte 3→2 modules revendeurs (AdminResellers + AdminResellerCommissions à onglets Synthèse/Ventes/Paiements), vue reseller_commissions_summary, sidebar simplifiée
type: feature
---

## Commissions revendeurs unifiées (Lot 3)

### Avant
3 entrées sidebar : `AdminResellers` + `AdminResellerCommissions` (analytique) + `AdminResellerSales` (liste plate)

### Après
2 entrées : `AdminResellers` (CRUD) + `AdminResellerCommissions` (consolidé)

### DB
- Vue `reseller_commissions_summary` (security_invoker) : par revendeur — `total_sales_usd`, `total_commission_usd`, `commission_paid_usd`, `commission_pending_usd`, `sales_count`, `last_payout_at`
- Source : `resellers` LEFT JOIN `reseller_sales` (commission_paid bool, commission_earned_usd, commission_paid_at)

### UI `AdminResellerCommissions` (fusion Sales + Commissions)
- 4 KPI globaux : Ventes / Commissions générées / À payer / Revendeurs actifs
- Onglet **Synthèse** : tableau revendeur (taux, ventes, CA, payé, dû, dernier paiement) avec recherche
- Onglet **Ventes** : historique plat 500 dernières ventes (date, revendeur, facture, montant, commission, statut)
- Onglet **Paiements** : historique versements + renvoi vers « Commissions à payer » pour génération batch
- Bouton « Régénérer ventes orphelines » (RPC `regenerate_orphan_reseller_sales`) si écart détecté

### Sidebar
- `reseller-sales` retiré
- `reseller-commissions` renommé « Commissions revendeurs » avec keywords combinés
- `Admin.tsx` : route `reseller-sales` supprimée (le composant `AdminResellerSales.tsx` reste sur disque mais n'est plus chargé)

### Hors périmètre
- Refonte modèle commission (% fixe inchangé)
- Paiements automatisés (toujours manuels via batch payout)
