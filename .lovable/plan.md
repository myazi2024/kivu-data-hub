

## Audit du catalogue de services — `/cadastral-map`

### Méthode
Source unique : table `cadastral_services_config` (5 services actifs) + hook réactif `useCadastralServices` + `evaluateServiceAvailability` (règles JSONB) + `CadastralBillingPanel` / `ServiceListItem`. Croisé avec les ventes réelles (`cadastral_invoices.selected_services`).

### Catalogue actuel (5 services actifs)

| # | service_id | Nom | Prix USD | Icône | Achats | Règle dispo |
|---|---|---|---|---|---|---|
| 1 | `information` | Informations générales | 1.50 | FileText | **702** | `always_true` |
| 2 | `location_history` | Localisation et Historique de bornage | 2.00 | FileText | **527** | province+ville OU `boundary_history[]` OU `gps_coordinates[]` |
| 3 | `history` | Historique des propriétaires | 3.00 | FileText | **175** | `ownership_history[]` non vide |
| 4 | `obligations` | Obligations fiscales et hypothécaires | 15.00 | FileText | **0** | `tax_history[]` OU `mortgage_history[]` |
| 5 | `land_disputes` | Litiges fonciers | 6.99 | Scale | **0** | `always_true` |

### Constats

**1. Deux services actifs jamais vendus (taux conversion = 0 %)**
- `obligations` (15 USD) : prix le plus élevé du catalogue × 10 vs `information`. Peut indiquer prix dissuasif, manque de données (`tax_history` / `mortgage_history` rarement présents → service grisé), ou intitulé peu lisible. À diagnostiquer (échantillon de parcelles avec règle `true` vs sans).
- `land_disputes` (6.99 USD) : règle `always_true` donc toujours sélectionnable → l'absence de vente n'est pas un problème de disponibilité. Vraisemblablement problème de visibilité/valeur perçue.

**2. Iconographie redondante** : 4 services sur 5 utilisent `FileText`. Aucune différenciation visuelle, alors que `lucideIconMap` expose Map, History, Receipt, Scale, ShieldCheck. Mapping sémantique recommandé : `information→Info`, `location_history→MapPin`, `history→History`, `obligations→Receipt`, `land_disputes→Scale`.

**3. Couverture fonctionnelle incomplète vs services BIC existants**
La page `/services` propose 8 thèmes (titre foncier, expertise, mutation, hypothèque, historique fiscal, autorisation de bâtir…) mais seuls 5 figurent au catalogue acheté depuis la fiche cadastrale. Items absents en achat à la carte mais déjà modélisés ailleurs :
- `mortgage_check` (Vérifier hypothèque) — distinct d'`obligations`, lecture seule rapide.
- `tax_history_only` (Historique fiscal seul) — séparer du bundle `obligations` pourrait débloquer l'achat (15 USD est probablement trop pour un consultant qui ne veut que la fiscalité).
- `building_permits_history` (Historique des autorisations de bâtir) — donnée existe déjà côté CCC.
- `subdivision_status` (Statut lotissement) — `is_subdivided` est déjà sélectionné côté carte.
- `cadastral_certificate` (Fiche cadastrale PDF officielle) — déjà générée par `generateCadastralReport` mais non monétisée à la carte.

**4. Règles de disponibilité asymétriques**
- `information` et `land_disputes` = `always_true` : aucune garantie que la donnée existe vraiment côté affichage. Risque d'achat « vide ».
- À l'inverse `obligations` exige des historiques rarement peuplés → invendable. Asymétrie incohérente.

**5. Tarification non documentée**
Pas de logique tarifaire visible (1.5 / 2 / 3 / 6.99 / 15). Le saut 3 → 15 sur `obligations` est suspect. Aucun palier, aucun bundle, aucune remise volume au catalogue (les codes promo existent mais sont génériques).

**6. Métadonnées catalogue manquantes**
Pas de champs `category` (consultation / juridique / fiscal), `estimated_delivery`, `sample_preview_url`, `legal_disclaimer`. Difficile pour l'utilisateur de comparer.

**7. UX `ServiceListItem`**
- Description tronquée masquée derrière chevron (taux d'expansion non tracké).
- Pas de badge « populaire » / « nouveau » alors que la BD pourrait piloter via `display_order` ou un futur `tag`.
- État « Données manquantes » → bouton « Compléter les données » (CCC) existe : bon. Mais pas de tracking analytics.

**8. Observabilité catalogue**
Aucun event analytics dédié : `cadastral_service_view`, `cadastral_service_select`, `cadastral_service_purchase` absents (la carte trace `cadastral_map_*` mais pas les services). Impossible de mesurer scientifiquement le funnel sélection → achat.

**9. Cohérence multi-écran**
`Services.tsx` (8 cartes thématiques) n'est pas relié au catalogue BD : tous les `action()` redirigent vers `/cadastral-map` sans preselect. Le catalogue payant et le catalogue éditorial sont déconnectés.

**10. Gouvernance**
- Pas de soft-delete tracé dans `system_config_audit` pour `cadastral_services_config` (à vérifier vs mémoire `map-config-admin-audit-fr`).
- Pas de versioning de prix : un changement de prix s'applique rétroactivement à toutes les factures futures sans historique.

### Recommandations priorisées

**P0 — Corriger l'invendable**
- Diagnostic `obligations` : mesurer % parcelles où la règle est satisfaite ; si <10 %, scinder en `tax_history` (5 USD) + `mortgage_check` (5 USD) ; sinon revoir le prix à ~7-8 USD.
- Diagnostic `land_disputes` : même règle `always_true` que `information` mais 0 vente → problème de valeur perçue, pas de dispo. Ajouter aperçu (« 0 litige actif sur cette parcelle » visible sans achat, détails payants).

**P1 — Différencier visuellement**
- Mapper icônes sémantiques (admin BD, pas de code).
- Ajouter colonne `category` (consultation / juridique / fiscal) + badge couleur.

**P2 — Étendre le catalogue**
- Ajouter 3 services : `cadastral_certificate_pdf`, `building_permits_history`, `subdivision_status`. Tous les trois ont leurs données déjà disponibles.

**P3 — Observabilité & gouvernance**
- Events analytics : `service_view`, `service_select`, `service_unselect`, `service_purchase` (utiliser `trackEvent` déjà présent).
- Table `cadastral_services_price_history` (audit prix) + trigger.
- Vue admin `cadastral_services_performance` (achats 30j, taux conversion, revenu).

**P4 — Cohérence cross-écran**
- `Services.tsx` → preselect catalogue via querystring `?preselect=land_disputes,history`.

### Hors scope de cet audit
Pas de modification de code dans cette plan d'audit. Les recommandations P0-P4 feront chacune l'objet d'un plan d'implémentation dédié si validées.

