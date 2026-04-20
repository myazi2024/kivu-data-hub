

## Audit détaillé — Panier de la Carte Cadastrale

### Périmètre

Panier multi-parcelles de `/cadastral-map`, distinct du panier kiosque (`useCart`).

| Composant | Rôle |
|---|---|
| `CadastralCartProvider` (`useCadastralCart`) | Store multi-parcelles, persistance locale + sync Supabase, purge post-paiement |
| `CadastralCartButton` | FAB en bas-gauche + Sheet récapitulatif |
| `CartParcelDiscountInput` + `useCartDiscounts` | Code promo/CCC mémorisé par parcelle |
| `useCartAccessCheck` | Batch-check des services déjà payés par parcelle |
| `CadastralBillingPanel` | Sélection + checkout d'une parcelle |
| Table `cadastral_cart_drafts` | Persistance serveur (`cart_data` + `discounts_data`) |

### État global : ✅ globalement solide

- Multi-parcelles avec tri stable (`addedAt`)
- Anti-doublon, suggestion bundle, déjà-payé masqué
- Persistance consent-aware + TTL 24 h + sync cross-tab
- Sync Supabase merge "le plus récent gagne"
- Purge post-paiement événementielle
- Migration v1→v2→v3 silencieuse
- A11y : `aria-label`, `title`, focus visibles

### Anomalies & dette détectées

#### 🔴 Race condition `upsert` — collision `useCadastralCart` ↔ `useCartDiscounts`

Les **deux hooks upsertent indépendamment** sur la même ligne `cadastral_cart_drafts(user_id)` :
- `useCadastralCart` (debounce 800 ms) écrit `{ user_id, cart_data }`
- `useCartDiscounts` (debounce 800 ms) écrit `{ user_id, discounts_data }`

Si les deux upserts tombent dans la même fenêtre, le **dernier gagnant écrase silencieusement l'autre colonne** (les upserts ne mentionnent pas la colonne sœur → null implicite côté payload Supabase, mais en pratique l'objet n'inclut pas la clé donc PostgREST ne touche que le champ envoyé… **à condition que la table ait des defaults**). Si `discounts_data` n'a **pas** de default, un upsert "cart only" peut le remettre à `null` sur insert initial.

**À vérifier** : schéma de `cadastral_cart_drafts.discounts_data` (default `{}` ou nullable ?). Si pas de default → perte de codes promo au prochain push panier nu.

**Correctif suggéré** : centraliser les deux écritures dans un seul effet, ou utiliser une RPC `upsert_cart_draft(cart, discounts)` côté SQL.

#### 🟠 Dépendance `parcelsMap` dans la purge → handler recréé à chaque modif

`useCadastralCart.tsx:222-261` enregistre/désenregistre l'événement `cadastralPaymentCompleted` **à chaque mutation du panier** (dépendance `[parcelsMap]`). Effets :
- Fenêtre de course : si `cadastralPaymentCompleted` est dispatché pile entre `removeEventListener` et `addEventListener`, l'événement est **perdu** → le service payé reste affiché dans le panier.
- Listener leak transitoire (faible mais réel sous re-renders rapides).

**Correctif suggéré** : utiliser `useRef` pour `parcelsMap` dans le handler et garder `useEffect(..., [])`.

#### 🟠 `useCartAccessCheck` peut produire des requêtes parallèles non-throttle

`refresh()` appelle `Promise.all(parcels.map(...))` → **N requêtes simultanées** vers `cadastral_service_access`, une par parcelle. Pour un utilisateur qui ajoute 5 parcelles, c'est 5 requêtes en parallèle à chaque mutation du panier (la `signature` change à chaque ajout/retrait).

**Correctif suggéré** : 1 seule requête `in('parcel_number', [...])` côté Supabase, puis dispatch côté JS. Évite N round-trips.

#### 🟠 Effet `setParcelNumber` boucle potentielle

