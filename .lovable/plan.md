

## Audit — Configuration de la facturation (`/admin?tab=billing-config`)

### Couverture actuelle de l'écran `AdminBillingConfig`

L'écran actuel ne propose que **3 onglets** :
1. **Publications** — prix unitaires (table `publications`)
2. **Services cadastraux** — 5 services par parcelle (table `cadastral_services_config`)
3. **Frais d'autorisation de bâtir** (permis) — table `permit_fees_config`

### Services payants NON pris en charge dans cet écran

Recensement complet vs. table de configuration et écran admin existant ailleurs :

| Service payant | Table BD | Écran admin dédié | Visible dans Config Facturation ? |
|---|---|---|---|
| Publications (kiosque) | `publications` | AdminPublications | ✅ Oui |
| Services cadastraux (5 services / parcelle) | `cadastral_services_config` | AdminCadastralServices | ✅ Oui |
| Autorisation de bâtir (permis) | `permit_fees_config` | AdminPermitFeesConfig | ✅ Oui |
| **Mutation foncière** | `mutation_fees_config` *(à confirmer)* | AdminMutationFeesConfig | ❌ Non |
| **Titre foncier** (initial / renouvellement / duplicata) | `land_title_fees_by_type` + `land_title_fees_config` | AdminLandTitleRequests (pas de config dédiée) | ❌ Non |
| **Lotissement (subdivision)** | `subdivision_fees_config` | AdminSubdivisionFeesConfig | ❌ Non |
| **Expertise immobilière** + **accès certificat** | `expertise_fees_config` | AdminExpertiseFeesConfig | ❌ Non |
| **Hypothèque (inscription + radiation)** | `cadastral_contribution_config` clé `mortgage_cancellation_fees` | Aucun écran de config dédié | ❌ Non |
| **Litiges fonciers (frais de levée)** | inconnu / hardcodé | Aucun | ❌ Non |
| **Fiscalité** (Impôt foncier, Bâtisse, IRL — taux/barèmes) | `cadastral_contribution_config` (probable) | Partiel (AdminTaxHistory = lecture seule) | ❌ Non |
| **Codes CCC** (valeur USD attribuée) | `cadastral_contribution_config` | AdminContributionConfig | ❌ Non |
| **Codes de remise** (déjà gérés ailleurs) | `discount_codes` | AdminDiscountCodes | ⚠️ Hors périmètre OK |

### Constats

- **8 services payants sur 11** ne sont **pas** consultables/modifiables depuis "Config Facturation" — l'admin doit naviguer dans 6 écrans différents pour ajuster les tarifs.
- L'écran existe sous un nom (« Configuration de la facturation ») qui suggère un point unique alors qu'il ne couvre que 3 services sur 11.
- Aucun récapitulatif global des prix actifs (introuvable « combien coûte tel service au total »).
- Pas de **mise à jour en masse** sur les frais hors-permis (mutation, lotissement, expertise, titre foncier).
- Pas d'**historique des changements de tarifs** ni de **journal d'audit** visible depuis l'écran.
- Pas d'**export CSV** des grilles tarifaires.
- Pas de **frais hypothèque** ni de **frais de levée de litige** configurables nulle part de manière centralisée — risque de valeurs codées en dur.

### Plan proposé — Refonte de `AdminBillingConfig` en hub unifié

**Objectif** : faire de cet écran le **point d'entrée unique** de tous les tarifs facturables.

#### Étape 1 — Élargir la couverture des onglets (P1)

Passer de 3 à **8 onglets** :
1. Publications (existant)
2. Services cadastraux (existant)
3. Autorisation de bâtir (existant)
4. **Mutation foncière** (nouveau — wrap `AdminMutationFeesConfig`)
5. **Titre foncier** (nouveau — table `land_title_fees_by_type`, lecture/édition)
6. **Lotissement** (nouveau — wrap `AdminSubdivisionFeesConfig`)
7. **Expertise + Certificat** (nouveau — wrap `AdminExpertiseFeesConfig`)
8. **Hypothèque & Litiges** (nouveau — frais radiation + levée litige)

Pattern : composer les écrans existants via lazy import plutôt que de dupliquer la logique.

#### Étape 2 — Onglet "Vue d'ensemble" (P2)

Premier onglet par défaut : **tableau récapitulatif** de tous les tarifs actifs avec :
- Service / Catégorie / Prix USD / Statut / Dernière modification
- Filtres par catégorie et recherche
- Bouton "Exporter CSV"

#### Étape 3 — Mise à jour en masse globale (P3)

Étendre l'opération `applyBulkUpdate` aux 5 nouvelles catégories pour permettre `+10%` global sur l'inflation.

#### Étape 4 — Journal d'audit tarifaire (P4)

- Ajouter `pricing_change_log` (table à créer) qui trace `service_type`, `service_id`, `old_price`, `new_price`, `changed_by`, `changed_at`
- Trigger BD sur `publications`, `cadastral_services_config`, `permit_fees_config`, `mutation_fees_config`, `land_title_fees_by_type`, `subdivision_fees_config`, `expertise_fees_config`
- Onglet "Historique" dans l'écran

#### Étape 5 — Frais hypothèque & litiges configurables (P5)

- Vérifier si `mortgage_cancellation_fees` (clé `cadastral_contribution_config`) est exposé en UI → sinon ajouter formulaire dédié
- Identifier où le **frais de levée de litige** est défini (probablement codé en dur) → migrer vers `cadastral_contribution_config` clé `dispute_lifting_fee` et exposer

### Détails techniques

- **Fichiers modifiés** : `src/components/admin/AdminBillingConfig.tsx` (refonte tabs)
- **Fichiers créés** :
  - `src/components/admin/billing/BillingOverviewTab.tsx`
  - `src/components/admin/billing/BillingAuditLogTab.tsx`
  - `src/components/admin/billing/MortgageDisputeFeesTab.tsx`
- **Migration BD** : table `pricing_change_log` + 7 triggers
- **Sidebar** : conserver les liens directs existants (Config Frais Mutation, Lotissement, Expert., Permis) — l'écran central devient un raccourci pratique, pas un remplacement
- **Hors périmètre** : `discount-codes`, `currency-config` (déjà autonomes et bien placés)

### Questions

1. Veux-tu **tout intégrer dans `AdminBillingConfig`** (8 onglets) ou plutôt créer un nouvel écran "Hub Tarifs" laissant `AdminBillingConfig` léger ?
2. **Étape 4 (audit log)** : on ajoute la table + triggers maintenant ou on la garde pour plus tard ?
3. **Étape 5 (hypothèque/litiges)** : confirme-t-on que les frais sont actuellement codés en dur ? (je le vérifierai à l'implémentation)

Priorité suggérée : **P1 + P2** d'abord (couverture + vue d'ensemble), puis P3/P4/P5 selon ton besoin.

