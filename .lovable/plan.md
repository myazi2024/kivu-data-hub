

## Audit — Contrôle, configuration et gestion des lotissements (espace admin)

### État des lieux

**3 entrées admin** dédiées au lotissement :
- `subdivision-requests` → `AdminSubdivisionRequests` (628 LOC) — gestion des demandes
- `subdivision-fees-config` → `AdminSubdivisionFeesConfig` (262 LOC) — tarifs $/m²
- Inclus dans `AdminConfigHub`, `AdminRequestsHub`, `BillingOverviewTab`, mode test

**Tables BD** : `subdivision_requests` (47 col., RLS OK), `subdivision_lots`, `subdivision_roads`, `subdivision_rate_config` (2 lignes seed urban/rural `*`).

**Edge functions** : `subdivision-request` (création + calcul fee server-side), `approve-subdivision` (approve/reject/return atomique avec rollback lots).

### Constats — points forts

| ✅ Élément | Détail |
|---|---|
| Calcul frais server-side | `subdivision-request` est source de vérité (rate × surface, min/max par lot) |
| Approbation atomique | `approve-subdivision` insère lots + flag `is_subdivided` + rollback si insertion lots échoue |
| Statuts EN normalisés | `pending/in_review/approved/rejected/returned/awaiting_payment/completed` |
| Workflow renvoi | Action « Renvoyer pour correction » avec motif obligatoire |
| Certificat auto | `generateAndUploadCertificate('lotissement', …)` après approve |
| RLS complet | 4 tables couvertes, séparation user/admin/public-approved |
| Documents privés | Bucket `cadastral-documents` + signed URL 1h |
| Pass-through hub | Inclus dans `AdminRequestsHub`, `AdminHistoryHub`, `AdminConfigHub` |

### Constats — manques et lacunes

#### A. Configuration des règles de zonage (gap critique)

> **C'est exactement ce que l'utilisateur a demandé en Lot 1 du chantier en cours.**

`subdivision_rate_config` ne contient **que des tarifs** — aucune règle de contrôle des mesures. Conséquences :
- Pas de **surface min/max par lot** par zone
- Pas de **largeur min/recommandée des voies** par zone
- Pas de **% min d'espaces communs**
- Pas de **front route minimum**
- Pas de **nombre max de lots** par parcelle mère
- L'algorithme post-tracé (validation des lots et voies utilisateurs) **n'a aucune source de vérité** pour valider

**À créer** : table `subdivision_zoning_rules` (ou extension de `subdivision_rate_config`) + UI admin dédiée.

#### B. Demandes — workflow incomplet

- **Pas de bouton « Mettre en examen »** (`in_review`) — passage direct pending→approved/rejected/returned
- **Pas d'assignation** (`assigned_to`) — toute la file est partagée
- **Pas de SLA visible** — le champ `estimated_processing_days` existe en BD mais n'est ni affiché ni configuré
- **Pas de filtre dates** ni de tri par âge / urgence
- **Pas d'export CSV** des demandes
- **Pas de bulk action** (approbation/rejet groupés)
- **Pas d'audit log** spécifique des décisions admin (qui a approuvé quoi, motif, ancien/nouveau statut) — `audit_logs` générique non utilisé ici
- **Pas de highlight escalade** alors que `escalated`/`escalated_at` existent en BD
- **Pas de visualisation du plan** (lots + voies + espaces) sous forme de mini-canvas dans le détail — uniquement listes textuelles

#### C. Validation post-tracé inexistante

Aujourd'hui une demande passe en `pending` même si :
- 1 lot fait 2 m² (pas de min)
- Aucune voie tracée alors que la zone l'exige
- Surface lots > surface parcelle mère
- Voies < 3 m de large