`CadastralBillingPanel.tsx:148-150` :
```ts
React.useEffect(() => {
  setParcelNumber(searchResult.parcel.parcel_number);
}, [searchResult.parcel.parcel_number, setParcelNumber]);
```
`setParcelNumber` est stable (useCallback `[]`), donc OK en pratique. Mais si un parent remontait un nouveau provider, on aurait une boucle. Robuste mais fragile.

#### 🟡 P4 — Conflit `appliedDiscount` local vs mémorisé
`CadastralBillingPanel.tsx:103-113` : auto-applique le code mémorisé pour cette parcelle, mais ne se ré-exécute **pas** si l'utilisateur retire le code dans le drawer (`useCartDiscounts.clear`) — la condition `!appliedDiscount || appliedDiscount.code !== memorized.code` ne réagit pas au passage `memorized → null`. Conséquence : le panneau de billing continue d'afficher la remise même après suppression dans le drawer, jusqu'au remount.

**Correctif suggéré** : ajouter `if (!memorized && appliedDiscount) setAppliedDiscount(null);`

#### 🟡 P6 — Purge ne gère pas les services à `expires_at` passé déjà en cache
La purge filtre `expires_at <= now()` à l'aller (ligne 238) mais ne **réintroduit pas** un service expiré qu'on avait masqué via `useCartAccessCheck`. Effet rare, mais incohérent : un service à abonnement expiré pourrait disparaître du panier sans pouvoir être racheté depuis le drawer.

#### 🟡 Sync Supabase — `pull` n'écoute jamais les modifs distantes
Pas de souscription realtime à `cadastral_cart_drafts` → si l'utilisateur ouvre l'app sur 2 onglets, les modifs côté serveur ne sont pas re-pulled. Seulement un pull au login. Compensé par `storage` event entre onglets de la **même** machine, mais pas entre **devices**.

**Recommandation** : optionnel — souscrire à `postgres_changes` filtré par `user_id`.

#### 🟡 `handleProceedToPayment` — fiscalIdentity stockée en `localStorage` brut
`bic_last_fiscal_identity` (ligne 87, 230) contient potentiellement RCCM/NIF/adresse → **PII en clair** sans `ConsentAwareStorage`, donc pas de respect du consentement RGPD.

**Correctif suggéré** : passer par `ConsentAwareStorage.setItem/getItem`.

#### 🟡 Bouton FAB — collision visuelle avec `CartButton` (kiosque)
`CartButton` est `bottom-right`, `CadastralCartButton` est `bottom-left`. OK sur desktop, mais sur viewport ≤ 360 px, les deux FAB cohabitent sans conflit. ✅

#### 🟢 Points conformes notables
- Séparation des contextes (`CartProvider` ≠ `CadastralCartProvider`)
- Anti-doublon strict (`some(s.id === service.id)`)
- Patch prix catalogue → 1 batch update (`updateServicePrices`)
- Service legacy fallback `legacyAvailability` documenté
- Migration storage versionnée
- Tracking analytics complet (`cadastral_cart_open/pay_parcel/complete_bundle/promo_applied`)

### Synthèse

| Sévérité | Nombre |
|---|---|
| 🔴 Bloquant | 1 (race upsert cart ↔ discounts) |
| 🟠 Robustesse | 3 (handler purge, N requêtes parallèles, fragilité effet) |
| 🟡 UX/dette | 5 (P4 cleanup, expirés, realtime, PII fiscale, etc.) |
| 🟢 Conforme | majoritaire |

### Recommandations (à valider avant implémentation)

1. **Unifier les écritures sur `cadastral_cart_drafts`** via une RPC unique ou un seul effet de push partagé.
2. **Refactor purge** : `useEffect(..., [])` + `useRef` pour `parcelsMap`.
3. **Batch single-query** dans `useCartAccessCheck` (1 `in('parcel_number', [...])` au lieu de N).
4. **Fix P4 cleanup** : reset `appliedDiscount` quand le code mémorisé disparaît.
5. **PII fiscale** : utiliser `ConsentAwareStorage` pour `bic_last_fiscal_identity`.
6. **Optionnel** : realtime postgres_changes sur `cadastral_cart_drafts`.

Aucune correction ne sera appliquée sans validation explicite.

