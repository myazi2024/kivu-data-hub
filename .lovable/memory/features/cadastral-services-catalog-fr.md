---
name: Cadastral services catalog
description: Catalogue services carte cadastrale - schéma BD, hook Realtime, catégories centralisées, validation règles required_data_fields, devise dynamique, admin robuste, paiement atomique via RPC
type: feature
---

## Schéma BD
Table `cadastral_services_config` : `service_id` (unique, CHECK `^[a-z][a-z0-9_]*$`), `name`, `description`, `price_usd`, `icon_name`, `category` ('consultation'|'fiscal'|'juridique', CHECK), `required_data_fields` (JSON), `display_order`, `is_active`, `deleted_at`.
RLS publique : `is_active = true AND deleted_at IS NULL`.

## Paiement (Lot V — atomicité)
- `cadastral_invoices` : INSERT/UPDATE révoqués pour `authenticated`. Création via RPC `create_cadastral_invoice_safe(mode: paid|bypass|test, ...)`. Marquage payé via RPC `mark_cadastral_invoice_paid_safe(invoice_id, payment_method)` qui **insère aussi** dans `cadastral_service_access` (idempotent, `ON CONFLICT DO NOTHING`).
- Frontend (`useCadastralPayment`) : `processTestPayment` et `processMobileMoneyPayment` n'appellent plus de UPDATE direct ni `grantServiceAccess` côté client — tout passe par les RPC SECURITY DEFINER.

## Hook `useCadastralServices`
- `SELECT * WHERE is_active AND deleted_at IS NULL ORDER BY display_order`
- Channel Realtime nom unique → évite collisions multi-mount
- Backoff exponentiel borné (3 retries, 2s→8s) sur `CHANNEL_ERROR | TIMED_OUT | CLOSED`
- Toast Realtime debouncé 1.5s (regroupement) + ignoré quand l'onglet est en arrière-plan
- Map vers `CadastralService { id, name, price, description, icon_name, required_data_fields, display_order, category }`

## Cache PDF (`lib/invoiceDownload.ts`)
Promesse `inflight` mémoïsée pour éviter doubles fetches concurrents, invalidée via Realtime sur `cadastral_services_config`. `id` = `service_id` métier (pas la PK UUID).

## Catégories centralisées
`src/constants/cadastralServiceCategories.ts` — source unique. Consommé par `ServiceListItem`, `CadastralCartButton`, `AdminCadastralServices`.

## Validation règles `required_data_fields`
`src/lib/cadastralServiceRules.ts` — `validateRequiredDataFieldsJson(raw)` valide `{ mode: 'any'|'all', rules: [...] }`. Synchronisé avec `evaluateServiceAvailability` (`src/lib/serviceAvailability.ts`).

## Devise
Tous les prix UI passent par `formatCurrency(convertFromUsd(price), selectedCurrency)`. `ServiceListItem` accepte `priceLabel` en prop (O1) — calculé une fois côté `CadastralBillingPanel`.

## Admin (`AdminCadastralServices`)
- Form contient `category` (Select) + validation regex `service_id` (`^[a-z][a-z0-9_]*$`)
- Pré-check unicité `service_id` à la création **et à la restauration** (évite collision si un service actif a réutilisé l'identifiant)
- Soft-delete (`deleted_at` + `is_active=false`) avec AlertDialog (jamais `window.confirm`), corbeille restaurable, count d'usage via `selected_services @> [serviceId]`
- Warning ⚠ sur `display_order` dupliqué (tri non déterministe)
- Stats « Valeur Catalogue » : ne somme que les actifs non archivés (comparable même avec corbeille visible)
- Preview live icône Lucide avec détection nom invalide
- Analytics : `cadastral_catalog_service_created/updated/deleted/restored/category_changed`, `cadastral_bundle_add_all/complete_panel`, `cadastral_cart_complete_bundle`

## Bundle / Drawer
- Panneau facturation : bouton « Tout ajouter / Compléter le dossier » avec tracking dédié
- Drawer panier : suggestion bundle basée sur `evaluateServiceAvailability` ; si `parcel_location` non vide → ville/province considérées présentes (B4, évite faux négatifs sur formats inversés)
- Auto-expand des nouveaux services dispo à l'arrivée d'un INSERT Realtime
- Sync prix : effet dépendant de `[catalogServices, selectedServices, updateServicePrices]`

## Suppressions
- `fallbackIconMap` retiré : toutes les lignes BD ont `icon_name`
- `legacyAvailability` retiré : toutes les lignes BD ont `required_data_fields`

## Consommateurs
`CadastralBillingPanel`, `ServiceListItem`, `CadastralCartButton`, `CadastralResultCard`, `CadastralDocumentView`, `lib/pdf.ts`, `lib/invoiceDownload.ts`, `useCadastralPayment`.
