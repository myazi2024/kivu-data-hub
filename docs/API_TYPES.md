# Index des Types TypeScript

## Types auto-générés

- `src/integrations/supabase/types.ts` — Types générés depuis le schéma Supabase. **Ne pas modifier manuellement.**

## Types partagés (`src/types/`)

### `cadastral.ts`
- `CadastralParcel` — Row type pour `cadastral_parcels`
- `CadastralParcelInsert` — Exclut `area_hectares` (colonne GENERATED)
- `CadastralParcelUpdate` — Exclut `area_hectares`
- `CadastralContribution`, `CadastralContributionInsert`, `CadastralContributionUpdate`
- `createSafeCadastralParcelInsert()` — Helper qui supprime `area_hectares` avec warning
- `createSafeCadastralParcelUpdate()` — Idem pour les updates

### `mutation.ts`
- `MutationFee` — Structure d'un frais de mutation
- `MutationRequest` — 57 champs incluant colonnes financières dédiées
- `MutationRequestWithProfile` — Avec jointure profil
- Constantes : `LATE_FEE_CAP_USD`, `DAILY_LATE_FEE_USD`, `LEGAL_GRACE_PERIOD_DAYS`

### `expertise.ts`
- `ExpertiseRequest` — 96 champs (33 colonnes techniques : matériaux, équipements, permis…)
- `CreateExpertiseRequestData` — Données du formulaire
- `ExpertiseFee` — Structure d'un frais d'expertise

### `landTitleRequest.ts`
- `LandTitleRequestRow` — Row complète (68 champs)
- `LandTitleRequestSummary` — Vue résumée (Pick)
- `getRequestFullName()`, `getRequestLocation()` — Helpers d'affichage
- `ADMIN_LIST_COLUMNS`, `ADMIN_DETAIL_COLUMNS` — Colonnes de sélection
- `validateLandTitleFile()` — Validation fichier (types, taille max 10 MB)

### `certificate.ts`
- `CertificateTemplate` — Modèle de certificat (24 champs)
- `CertificateType` — Enum : `expertise_immobiliere`, `titre_foncier`, `permis_construire`, `mutation_fonciere`, `lotissement`
- `CERTIFICATE_TYPE_LABELS` — Labels français
- `CertificateGenerationData` — Données pour générer un certificat

### `province.ts`
- `ProvinceData` — Données par province (parcelles, revenus, litiges, densité…)
