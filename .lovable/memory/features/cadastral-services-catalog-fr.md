---
name: Cadastral services catalog
description: Catalogue services carte cadastrale - schéma BD, hook Realtime, catégories centralisées, validation règles required_data_fields, devise dynamique, admin robuste
type: feature
---

## Schéma BD
Table `cadastral_services_config` : `service_id` (unique), `name`, `description`, `price_usd`, `icon_name`, `category` ('consultation'|'fiscal'|'juridique'), `required_data_fields` (JSON), `display_order`, `is_active`, `deleted_at`.

## Hook `useCadastralServices`
- `SELECT * WHERE is_active AND deleted_at IS NULL ORDER BY display_order`
- Channel Realtime nom unique (`cadastral-services-changes-${random}`) → évite collisions multi-mount
- Retry `loadServices()` sur `CHANNEL_ERROR | TIMED_OUT | CLOSED`
- Map vers `CadastralService { id, name, price, description, icon_name, required_data_fields, display_order, category }` ; `category` défaut `'consultation'`

## Catégories centralisées
`src/constants/cadastralServiceCategories.ts` — source unique (`CADASTRAL_SERVICE_CATEGORY_META`, `getCadastralCategoryMeta`, `isValidCadastralServiceCategory`). Consommé par `ServiceListItem`, `CadastralCartButton`, `AdminCadastralServices`. Plus jamais de mapping local.

## Validation règles `required_data_fields`
`src/lib/cadastralServiceRules.ts` — `validateRequiredDataFieldsJson(raw)` valide `{ mode: 'any'|'all', rules: [{ type: 'always_true'|'truthy'|'non_empty_array', field?, companion? }] }`. Synchronisé avec `evaluateServiceAvailability` (`src/lib/serviceAvailability.ts`). Admin bloque la sauvegarde si invalide.

## Devise
Tous les prix UI passent par `formatCurrency(convertFromUsd(price), selectedCurrency)` via `useCurrencyConfig`. Plus de `$` hardcodé (`ServiceListItem`, `CadastralBillingPanel` bundle "Dossier complet", drawer panier).

## Admin (`AdminCadastralServices`)
- Form contient `category` (Select), colonne dédiée dans la table
- Pré-check unicité `service_id` avant INSERT (message explicite)
- Preview live de l'icône Lucide (`resolveLucideIcon`) avec détection nom invalide
- Suppression : `count(*)` ciblé via `jsonb @>` sur `cadastral_invoices.selected_services` (plus de scan LIMIT 1000)
- Analytics : `cadastral_catalog_category_changed`

## Consommateurs
`CadastralBillingPanel`, `ServiceListItem`, `CadastralCartButton`, `CadastralResultCard`, `CadastralDocumentView`, `lib/pdf.ts`, `lib/invoiceDownload.ts`.
