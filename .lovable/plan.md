# Audit catalogue services « Carte cadastrale »

Passe ciblée sur le catalogue après les lots S/PDF/R/U déjà appliqués. Trouvailles classées par sévérité.

## Bugs P0 (cassent une fonctionnalité)

### B1 — `processTestPayment` casse depuis la migration P0-S1
Dans `src/hooks/useCadastralPayment.tsx`, `processTestPayment` fait :
- `supabase.from('cadastral_invoices').update({ status: 'paid', ... })`

Or la migration `20260528043542` a fait `REVOKE INSERT, UPDATE ON public.cadastral_invoices FROM authenticated` et droppé les policies UPDATE client. → Toute tentative de paiement en mode test renvoie maintenant une erreur RLS/grant et l'utilisateur ne reçoit pas l'accès.
- **Fix** : passer par `supabase.rpc('mark_cadastral_invoice_paid_safe', { p_invoice_id, p_payment_method: 'TEST' })` (la RPC vérifie déjà `test_mode actif`).

### B2 — Octroi d'accès post-paiement non atomique
Mobile Money : `mark_cadastral_invoice_paid_safe` met la facture en `paid` côté serveur, puis le **client** fait `grantServiceAccess` (`upsert` sur `cadastral_service_access`). Si le navigateur se ferme entre les deux ou si l'upsert échoue (RLS sur `cadastral_service_access` un jour plus stricte, perte réseau), l'utilisateur a payé mais n'a pas accès.
- **Fix** : déplacer l'INSERT de `cadastral_service_access` dans `mark_cadastral_invoice_paid_safe` (déjà SECURITY DEFINER). Le client n'a plus qu'à appeler la RPC. Idempotent grâce à `ON CONFLICT DO NOTHING`.

### B3 — `processTestPayment` appelle deux fois `getInvoiceServices`
Une seule requête suffit ; conséquence : prix doublé en latence et risque de désynchro entre l'octroi d'accès et l'event analytics.
- **Fix** : un seul appel, réutiliser le résultat.

## Bugs P1 (UX dégradée, dette)

### B4 — Suggestion bundle du drawer s'appuie sur un parsing fragile
`CadastralCartButton.tsx` lignes 248-249 :
```ts
const [ville, province] = (p.parcelLocation || '').split(',').map(s => s.trim());
```
Format `parcel_location` n'est pas garanti `"Ville, Province"`. Si l'ordre est inversé ou s'il y a un quartier en plus, les services à règle `truthy(parcel.province + parcel.ville)` sont écartés à tort.
- **Fix** : pousser le bundle uniquement basé sur les services sans règle ou résolus via une normalisation (`parcelLocation` parsée en best-effort + fallback : si `parcelLocation` est non vide → ville et province considérées comme présentes).

### B5 — `fallbackIconMap` et `legacyAvailability` morts (P2-1 / P2-2 du plan précédent)
Tous les services BD ont `icon_name` et `required_data_fields` renseignés. Le fallback ne sert plus mais reste source d'incohérences (modifs admin sur l'icône remplacées par le fallback si `icon_name` vidé par erreur). À retirer.

### B6 — Cache PDF : course sur le premier rendu
`loadServicesCatalog` n'est pas mémoïsé par promesse : deux téléchargements simultanés font deux requêtes. Mineur mais simple à corriger.
- **Fix** : stocker `cachedPromise` au lieu de `cachedServices`.

### B7 — Restauration soft-delete : collision `service_id` non gérée
Si un service archivé avec `service_id = "X"` est restauré et qu'un nouveau service actif a entre-temps réutilisé `"X"` (le pré-check unicité ne joue qu'à la création, pas à la restauration), l'UPDATE échoue avec une erreur Postgres opaque.
- **Fix** : `restoreService` doit pré-vérifier qu'aucun service actif non archivé n'utilise déjà `service_id`.

### B8 — Validation manquante du `service_id` (P2-4)
Aucune regex sur l'input admin → un `service_id` avec espaces ou majuscules passe et casse la cohérence (clé déjà utilisée comme PK métier dans le panier, l'octroi d'accès et les factures).
- **Fix** : regex `^[a-z][a-z0-9_]*$` côté form (et idéalement CHECK SQL).

