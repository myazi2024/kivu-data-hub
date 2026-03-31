

# Données test insuffisamment variées pour couvrir tous les visuels "Données foncières"

## Analyse croisée : champs utilisés par les blocs vs champs générés

### 1. TitleRequestsBlock — `land_title_requests`

| Champ visualisé | Généré ? | Problème |
|---|---|---|
| `request_type` | **Non** | Toujours `null` → graphique "Type de demande" vide |
| `requester_type` | **Non** | Toujours `null` → graphique "Demandeur" vide |
| `requester_gender` | **Non** | → graphique "Genre" vide |
| `owner_gender` | **Non** | → idem |
| `nationality` | **Non** | → graphique "Nationalité" vide |
| `construction_type` | **Non** | → graphique "Type construction" vide |
| `owner_legal_status` | **Non** | → graphique "Statut juridique" vide |
| `deduced_title_type` | **Non** | → graphique "Titre déduit" vide |
| `is_owner_same_as_requester` | **Non** | → graphique "Demandeur = Proprio" vide |
| `reviewed_at` | **Non** | → KPI "Délai moy." toujours N/A |
| `section_type` | **Non** (déduit via enrichissement) | Pas de `parcel_type` dans title requests |

**Résultat : ~10 graphiques vides sur 16 dans cet onglet.**

### 2. ParcelsWithTitleBlock — `cadastral_parcels` + relations

| Champ visualisé | Généré ? |
|---|---|
| `property_title_type` | Oui |
| `current_owner_legal_status` | Oui |
| `construction_type/nature` | Oui |
| `declared_usage` | Oui |
| `lease_type` | Oui |
| `construction_year` | Oui |
| `area_sqm` | Oui |
| Gender (via contributions `current_owners_details`) | Oui |
| Building permits (`cadastral_building_permits`) | **Seulement 10 records** → très peu de données |
| Tax history (`cadastral_tax_history`) | **Seulement ~60 records** (20 parcels × 3 ans) |
| Mortgages (`cadastral_mortgages`) | **Seulement 10 records** |

**Problème : les sous-tables (permits, taxes, mortgages) ont un volume fixe de 10-60 records indépendamment des 7 020 parcelles. Pas proportionnel.**

### 3. ExpertiseBlock — `real_estate_expertise_requests`

| Champ visualisé | Généré ? |
|---|---|
| `status`, `payment_status` | **`payment_status` non généré** → graphique "Paiement" vide |
| `property_condition` | **Non** → graphique "État du bien" vide |
| `wall_material` | **Non** → graphique "Matériau murs" vide |
| `roof_material` | **Non** → graphique "Matériau toiture" vide |
| `sound_environment` | **Non** → graphique "Env. sonore" vide |
| `building_position` | **Non** → graphique "Position bâtiment" vide |
| `has_sewage_system` | **Non** |
| `has_pool`, `has_air_conditioning`, `has_solar_panels`, `has_generator`, `has_water_tank`, `has_borehole`, `has_garage`, `has_electric_fence`, `has_cellar`, `has_automatic_gate` | **Non** → graphique "Équipements" incomplet |
| `assigned_at` | **Non** → KPI "Délai assign." toujours N/A |
| `expertise_date` | **Non** → KPI "Délai total" toujours N/A |

**Résultat : ~8 graphiques vides et KPIs N/A.**

### 4. MutationBlock — `mutation_requests`

| Champ visualisé | Généré ? |
|---|---|
| Tous les champs de base | Oui |
| `market_value_usd` | Oui (direct) |
| `title_age` | **Non** (ni direct ni dans `proposed_changes`) → graphique "Ancienneté titre" vide |
| `late_fee_amount` | **Non** → graphique "Retard mutation" vide |

### 5. DisputesBlock — `cadastral_land_disputes`

| Champ visualisé | Généré ? |
|---|---|
| `dispute_type` | **Toujours `'report'`** → graphique "Type litige" monotone |
| `lifting_status` | Partiellement (seulement `'en_cours'`) → section "Levées" avec un seul statut |
| `lifting_reason` | Seulement `'conciliation_reussie'` → un seul motif |
| `resolution_level` | Seulement pour résolus → distribution pauvre |

### 6. InvoicesBlock — `cadastral_invoices`

| Champ visualisé | Généré ? |
|---|---|
| `payment_method` | **Non** → graphique "Moyen paiement" vide |
| `discount_amount_usd` | **Non** → KPI "Remises" toujours $0 |
| `geographical_zone` | Oui |
| `total_amount_usd` | Oui |

