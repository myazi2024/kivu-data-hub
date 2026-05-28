# Audit approfondi — Catalogue services carte cadastrale (passe 2)

Périmètre élargi par rapport à la passe 1 : sécurité paiement, PDF, RLS, edge functions, robustesse Realtime.

## Findings critiques

### P0-S1 — Insertion client de `cadastral_invoices` (sécurité paiement)
`cadastral_invoices` a `INSERT WITH CHECK (auth.uid() = user_id)`. Le client choisit son `total_amount_usd` et la liste `selected_services`. Puis `create-payment` lit cette ligne et facture `invoice.total_amount_usd`. Un client malicieux peut insérer un `total_amount_usd = 0.01` pour 5 services et payer 1 cent.
- **Viole la règle Core** « Payments: Clients never insert. Edge functions via SERVICE_ROLE_KEY handle insertions. »
- **Fix** : edge function `create-cadastral-invoice` (SERVICE_ROLE) qui :
  1. relit `cadastral_services_config` (prix serveur),
  2. valide `selected_services` contre catalogue actif,
  3. applique le code promo via `discount_codes` validation serveur,
  4. insère la facture avec total recalculé,
  5. retourne l'invoice au client.
- Révoquer `INSERT` à `authenticated` sur `cadastral_invoices`.

### P0-PDF — Cache stale + mapping cassé dans `invoiceDownload.loadServicesCatalog`
```ts
const { data } = await supabase
  .from('cadastral_services_config')
  .select('id, service_id, name, price_usd, category, ...')
  .is('deleted_at', null);  // ❌ pas de is_active
cachedServices = (data ?? []) as unknown as CadastralService[];  // ❌ cast brut
```
- `id` de la BD (UUID PK) écrase `service.id` attendu (= `service_id`). Le PDF ne retrouvera jamais le service par sa clé métier → libellés vides ou « Service inconnu ».
- `cachedServices` est un cache module-level **jamais invalidé** : changement admin = PDF stale toute la session.
- `is_active` non filtré.
- **Fix** : mapper explicitement `id: row.service_id`, filtrer `is_active`, invalider via subscribe Realtime ou TanStack Query partagée avec `useCadastralServices`.

## Findings P1

### P1-1 — Bundle « Compléter le dossier » sous-vend
`CadastralCartButton` ne propose dans la suggestion bundle que les services avec `required_data_fields == null`. Les services avec règles (même si elles passeraient pour la parcelle) sont exclus → on rate des ventes. Devrait évaluer `evaluateServiceAvailability` sur la parcelle active.

### P1-2 — Realtime retry sans débounce (boucle potentielle)
`useCadastralServices` rappelle `loadServices()` sur `CHANNEL_ERROR | TIMED_OUT | CLOSED`. Si le canal échoue de manière répétée (perte réseau prolongée), boucle de requêtes serveur. Ajouter backoff exponentiel + cap (3 tentatives sur 30 s) puis afficher l'erreur en UI.

### P1-3 — Suppression admin avec `window.confirm`
`AdminCadastralServices.handleDelete` utilise `confirm()` (banni par les memories `partners`/`expertise`/`mutations` qui standardisent sur `AlertDialog`). Remplacer.

### P1-4 — `deleted_at` jamais utilisé par l'admin
Schéma supporte le soft-delete (`deleted_at TIMESTAMPTZ`), mais admin fait `DELETE` permanent. Si une facture passée référence le service après une fenêtre de temps long > scan, la suppression brise les libellés PDF historiques. Préférer soft-delete (`update deleted_at = now()`).

### P1-5 — RLS publique laisse fuir les services soft-deleted actifs
```
Services config are viewable by everyone  USING (is_active = true)
```
Si une ligne a `is_active=true` ET `deleted_at IS NOT NULL`, elle est exposée. Ajouter `AND deleted_at IS NULL`.

### P1-6 — `category` sans contrainte BD
Colonne `text NOT NULL DEFAULT 'consultation'` sans CHECK / enum. Un INSERT direct (edge / migration) peut écrire `'foo'`. Ajouter `CHECK (category IN ('consultation','fiscal','juridique'))` ou créer un type enum.

### P1-7 — Politiques RLS dupliquées sur `cadastral_invoices`
Deux paires identiques : « Admins can view all invoices » / « Admins view all invoices » et « Users can view their own invoices » / « Users view own invoices ». Dette à nettoyer (migration drop des doublons).

