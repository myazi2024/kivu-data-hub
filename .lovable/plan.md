# Audit — Catalogue de services (carte cadastrale)

## Périmètre
- Table `cadastral_services_config` (5 services actifs : `information $1.50`, `location_history $2.00`, `history $3.00`, `obligations $15.00`, `land_disputes $6.99`).
- Hook `useCadastralServices` + Realtime.
- UI consommateurs : `CadastralBillingPanel`, `ServiceListItem`, `CadastralCartButton`, `CadastralResultCard`, `CadastralDocumentView`, `lib/pdf.ts`, `lib/invoiceDownload.ts`.
- Admin : `AdminCadastralServices`.

## Forces
- Source unique en BD + Realtime (`postgres_changes`) avec rechargement sur erreur de canal.
- Filtre `is_active` + `deleted_at IS NULL`, tri `display_order`.
- Disponibilité service par parcelle gérée via `required_data_fields` JSON + fallback legacy.
- Synchronisation prix du panier au chargement catalogue (`updateServicePrices`, batch).
- Anti-doublon achat via `checkMultipleServiceAccess` + bouton bundle « Dossier complet ».
- Analytics : `cadastral_service_view/select/unselect`, `cadastral_cart_*`.

## Problèmes identifiés

### P0 — Bloquants fonctionnels
1. **Champ `category` invisible côté admin.** `AdminCadastralServices` ne lit/écrit pas `category`. Tout nouveau service est créé sans catégorie → badge par défaut « Consultation » même pour un service fiscal/juridique. Aujourd'hui les 5 services historiques ont la bonne valeur (seed SQL), mais la création/édition admin écrase ou laisse `null`.
2. **Incohérence du mapping catégorie entre composants.** `ServiceListItem` mappe `fiscal → bg-secondary`, `juridique → bg-destructive/10`. `CadastralCartButton.CATEGORY_META` mappe `fiscal → bg-accent/20`, `juridique → bg-secondary`. Mêmes catégories, deux apparences. Centraliser dans `src/constants/cadastralServiceCategories.ts`.

### P1 — UX / cohérence devise
3. **Devise hardcodée `$` dans le panneau de facturation** (lignes 345, 380-381, 129 de `ServiceListItem`). Le drawer panier convertit via `convertFromUsd` + `formatCurrency`, le panneau de facturation non. Si l'utilisateur sélectionne CDF, le bundle affiche encore des dollars.
4. **`CadastralResultCard.handleDownloadPDF` ne charge pas le catalogue avant l'appel**. Si l'appel arrive avant la fin de `useCadastralServices`, `catalogServices` peut être vide → PDF avec libellés vides. Ajouter `await` sur un état chargé ou fallback.
5. **`useCadastralServices` ne propage pas le statut de souscription Realtime** (`SUBSCRIBED` vs `CLOSED`). En cas de coupure WS, le canal redémarre seulement sur `CHANNEL_ERROR`. Ajouter retry sur `CLOSED`/`TIMED_OUT`.

### P2 — Robustesse données
6. **Pas de garde-fou unicité `service_id`.** L'admin n'empêche pas la collision avant INSERT (la BD a probablement la contrainte, mais l'erreur n'est pas traduite). Vérifier l'existence avant `insert` et afficher un message clair.
7. **`required_data_fields` JSON non validé contre un schéma.** L'admin parse uniquement `JSON.parse`, sans vérifier `mode ∈ {any,all}` ni les `type` autorisés (`always_true`, `truthy`, `non_empty_array`). Une faute de frappe casse silencieusement la disponibilité.
8. **`fallbackIconMap` dans `CadastralBillingPanel`** redonde avec `resolveLucideIcon`. Si un service legacy n'a pas d'icône en BD, OK ; mais l'admin permet de saisir un nom d'icône invalide → afficher un check icône (preview live).
9. **Suppression admin compte `selected_services` via scan de `cadastral_invoices` (LIMIT 1000)**. Faux négatif si > 1000 factures. Remplacer par `select count(*) … where selected_services @> jsonb_build_array(serviceId)` (ou RPC dédiée).

### P3 — Cosmétique / dette
10. **`AdminCadastralServices.CadastralService` redéfinit l'interface** au lieu de réutiliser celle du hook → drift assuré.
11. **`SelectQuery` du panier n'utilise pas `display_order`** : `useCadastralServices` trie déjà, mais `CadastralCartButton` filtre `missing` sans re-trier. OK pour 5 services, à surveiller si le catalogue grossit.
12. **Realtime channel name `cadastral-services-changes` non unique** : si le hook est monté plusieurs fois (résultat + panier + admin ouverts), Supabase peut dédupliquer ou logger des warnings. Préfixer avec un identifiant aléatoire.
13. **Pas d'aperçu en temps réel des règles JSON** dans l'admin (impossible de tester contre une parcelle avant de sauver).
14. **Mémoire** : aucune note projet ne documente l'architecture catalogue (composants, contrats, catégories). À sauvegarder à la fin de l'audit.

## Plan d'action proposé (à confirmer)

### Lot A — Cohérence catégorie & devise (P0/P1)
- Ajouter `category` dans `AdminCadastralServices.formData`, dialog (Select consultation/fiscal/juridique), table.
- Créer `src/constants/cadastralServiceCategories.ts` (label + classes sémantiques) et l'utiliser dans `ServiceListItem` ET `CadastralCartButton`.
- Remplacer `$${price.toFixed(2)}` par `formatCurrency(convertFromUsd(price), selectedCurrency)` dans le bundle « Dossier complet » et `ServiceListItem.Badge`.
- Tracker `cadastral_catalog_category_changed` côté admin.

### Lot B — Robustesse hook & admin (P2)
- `useCadastralServices` : retry sur `CLOSED`/`TIMED_OUT`, channel name unique, expose `realtimeStatus`.
- Admin : pré-check unicité `service_id`, validation stricte du JSON `required_data_fields` (Zod), preview Lucide icon, suppression via `count(*)` ciblé.
- Réutiliser `CadastralService` du hook dans l'admin.

### Lot C — Mémoire & doc
- Mémoire projet `features/cadastral-services-catalog-fr` documentant : schéma BD, hook, contrats catégorie, règles `required_data_fields`, consommateurs.

### Hors-scope
- Pas de migration SQL (table & RLS déjà OK).
- Pas de refonte du flux de paiement.
- Pas de changement des prix.

## Vérifications post-fix
- Créer un service `test_fiscal` catégorie `fiscal` → badge identique panier vs liste billing.
- Sélectionner CDF → bouton bundle affiche le montant en FC.
- Couper le WS Realtime → reload automatique < 5 s.
- Saisir un JSON invalide → erreur explicite avant sauvegarde.
- Supprimer un service inutilisé → succès ; service utilisé → blocage avec compteur exact.
