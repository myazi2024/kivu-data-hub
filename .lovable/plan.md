

## Audit du panier `CadastralCartButton` + `useCadastralCart`

### État actuel
- **Catalogue** : 5 services par parcelle ($1.5 → $15, 3 catégories : consultation/fiscal/juridique). Total max ≈ $28.49 par parcelle.
- **Modèle d'achat** : 1 facture = 1 parcelle. Accès permanent (table `cadastral_service_access`, upsert idempotent).
- **Panier actuel** :
  - Multi-parcelles (✅ refactor déjà fait), bouton flottant compact (✅).
  - Checkout reste mono-parcelle via `CadastralBillingPanel` → "Payer cette parcelle" force le changement de parcelle active.

### Problèmes identifiés vs modèle d'affaires

| # | Problème | Impact business |
|---|----------|-----------------|
| 1 | Aucune **détection des services déjà achetés** dans le panier. L'utilisateur peut ajouter et payer 2× le même service. | Risque de double-paiement, friction post-achat, support. |
| 2 | Pas de **suggestion "Tout ajouter"** ni de **bundle/forfait parcelle** alors que le pack complet ne coûte que ~$28. | Panier moyen sous-optimal, conversion service par service. |
| 3 | Le **CTA "Payer"** ne distingue pas la parcelle déjà active (clic inutile) ; aucun feedback si la parcelle n'est plus chargée sur la carte. | UX confuse, double-clics. |
| 4 | Pas d'**indicateur de remise potentielle** ni champ code dans le drawer (codes promo = levier reseller). | Réduit usage codes partenaires. |
| 5 | Pas de **persistance par utilisateur connecté** (panier en localStorage seul, lié au device) — TTL 24h OK mais perd le panier au changement d'appareil. | Abandon si reprise sur mobile. |
| 6 | **Ordre des parcelles** non stable (Object.values) → réordonnancement visuel à chaque mutation. | UX instable. |
| 7 | Pas de **catégorisation visuelle** dans le drawer (badges Consultation/Fiscal/Juridique invisibles), alors qu'ils existent dans la liste source. | Manque de cohérence UI. |
| 8 | Pas d'**économie cumulée affichée** ni de pitch valeur ("Obtenez le dossier complet pour $X"). | Perte d'opportunité de conversion. |
| 9 | Bouton flottant **ne tient pas compte de la mini-cart kiosque** sur les très petites largeurs (collision potentielle si layout change). | Risque cosmétique. |
| 10 | Pas de **lien direct vers la facture / dashboard** après checkout depuis le panier multi. | Friction parcours. |

### Optimisations proposées (priorisées)

**P1 — Anti-doublon achat (critique business)**
- Charger `cadastral_service_access` pour les `parcel_number` du panier au montage du drawer (1 requête batch via `checkMultipleServiceAccess`, déjà disponible).
- Marquer chaque service "Déjà acheté" + désactiver suppression mais **bloquer l'ajout en amont** dans `addServiceForParcel` quand déjà payé (vérification dans `ServiceListItem` déjà présente — on s'aligne sur la même donnée).

**P2 — Bundle parcelle / "Tout ajouter"**
- Bouton "Ajouter tous les services disponibles ($X.XX)" par parcelle dans la liste des services (`CadastralBillingPanel`).
- Dans le drawer : afficher économie si remise reseller existe, et CTA "Compléter le dossier" si moins de N services sélectionnés.

**P3 — Drawer enrichi**
- Badges catégorie (Consultation/Fiscal/Juridique) sur chaque ligne service du drawer.
- Tri stable des parcelles (par ordre d'ajout — utiliser un `addedAt` timestamp dans `CadastralCartParcel`).
- Indicateur "parcelle active" (badge "En cours") pour clarifier le bouton "Payer".

**P4 — Champ code de remise dans le drawer**
- Petit input collapsible "J'ai un code promo/CCC" qui valide via `useDiscountCodes` et affiche l'économie projetée. Le code reste mémorisé et appliqué lors du checkout par parcelle.

**P5 — Persistance utilisateur (out of scope immédiat)**
- Synchroniser le panier sur Supabase pour utilisateurs connectés (table `cadastral_cart_drafts`). À planifier séparément (migration BD).

**P6 — Cohérence post-paiement**
- Après `cadastralPaymentCompleted`, retirer automatiquement les services payés du panier (déjà partiellement géré par `clearServices` sur la parcelle active — étendre pour purger uniquement les services achetés, pas toute la parcelle).

### Étapes d'implémentation proposées (zéro régression)

**Étape 1 (P1 + P3 + P6) — sûre, additive** :
- Ajouter `addedAt: number` dans `CadastralCartParcel` (rétro-compat : fallback `Date.now()` au load).
- Tri stable + badges catégorie dans le drawer.
- Hook `useCartAccessCheck` : pour chaque parcelle du panier, requête batch `checkMultipleServiceAccess`. Affichage "Déjà acheté" + désactivation paiement si tous achetés.
- Listener `cadastralPaymentCompleted` dans `useCadastralCart` qui purge uniquement les services dont l'accès vient d'être accordé (recharge access list, retire matches).

**Étape 2 (P2)** :
- Bouton "Tout ajouter ($X.XX)" dans `CadastralBillingPanel` au-dessus de la liste des services (n'ajoute que ceux disponibles & non déjà payés).
- Encart "Économisez en complétant votre dossier" dans le drawer si parcelle a < N services.

**Étape 3 (P4)** :
- Input code promo dans le drawer → stockage local du code validé par parcelle → injection automatique au checkout.

**Étape 5 (P5)** : à replanifier (migration BD requise).

### Fichiers touchés (Étape 1 uniquement, pour ce tour)
- `src/hooks/useCadastralCart.tsx` (ajout `addedAt`, listener post-paiement, tri stable)
- `src/components/cadastral/CadastralCartButton.tsx` (badges catégorie, marquage "Déjà acheté", désactivation conditionnelle du paiement)
- Nouveau : `src/hooks/useCartAccessCheck.tsx` (hook batch d'accès)

### Hors périmètre
- Pas de changement BD.
- Pas de touche au flux de paiement edge function.
- Pas de modification des prix ou catégories.

### Question
Confirmes-tu qu'on enchaîne avec **Étape 1** (P1+P3+P6 : anti-doublon, badges, tri stable, purge post-paiement) ? Ou veux-tu prioriser autrement (P2 bundle d'abord pour panier moyen, P4 codes promo) ?