## Findings P2 / P3

- **P2-1** — `fallbackIconMap` persistant dans `CadastralBillingPanel` (lignes 281-287) : doublon avec `resolveLucideIcon` + `icon_name` BD (les 5 services ont déjà tous un `icon_name`). Supprimable.
- **P2-2** — `legacyAvailability` hardcodé pour les 5 services historiques : redondant avec `required_data_fields` BD (déjà renseigné pour les 5). Plan : supprimer le fallback une fois validé qu'aucune ligne BD active n'a `required_data_fields == null`.
- **P2-3** — Admin ne tracke pas `cadastral_catalog_service_created / updated / deleted` (uniquement `category_changed`). Ajouter pour audit complet.
- **P2-4** — Aucune validation du format `service_id` côté admin (lowercase, snake_case, pas d'espaces). Risque d'identifiants incohérents (`Information` vs `information`).
- **P2-5** — Aucun garde-fou si deux services partagent le même `display_order` (sub-ordre = `service_id` ASC — non déterministe métier).
- **P2-6** — `addService` / `addServiceForParcel` font `category: (service as any).category` dans deux endroits : `CadastralBillingPanel` (375) et `CadastralCartButton` (275). `CadastralService` typant maintenant `category`, le cast `as any` est inutile.
- **P3-1** — Stats admin « Valeur Catalogue » en `$` hardcodé : acceptable (admin USD base) mais incohérent avec le reste de l'app. Mentionner dans la mémoire.

## Plan d'action proposé

### Lot S — Sécurité paiement (P0-S1) — migration + edge function
1. Migration : révoquer `INSERT` sur `cadastral_invoices` à `authenticated`, garder `service_role`.
2. Créer edge function `create-cadastral-invoice` :
   - input : `selected_services[]`, `parcel_number`, `fiscal_identity`, `discount_code?`
   - recalcule total depuis `cadastral_services_config` (is_active + deleted_at IS NULL),
   - valide code promo via RPC existante,
   - insère la facture avec SERVICE_ROLE,
   - renvoie l'invoice.
3. Brancher `useCadastralPayment.createInvoice` sur l'edge function (plus d'INSERT direct).
4. RLS update + nettoyage des politiques dupliquées (P1-7).

### Lot PDF — Cache & mapping (P0-PDF)
1. Fix `loadServicesCatalog` : mapper `id: row.service_id`, filtrer `is_active`.
2. Invalidation cache via Realtime ou migration vers TanStack Query partagée (`useCadastralServices`).

### Lot R — Robustesse hook & RLS
- P1-2 : backoff exponentiel + cap dans `useCadastralServices`.
- P1-5 : migration policy `is_active AND deleted_at IS NULL`.
- P1-6 : CHECK constraint sur `category`.

### Lot U — UX & dette
- P1-1 : suggestion bundle = `evaluateServiceAvailability(parcel)` pour services à règles.
- P1-3 : remplacer `confirm()` par `AlertDialog`.
- P1-4 : admin = soft-delete (`deleted_at`) + bouton « Restaurer ».
- P2-1 / P2-2 : supprimer `fallbackIconMap` + `legacyAvailability` après vérif BD.
- P2-3 / P2-4 / P2-5 : tracking événements, regex `service_id`, warning UI si `display_order` dupliqué.
- P2-6 : retirer les `as any`.

### Hors-scope
- Pas de refonte du flux de paiement Stripe / Mobile Money.
- Pas de changement des prix actuels.
- Pas de migration des factures historiques.

## Vérifications post-fix
- Tentative d'INSERT direct `cadastral_invoices` depuis client → refusée.
- Téléchargement PDF après désactivation d'un service admin → libellés à jour (cache invalidé).
- Coupure WS prolongée → 3 tentatives puis bandeau erreur (pas de boucle).
- Insert direct SQL `category='foo'` → CHECK refuse.
- Bundle « Compléter le dossier » d'une parcelle avec données complètes → propose les 4 services manquants (même ceux à règles).
- Suppression service utilisé en facture → bloquée (déjà OK) ; suppression service inutilisé → soft-delete réversible.

## Mémoire à mettre à jour
- `mem://features/cadastral-services-catalog-fr` : ajouter Lot S, Lot PDF, soft-delete, backoff.
- `mem://payment/architecture-facturation-unifiee-fr` : signaler que `cadastral_invoices` passe en INSERT edge-only.
