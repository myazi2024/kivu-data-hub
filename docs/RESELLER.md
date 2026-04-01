# Module Revendeur

## Architecture

Les revendeurs (partenaires) ont le rôle `partner` dans `user_roles` et accèdent à `/reseller`.

## Fonctionnalités

### Dashboard Revendeur (`ResellerDashboard`)
- Vue d'ensemble des ventes et commissions
- Statistiques par période
- Historique des transactions

### Codes Promo (`discount_codes`)
- Chaque revendeur peut avoir des codes promo associés
- Structure : `code`, `discount_percentage`, `discount_amount_usd`, `max_usage`, `usage_count`, `expires_at`
- Les codes sont validés lors de la facturation cadastrale
- Le montant de réduction est enregistré sur la facture (`discount_code_used`, `discount_amount_usd`)

### Admin
- `AdminResellers` — Gestion des revendeurs
- `AdminResellerCommissions` — Configuration des commissions
- `AdminDiscountCodes` — Gestion des codes promo
- `AdminCommissions` — Suivi des commissions

### Hooks
- `useResellers` — CRUD revendeurs
- `useResellerSales` — Ventes par revendeur
- `useResellerStatistics` — Statistiques agrégées
- `useDiscountCodes` — Gestion des codes

## Accès
- Route `/reseller` protégée par `ProtectedRoute` avec `requiredRoles={['partner', 'admin', 'super_admin']}`
- Page `/partnership` publique pour les candidatures
- Page `/about-discount-codes` publique pour expliquer le fonctionnement
