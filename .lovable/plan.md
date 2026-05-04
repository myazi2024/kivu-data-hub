# Audit du panier cadastral (Carte cadastrale → Catalogue de services)

## Périmètre audité

- `src/hooks/useCadastralCart.tsx` (provider multi-parcelles + sync Supabase + purge)
- `src/hooks/useCartDiscounts.tsx` (codes promo/CCC mémorisés par parcelle)
- `src/hooks/useCartAccessCheck.tsx` (services déjà acquis)
- `src/components/cadastral/CadastralCartButton.tsx` (drawer flottant)
- `src/components/cadastral/cart/CartParcelDiscountInput.tsx`
- `src/components/cadastral/CadastralBillingPanel.tsx` (panneau paiement)
- `src/components/cadastral/CadastralPaymentDialog.tsx`

## Constats & correctifs

### P0 — Bugs de cohérence / fuites mémoire

**1. Race condition sur la sync Supabase (`useCadastralCart` ↔ `useCartDiscounts`)**
Les deux hooks pushent indépendamment via `upsert_cadastral_cart_draft` en debounce 800 ms. Au mount, `useCadastralCart` n'a PAS le garde `skipNextPush` que `useCartDiscounts` possède : un push avec `parcelsMap = {}` peut écraser le distant si la fenêtre de pull (~réseau) n'a pas encore résolu. Ajouter `skipNextPushRef` symétrique dans `useCadastralCart`, set à `true` au mount et après chaque pull réussi.

**2. Purge post-paiement instable (event listener avec dépendance vide)**
`useEffect([])` référence `parcelsMapRef` ✅, mais le handler appelle `setParcelsMap(prev => ...)` sans utiliser la ref. OK fonctionnellement, mais le check `snapshot.length === 0` lit la ref puis sort tôt — si l'utilisateur ajoute une parcelle entre `addEventListener` et le payload, le `getUser()` async + `select` peut purger des items basés sur un snapshot obsolète. Snapshot doit être pris **après** la requête `cadastral_service_access`, pas avant.

**3. `useCartDiscounts` : le `pull` distant n'est pas relancé sur logout/login subséquent**
`useEffect([userId])` rePull sur changement, mais si l'utilisateur change de compte, `skipNextPush.current = true` n'est armé qu'au pull réussi avec données. Si distant vide, le local sera pushé au compte suivant → fuite cross-comptes. Toujours armer `skipNextPush = true` quand `userId` change, avant la requête.

### P1 — UX / cohérence métier

**4. Bouton "Sélectionner & payer" du drawer ferme le drawer mais ne déclenche aucun scroll vers `CadastralBillingPanel`**
`setOpen(false)` puis rien. Sur mobile (360 px), l'utilisateur perd le contexte. Émettre un event `cadastralCartFocusBilling` ou utiliser `scrollIntoView` sur le panneau via une ref globale.

**5. Bundle "Compléter le dossier" du drawer ignore `serviceAvailability`**
`CadastralCartButton` propose `catalogServices.filter(cs => !inCartIds.has(cs.id) && !isOwned(...))`, **sans** filtre de disponibilité de données. L'utilisateur ajoute des services qui seront grisés "pas de données" dans le `BillingPanel`. Importer/refactorer la logique d'évaluation (ou récupérer la décision via un hook partagé `useParcelServiceAvailability(parcel)`).

**6. Affichage des prix : drawer hardcodé `$` USD, le `BillingPanel` propose CDF/USD via `useCurrencyConfig`**
Incohérence visuelle : le panier affiche toujours USD, le panneau peut basculer en CDF. Lire `selectedCurrency` + `convertFromUsd` dans `CadastralCartButton` et formater via `formatCurrency`.

**7. Aucun retour visuel quand un code promo expire/devient invalide après ajout**
Le code est mémorisé 24 h en localStorage. Si supprimé/expiré côté admin, `BillingPanel` envoie `appliedDiscount` à `createInvoice` qui peut rejeter silencieusement. Re-valider via `validateDiscountCode(code, subtotal)` à chaque ouverture du drawer / focus de `CartParcelDiscountInput`, et auto-clear avec toast si invalide.

### P2 — Robustesse / observabilité

**8. TTL fixe 24 h sans renouvellement à l'usage**
`CART_TTL_MS` se base sur `savedAt` initial, pas sur le dernier accès. Un utilisateur actif depuis > 24 h voit son panier se vider au reload. Renouveler `savedAt` au load/sauvegarde plutôt qu'au premier remplissage (déjà partiellement le cas — vérifier que la persistance debounced rafraîchit bien `savedAt`, ce qu'elle fait, donc OK ; mais documenter et ajouter un test).

**9. Analytics manquantes**
- `cadastral_cart_remove_service` (suppression individuelle) → non tracé
- `cadastral_cart_clear_parcel` → non tracé
- `cadastral_cart_promo_removed` → non tracé
- `cadastral_cart_pay_parcel` est tracé mais pas le succès vs abandon
Ajouter ces évènements pour suivre l'entonnoir d'abandon.

**10. Accessibilité**
- Les `<Badge variant="outline">` "Déjà acheté" / "Consultation" / etc. n'ont pas de `aria-label` distinct → un lecteur d'écran lit "Déjà acheté Consultation $4.00" sans séparateur sémantique.
- Le bouton flottant `fixed bottom-3 left-3 z-[1000]` chevauche les contrôles Leaflet sur très petits écrans (zoom -, attribution). Tester avec `bottom-16` sur `< sm`.

## Plan de correction (ordre d'exécution)

1. **P0-1** — `skipNextPush` symétrique dans `useCadastralCart` (anti-race sync).
2. **P0-2** — Snapshot post-requête dans le handler `cadastralPaymentCompleted`.
3. **P0-3** — Reset `skipNextPush` sur changement `userId`.
4. **P1-7** — Re-validation des codes promo mémorisés (auto-clear + toast).
5. **P1-5** — Hook partagé `useParcelServiceAvailability` consommé par `CadastralCartButton` et `CadastralBillingPanel`.
6. **P1-6** — Devise dynamique dans le drawer.
7. **P1-4** — Focus/scroll vers le panneau de facturation au clic "Payer cette parcelle".
8. **P2-9** — Analytics complémentaires.
9. **P2-10** — Améliorations a11y + offset mobile du bouton flottant.

## Notes

- Pas de changement de schéma DB requis.
- Compatible avec la mémoire `payment/architecture-facturation-unifiee-fr` et `payment/pattern-soumission-securisee-fr`.
- Les modifications sont rétro-compatibles avec le storage v3 (`parcelsMap` + `addedAt`).
- Mémoire à mettre à jour : `features/cadastral-map-architecture-fr.md` (section panier).
