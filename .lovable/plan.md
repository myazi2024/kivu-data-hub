

## Plan d'implémentation incrémental — P1 + Panier multi-parcelles

### Stratégie : 4 étapes indépendantes, déployables séparément, zéro régression

Chaque étape est autonome : si on s'arrête après n'importe laquelle, l'app reste 100 % fonctionnelle.

---

### Étape 1 — Icônes sémantiques (risque : nul)
**Cible** : table `cadastral_services_config` uniquement (data, pas de schéma).

Mise à jour `icon_name` via insert tool :
- `information` → `Info`
- `location_history` → `MapPin`
- `history` → `History`
- `obligations` → `Receipt`
- `land_disputes` → `Scale` (déjà OK)

Aucun code touché : `resolveLucideIcon` (`src/lib/lucideIconMap.ts`) résout déjà dynamiquement. Effet immédiat à l'écran.

---

### Étape 2 — Catégories + badges (risque : faible)
**Migration BD** :
- Ajouter colonne `category text` à `cadastral_services_config` (nullable, default `'consultation'`).
- Backfill : `information`, `location_history`, `history` → `consultation` ; `obligations` → `fiscal` ; `land_disputes` → `juridique`.

**Code** :
- `useCadastralServices.ts` : exposer `category` dans le type `CadastralService`.
- `ServiceListItem.tsx` : afficher un petit `Badge` couleur sémantique à côté du titre (consultation = neutre, fiscal = ambre, juridique = rouge atténué). Classes Tailwind sémantiques uniquement.

Aucun impact paiement / billing.

---

### Étape 3 — Panier multi-parcelles (frontend, Phase 1)
**Refonte ciblée de `useCadastralCart.tsx`** :
- Structure interne : `items: { parcelNumber, parcelLocation, services: CadastralCartService[] }[]`.
- Helpers : `addServiceForParcel`, `removeServiceForParcel`, `clearParcel`, `getParcelCount`, `getTotalAmount` (somme tous parcelles).
- **Compatibilité ascendante** : conserver `selectedServices`, `addService`, `toggleService`, `isSelected`, `parcelNumber`, `setParcelNumber` comme proxies sur la « parcelle active » → `CadastralBillingPanel` continue de marcher sans modification.
- TTL 24 h conservé, persistance `ConsentAwareStorage` conservée, migration silencieuse de l'ancien format au chargement.

**Nouveau composant** : `CadastralCartButton` (bouton flottant + Sheet, calqué sur `CartButton.tsx`) affichant le récapitulatif groupé par parcelle, avec bouton « Tout payer ».
- Monté dans `CadastralMap.tsx` uniquement (pas dans `Navigation`, pour rester scoping cadastral et éviter conflit visuel avec `CartButton` du kiosque).
- Position : `fixed bottom-3 left-3` (le `CartButton` kiosque est à droite → pas de collision).

**Checkout multi-parcelles** : 
- L'edge function `cadastral-create-payment` est appelée une fois par parcelle dans une boucle séquentielle, OU on étend l'edge pour accepter un payload `{ parcels: [{ parcelNumber, services }] }`. 
- Décision recommandée : **boucle frontend** pour Phase 1 (zéro changement edge function, zéro risque sur la facturation existante). Ouverture Stripe sur la première parcelle, les autres sont enchaînées via session checkout multi-line-items côté edge si validé plus tard.
- En réalité plus propre : 1 seul appel edge avec tableau de parcelles → factures séparées créées côté edge. Je propose **option B (1 appel, edge gère le split)** mais en gardant l'edge actuelle intacte et en créant `cadastral-create-payment-multi` à côté (zéro régression sur le flux mono-parcelle existant).

---

### Étape 4 — Hors scope immédiat (à replanifier)
- Phase 2 panier (table `cadastral_invoice_items`, sessions BD) → reporté.
- Observabilité analytics (`service_view`, `service_select`) → reporté en P3.
- Preselect depuis `Services.tsx` → reporté en P4.

---

### Garde-fous anti-régression
1. `CadastralBillingPanel` non modifié à l'étape 3 (API `useCadastralCart` rétro-compatible).
2. Edge function `cadastral-create-payment` non touchée — nouvelle edge à côté.
3. Aucun changement aux tables `cadastral_invoices` / `cadastral_services_config.price`.
4. Tests visuels après chaque étape avant de passer à la suivante.

### Ordre d'exécution proposé pour ce tour
**Étape 1 + Étape 2** (sûres, additives, effet immédiat). On valide ensemble, puis on enchaîne Étape 3 (panier) dans un tour suivant pour bien isoler les risques.

