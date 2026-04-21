

## Cleanup Lot 3 — Code mort & clarification commissions

### Objectifs
Éliminer les résidus de la refonte commissions/recouvrement et clarifier la séparation des responsabilités entre les modules de paiement aux revendeurs.

### Changements

**1. Suppression code mort**
- Supprimer `src/components/admin/AdminResellerSales.tsx` (plus référencé nulle part — fonctionnalité absorbée par l'onglet « Ventes » de `AdminResellerCommissions`).
- Vérifier qu'aucun import résiduel ne subsiste (`Admin.tsx`, `sidebarConfig.ts`).

**2. Clarification sidebar — section Commerce**
État actuel ambigu : deux entrées proches (`AdminCommissions` = paiements/payouts globaux, `AdminResellerCommissions` = vue revendeurs avec onglet Paiements).
- Renommer `AdminCommissions` → libellé sidebar « Payouts revendeurs » (table brute des virements émis, vue opérationnelle finance).
- Garder `AdminResellerCommissions` sous « Commissions revendeurs » (vue analytique/synthèse par revendeur).
- Ajouter un cross-link en haut de chaque module vers l'autre, avec un encart explicatif court (1 ligne) pour lever l'ambiguïté.

**3. Scaling régénération orphelines**
- Déplacer la logique de scan orphelins de `AdminResellerCommissions` (limite client 2000 factures) vers une RPC SQL `get_orphan_reseller_invoices_count()` + adapter `regenerate_orphan_reseller_sales` pour traiter sans limite côté serveur.
- L'UI affiche juste le compteur retourné par la RPC + bouton de régénération.

**4. Mémoire**
- Mettre à jour `mem://admin/reseller-commissions-unified-fr.md` pour refléter la séparation finale Payouts vs Commissions et la RPC orphelins serveur.

### Fichiers touchés
- Suppression : `src/components/admin/AdminResellerSales.tsx`
- Édition : `src/components/admin/AdminResellerCommissions.tsx`, `src/components/admin/AdminCommissions.tsx`, `src/components/admin/sidebarConfig.ts`
- Migration SQL : nouvelle RPC `get_orphan_reseller_invoices_count` + ajustement `regenerate_orphan_reseller_sales`
- Mémoire : `mem://admin/reseller-commissions-unified-fr.md`

### Hors scope
- Pas de refonte UI des modules existants
- Pas de changement RLS
- Pas de modification edge functions