**À créer** : RPC `validate_subdivision_against_rules(request_id)` exécutée :
1. Côté front (pré-soumission, bandeau d'aide)
2. Côté admin (badge « ⚠️ Non conforme : Lot 3 < min, Voie A < largeur min »)

#### D. Tarification — limitations

- Pas de **tarif par taille de lot** (palier dégressif)
- Pas de **frais d'aménagement voirie** (au mètre linéaire)
- Pas de **frais espaces communs**
- Pas d'**aperçu de calcul** dans l'admin (« si je demande 5 lots de 200m² à Goma → X $ »)
- Pas d'**audit** des changements de tarifs (`system_config_audit` ne couvre pas cette table — à vérifier)

#### E. Lots & voies générés — sans gestion admin

Tables `subdivision_lots` et `subdivision_roads` sont **alimentées** par `approve-subdivision` mais **aucun écran admin** ne permet :
- De lister tous les lots créés (vue cadastrale globale)
- De corriger une erreur de saisie post-approbation
- De voir l'historique de modification d'un lot

#### F. Suivi & analytics absents

- Aucun KPI dédié (volume mensuel, surface totale lotie, délai moyen, taux d'approbation/rejet/renvoi)
- Pas de carte de chaleur des zones avec le plus de demandes
- Pas d'export pour la DGI / cadastre national

### Plan d'action proposé (en 4 lots)

#### Lot 1 — Règles de zonage (priorité 1, demandé par l'utilisateur)

| Livrable | Détail |
|---|---|
| Table `subdivision_zoning_rules` | `section_type`, `location_name`, `min_lot_area_sqm`, `max_lot_area_sqm`, `min_road_width_m`, `recommended_road_width_m`, `min_common_space_pct`, `min_front_road_m`, `max_lots_per_request`, `notes`, `is_active` |
| Composant `AdminSubdivisionZoningRules.tsx` | CRUD identique au pattern `AdminSubdivisionFeesConfig` + filtres urban/rural + fallback `*` |
| Onglet sidebar | « Règles de zonage » sous « Demandes & Procédures » |
| Hook front `useZoningRules(zone)` | Consommé par `LotCanvas` pour bandeau d'aide live |
| RPC `validate_subdivision_against_rules(request_id)` | Retourne `{ valid: bool, violations: [...] }` |
| Audit | Inclure cette table dans `system_config_audit` |

#### Lot 2 — Hardening de la file admin

- Bouton « Mettre en examen » + colonne assignation (`assigned_to uuid`)
- Affichage SLA (`estimated_processing_days` − âge), badge orange dès 80%, rouge si dépassé
- Highlight `escalated = true` + cron escalade (J+SLA sans décision)
- Filtres date_from/date_to, tri par âge
- Export CSV (filtres appliqués)
- Audit log dédié `subdivision_admin_actions` (action, before, after, motif, admin_id, ts)
- Badge « ⚠️ Non conforme » sur la ligne si la RPC de validation échoue

#### Lot 3 — Visualisation & gestion des lots

- Mini-canvas SVG read-only dans le détail (réutilise `LotCanvas` en mode `viewerOnly`)
- Nouvel onglet « Lots & voies créés » (table globale `subdivision_lots` + filtres)
- Édition admin d'un lot post-approbation (avec audit + notification user)

#### Lot 4 — Analytics & enrichissement tarifaire

- Dashboard `AdminSubdivisionAnalytics` : volumes, surface lotie, délai moyen, taux décisions, top zones
- Tarifs par paliers (rate_per_sqm dégressif au-delà de N m²)
- Frais voirie au m linéaire + frais espaces communs
- Aperçu de calcul dans `AdminSubdivisionFeesConfig`
- Couverture `system_config_audit` sur `subdivision_rate_config` et `subdivision_zoning_rules`

### Recommandation immédiate

Commencer par le **Lot 1** : c'est le bloquant produit (l'utilisateur l'a déjà demandé pour le designer grand public), et il débloque ensuite la validation post-tracé du Lot 2. Les Lots 3 et 4 sont des améliorations qualité / observabilité.