### 7. SubdivisionBlock — `subdivision_requests`

| Champ visualisé | Généré ? |
|---|---|
| `submission_payment_status` | **Non** → graphique "Paiement" vide |
| `total_amount_usd` | **Non** → KPI "Surface tot." et revenue = 0 |

### 8. OwnershipHistoryBlock — `cadastral_ownership_history`
- Seulement 40 records (20 parcels × 2). Volume insuffisant pour des tendances mensuelles visibles.

### 9. CertificatesBlock — `generated_certificates`
- Statut toujours `'generated'` → graphique "Statut" monotone, pas de `'pending'` ni `'completed'`.

### 10. FraudAttemptsBlock — `fraud_attempts`
- OK globalement, mais seulement 52 records.

## Plan de correction

### Fichier unique : `testDataGenerators.ts`

**A. `generateTitleRequests` — Ajouter les 10 champs manquants :**
- `request_type`: cycle entre `'nouveau_titre'`, `'renouvellement'`, `'duplicata'`, `'conversion'`
- `requester_type`: cycle entre `'proprietaire'`, `'mandataire'`, `'heritier'`
- `requester_gender` / `owner_gender`: alternance `'Masculin'`/`'Féminin'`
- `nationality`: ~90% `'Congolaise'`, ~10% `'Étrangère'`
- `construction_type`: via `pick(CONSTRUCTION_TYPES, i)`
- `owner_legal_status`: via `pick(LEGAL_STATUSES, i)`
- `deduced_title_type`: via `pick(TITLE_TYPES, i)`
- `is_owner_same_as_requester`: alternance `true`/`false`
- `reviewed_at`: pour les non-pending, date aléatoire après `created_at`

**B. `generateExpertiseRequests` — Ajouter les 12+ champs manquants :**
- `payment_status`: cycle `'pending'`/`'paid'`
- `property_condition`: cycle `'bon'`, `'moyen'`, `'mauvais'`, `'neuf'`
- `wall_material`, `roof_material`, `sound_environment`, `building_position`
- `has_sewage_system`, `has_pool`, `has_air_conditioning`, `has_solar_panels`, `has_generator`, `has_water_tank`, `has_borehole`, `has_garage`, `has_electric_fence`, `has_cellar`, `has_automatic_gate`
- `assigned_at`, `expertise_date`: dates cohérentes pour les `completed`/`in_progress`

**C. `generateInvoices` — Ajouter :**
- `payment_method`: cycle `'mobile_money'`, `'card'`, `'bank_transfer'`
- `discount_amount_usd`: ~20% des factures avec une remise de $1-5

**D. `generateSubdivisionRequests` — Ajouter :**
- `submission_payment_status`: cycle `'paid'`/`'pending'`
- `total_amount_usd`: `randInt(100, 500)`

**E. `generateDisputes` — Varier :**
- `dispute_type`: cycle `'report'`, `'lifting'`, `'mediation'`
- `lifting_status`: varier entre `'en_cours'`, `'approved'`, `'rejected'`, `'pending'`
- `lifting_reason`: varier entre `'conciliation_reussie'`, `'decision_justice'`, `'accord_parties'`
- `resolution_level`: varier pour tous, pas seulement résolus

**F. `generateCertificates` — Varier :**
- `status`: cycle `'generated'`, `'pending'`, `'completed'`

**G. `generateMutationRequests` — Ajouter :**
- `title_age` dans `proposed_changes`: `'less_than_10'` ou `'10_or_more'`
- `late_fee_amount` dans `proposed_changes.late_fees.fee`: ~30% des mutations

**H. Proportionnaliser les sous-tables :**
- `generateBuildingPermits`: passer de 10 à `~10% des parcelles` (700+)
- `generateTaxHistory`: passer de 20 parcelles à `~15%` (1 050+) × 3 ans
- `generateMortgages`: passer de 10 à `~8%` (560+)
- `generateOwnershipHistory`: passer de 20 parcelles à `~15%` (1 050+)
- Ajouter du batching (par 50) dans ces fonctions qui ne l'ont pas encore

**I. Augmenter le volume des entités 2/province :**
- Expertises : passer de 52 à `~5% des parcelles` (351)
- Title requests : passer de 52 à `~5%` (351)
- Les autres (disputes, mutations, certificates, fraud) restent à 52 (suffisant pour la variété)

### Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `testDataGenerators.ts` | Tous les ajouts A-I ci-dessus |

