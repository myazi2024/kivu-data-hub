# Schéma de Base de Données

## Tables principales

### Parcelles et données cadastrales

| Table | Description | Clés |
|-------|-------------|------|
| `cadastral_parcels` | Parcelles cadastrales | PK: `id`. `parcel_number` unique. `area_hectares` = colonne GENERATED depuis `area_sqm` |
| `cadastral_contributions` | Contributions citoyennes (ajout/modification parcelle) | FK → `cadastral_parcels.id` (optional). Statut: pending/approved/rejected |
| `cadastral_ownership_history` | Historique propriétaires | FK → `cadastral_parcels.id` |
| `cadastral_tax_history` | Historique fiscal | FK → `cadastral_parcels.id` |
| `cadastral_boundary_history` | Historique bornage | FK → `cadastral_parcels.id` |
| `cadastral_building_permits` | Permis de construire (sur parcelle) | FK → `cadastral_parcels.id` |
| `cadastral_mortgages` | Hypothèques | FK → `cadastral_parcels.id` |
| `cadastral_mortgage_payments` | Paiements hypothécaires | FK → `cadastral_mortgages.id` |
| `cadastral_land_disputes` | Litiges fonciers | FK → `cadastral_parcels.id` (optional) |
| `cadastral_boundary_conflicts` | Conflits de limites | Ref: `parcel_number` |

### Services et demandes

| Table | Description |
|-------|-------------|
| `land_title_requests` | Demandes de titre foncier |
| `mutation_requests` | Demandes de mutation foncière |
| `real_estate_expertise_requests` | Demandes d'expertise immobilière (33 colonnes techniques) |
| `subdivision_requests` | Demandes de lotissement |

### Facturation et paiement

| Table | Description |
|-------|-------------|
| `cadastral_invoices` | Factures de services cadastraux |
| `cadastral_service_access` | Accès accordés aux services (post-paiement). FK → `cadastral_invoices.id` |
| `payment_transactions` | Transactions de paiement (toutes méthodes) |
| `payments` | Paiements généraux |
| `orders` | Commandes publications (Stripe) |
| `publication_downloads` | Téléchargements post-achat |
| `expertise_payments` | Paiements expertise. FK → `real_estate_expertise_requests.id` |
| `payment_methods_config` | Configuration fournisseurs de paiement (Stripe, Mobile Money…) |
| `currency_config` | Devises et taux de change |
| `rate_limit_attempts` | Tentatives pour le rate-limiting |

### Codes et réductions

| Table | Description |
|-------|-------------|
| `cadastral_contributor_codes` | Codes CCC (Certificat Contributeur Cadastral). FK → `cadastral_contributions.id` |
| `discount_codes` | Codes promo revendeurs |

### Configuration admin

| Table | Description |
|-------|-------------|
| `cadastral_search_config` | Config recherche (dont `test_mode`) |
| `cadastral_results_config` | Config affichage résultats |
| `cadastral_services_config` | Services disponibles et tarifs |
| `cadastral_contribution_config` | Config contributions |
| `catalog_config` | Config catalogue |
| `expertise_fees_config` | Frais d'expertise |
| `land_title_fees_config` | Frais titre foncier (généraux) |
| `land_title_fees_by_type` | Frais titre foncier par type (urbain/rural, superficie) |
| `analytics_charts_config` | Config graphiques dashboard |
| `certificate_templates` | Modèles de certificats |

### Utilisateurs et audit

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (full_name, email, avatar…) |
| `user_roles` | Rôles (admin, super_admin, partner, user). Table séparée par sécurité |
| `admin_user_notes` | Notes admin sur les utilisateurs |
| `audit_logs` | Journal d'audit |
| `notifications` | Notifications utilisateur |
| `fraud_attempts` | Tentatives de fraude détectées |
| `generated_certificates` | Certificats PDF générés |

### Contenu

| Table | Description |
|-------|-------------|
| `publications` | Publications du kiosque |
| `articles` | Articles de blog |
| `article_themes` | Thèmes d'articles |
| `article_favorites` | Favoris utilisateur. FK → `articles.id` |

## RPCs (fonctions PostgreSQL)

| Fonction | Rôle |
|----------|------|
| `get_admin_statistics(stat_type, start_date, end_date)` | Statistiques admin par type |
| `create_cadastral_invoice_secure(...)` | Création sécurisée de factures |
| `log_audit_action(...)` | Journalisation audit |
| `has_role(user_id, role)` | Vérification de rôle (SECURITY DEFINER) |

## Colonnes générées

- `cadastral_parcels.area_hectares` : calculé automatiquement depuis `area_sqm / 10000`. **Ne jamais insérer ni mettre à jour manuellement.** Les types TypeScript (`CadastralParcelInsert`, `CadastralParcelUpdate`) excluent cette colonne.

## Politiques RLS

Toutes les tables ont RLS activé. Les politiques suivent le pattern :
- **SELECT** : accès public ou filtré par `auth.uid()`
- **INSERT/UPDATE/DELETE** : filtré par `auth.uid()` ou vérifié via `has_role(auth.uid(), 'admin')`
- La fonction `has_role()` est `SECURITY DEFINER` pour éviter la récursion RLS sur `user_roles`