### B9 — Doublons `display_order` non signalés (P2-5)
Quand deux services ont le même `display_order`, le tri secondaire est par UUID PK (`service_id` ASC dans l'admin, mais BD trie par PK), donc non déterministe métier.
- **Fix** : afficher un warning visuel dans la table admin quand un `display_order` est dupliqué, et trier serveur `ORDER BY display_order, service_id`.

### B10 — Toast Realtime parasite à l'init
Le canal `cadastral-services-changes-*` log `toast.info('Le catalogue mis à jour')` à chaque `UPDATE`. Quand l'admin modifie 5 services, l'utilisateur reçoit 5 toasts.
- **Fix** : debounce 1.5 s sur le toast (regroupement), et n'émettre rien pour les déclencheurs liés à la session courante (option : ignorer les events si Tab inactif).

## Optimisations P2

### O1 — `useCurrencyConfig` instancié par item
`ServiceListItem` appelle `useCurrencyConfig()` par carte. Avec 5+ services, chaque changement de devise re-render 5 hooks consommant le même context. Acceptable mais : pré-calculer `priceLabel` dans le parent et passer en prop.

### O2 — Effet `updateServicePrices` sans dep `selectedServices`
`CadastralBillingPanel` ligne 149-164 dépend uniquement de `catalogServices`. Si l'utilisateur ajoute une vieille version du service avant le sync catalogue (cas exotique), le prix ne sera jamais réaligné jusqu'au prochain push catalogue. Inclure `selectedServices` dans la dep.

### O3 — `expandedServices` figé après premier remplissage
Quand un nouveau service apparaît (Realtime INSERT), il n'est pas auto-déplié bien que disponible. Mettre à jour l'état pour ajouter les nouveaux IDs disponibles.

### O4 — Stats admin « Valeur Catalogue »
Inclut les services archivés quand `showDeleted=true`. Devrait toujours sommer uniquement les actifs non supprimés pour rester comparable.

### O5 — Tracking analytics manquant
- `cadastral_catalog_service_restored` est tracké mais pas `cadastral_catalog_bulk_action` (aucune action bulk encore — OK).
- Ajouter `cadastral_bundle_add_all` et `cadastral_bundle_complete` côté `CadastralBillingPanel` (côté drawer c'est déjà fait : `cadastral_cart_complete_bundle`).

## Plan d'implémentation

### Lot V — Bugs critiques paiement
1. `useCadastralPayment.tsx` : `processTestPayment` → RPC `mark_cadastral_invoice_paid_safe`, un seul appel `getInvoiceServices`, suppression de l'UPDATE direct.
2. Migration : enrichir `mark_cadastral_invoice_paid_safe` pour qu'elle INSERT dans `cadastral_service_access` à la fin (atomicité B2). Supprimer l'appel client `grantServiceAccess` dans `processTestPayment` et simplifier dans `processMobileMoneyPayment` (laisser un retry côté client en filet de sécurité).

### Lot W — Admin & catalogue
1. `AdminCadastralServices.tsx` :
   - Pré-check unicité `service_id` à la restauration (B7).
   - Regex de validation `service_id` côté form + message dédié (B8).
   - Warning de doublon `display_order` (badge ⚠ + tooltip) (B9).
   - `totalRevenue` calculé sur `services.filter(s => !s.deleted_at && s.is_active)` (O4).
2. Migration : `CHECK (service_id ~ '^[a-z][a-z0-9_]*$')` sur `cadastral_services_config`.

### Lot X — UX & dette frontend
1. `CadastralBillingPanel.tsx` : retirer `legacyAvailability` + `fallbackIconMap` (B5). Effet `updateServicePrices` dep `[catalogServices, selectedServices]` (O2). Étendre `expandedServices` aux nouveaux services dispo (O3). Ajouter `trackEvent('cadastral_bundle_complete_panel')` sur le clic « Compléter le dossier » du panneau (O5).
2. `CadastralCartButton.tsx` : reparse `parcelLocation` plus tolérant (best-effort + fallback « non vide → considérer ville/province présentes ») (B4).
3. `useCadastralServices.tsx` : debounce 1.5 s du toast Realtime (B10).
4. `invoiceDownload.ts` : mémoïser la promesse de fetch (B6).
5. `ServiceListItem.tsx` : recevoir `priceLabel` en prop (O1).

### Hors-scope
- Refonte du flux Stripe.
- Migration des factures historiques.
- Changement de devise base USD.

## Vérifications post-fix
- Paiement test : la facture passe à `paid` et `cadastral_service_access` se peuple, sans appel UPDATE direct depuis le client (Network panel).
- Restauration d'un service dont `service_id` est déjà occupé : message clair, pas d'erreur Postgres brute.
- Création d'un service avec `"Mon Service"` : refusée par la regex.
- Deux services avec même `display_order` : badge ⚠ visible dans la table admin.
- 5 updates admin consécutifs : un seul toast utilisateur, pas 5.
- PDF facture après désactivation d'un service : libellés à jour, pas de double fetch dans Network.
- Bundle drawer pour parcelle dont `parcel_location` est `"Province Ville"` (ordre inverse) : services à règle `province+ville` désormais proposés.

## Mémoire à mettre à jour
- `mem://features/cadastral-services-catalog-fr` : ajouter Lots V/W/X, atomicité grant via RPC, regex `service_id`, debounce toast.
