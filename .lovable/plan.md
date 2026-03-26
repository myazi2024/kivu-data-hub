

# Diagnostic complet du Catalogue de Services — Résultats et orientations

## Synthèse

Le catalogue de services comprend 3 composants principaux : `CadastralBillingPanel` (sélection/paiement), `CadastralResultCard` (affichage données par onglet), et `CadastralPaymentDialog` (dialog de paiement). Le diagnostic révèle **3 catégories de problèmes** : un accès gratuit par défaut sans paiement, un contrôle d'accès purement cosmétique, et des incohérences dans le flux de paiement.

---

## Problèmes identifiés

### Catégorie 1 — Accès accordé sans paiement (problème principal signalé)

**Bug 1 — Mode Développement actif en base de données**

- **Table** : `cadastral_search_config` → `payment_mode`
- **Valeur actuelle** : `{ bypass_payment: true, enabled: false, test_mode: false }`
- **Impact** : Le hook `usePaymentConfig` lit `bypass_payment: true`. Dans `CadastralBillingPanel` L191, quand `bypass_payment` est `true`, le bouton affiche "Accéder aux services" et `createInvoice` crée une facture à $0 avec `status: 'paid'` + accorde immédiatement les accès via `grantServiceAccess`. **Aucun paiement n'est demandé.**
- **Cause racine** : C'est le comportement attendu du "Mode Développement" — mais il n'y a aucun avertissement visible côté utilisateur que le paiement est bypassé. Seul l'admin voit l'alerte dans `AdminPaymentMode.tsx`.

**Bug 2 — Aucun garde-fou côté utilisateur quand le mode dev est actif**

- **Fichier** : `CadastralBillingPanel.tsx` L545-557
- **Code** : Le bouton change de libellé selon le mode (`'Accéder aux services'` vs `'Payer'`) mais rien n'indique à l'utilisateur que c'est un mode gratuit/test. Il pense accéder normalement au service.
- **Impact** : Confusion — l'utilisateur croit que le flux est normal alors que le paiement est bypassé.

### Catégorie 2 — Contrôle d'accès aux données purement cosmétique (faille de sécurité)

**Bug 3 — Toutes les données sont chargées avant le paiement**

- **Fichier** : `useCadastralSearch.tsx` L132-173
- **Code** : La recherche charge en parallèle TOUTES les données (parcelle, historique propriétaire, taxes, hypothèques, bornage, permis) sans aucune vérification de paiement côté serveur.
- **Fichier** : `CadastralResultCard.tsx` L524-525, L780, L1076
- **Code** : `hasServiceAccess()` vérifie localement (state React `paidServices`) si l'onglet doit afficher un overlay "Contenu verrouillé" ou les données réelles. Mais les données sont DÉJÀ dans le DOM/mémoire du navigateur.
- **Impact** : Un utilisateur avec les DevTools peut voir toutes les données cadastrales sans payer. Le verrou est purement visuel.
- **Aucune RLS** ne restreint l'accès aux tables `cadastral_ownership_history`, `cadastral_tax_history`, `cadastral_mortgages`, etc. en fonction du paiement.

### Catégorie 3 — Incohérences dans le flux de paiement

**Bug 4 — État "ni bypass ni enabled" non géré dans createInvoice**

- **Fichier** : `useCadastralPayment.tsx` L103
- **Code** : `if (!isPaymentRequired())` → crée une facture gratuite. `isPaymentRequired = enabled && !bypass_payment`. Donc si `enabled=false` ET `bypass_payment=false`, le paiement n'est pas requis et une facture gratuite est créée.
- **Fichier** : `CadastralBillingPanel.tsx` L204-216
- **Code** : `handleProceedToPayment` gère ce cas avec un toast "Paiement non configuré" et ne crée PAS la facture. Mais `createInvoice` lui-même ne valide pas cet état — si un autre code appelle `createInvoice` directement, l'accès est accordé gratuitement.
- **Impact** : Risque de contournement si `createInvoice` est appelé sans passer par `handleProceedToPayment`.

**Bug 5 — Pas de bannière "Mode test/dev" visible dans le catalogue**

- **Impact** : Quand l'admin active le mode test (paiements simulés), l'utilisateur final ne sait pas qu'il est en mode test. Les factures à $0 s'accumulent sans distinction claire.

---

## Orientations recommandées

### Correction 1 — Ajouter une bannière de mode dans le catalogue (1 fichier)

| Action | Fichier |
|--------|---------|
| Afficher une bannière visible dans `CadastralBillingPanel` quand `bypass_payment` est `true` ou `test_mode` est `true`. Texte : "⚠ Mode développement — Accès gratuit" ou "🧪 Mode test — Paiements simulés". Permet à l'utilisateur de comprendre pourquoi il accède sans payer. | `CadastralBillingPanel.tsx` |

### Correction 2 — Sécuriser `createInvoice` contre l'état non configuré (1 fichier)

| Action | Fichier |
|--------|---------|
| Dans `createInvoice`, vérifier explicitement le mode : si `!paymentMode.bypass_payment && !paymentMode.enabled`, retourner `null` avec un toast d'erreur au lieu de créer une facture gratuite. Seul le mode bypass explicite doit accorder l'accès gratuit. | `useCadastralPayment.tsx` |

### Correction 3 — Gater les données côté serveur avec une RPC sécurisée (2 fichiers + 1 migration)

| Action | Fichier |
|--------|---------|
| Créer une RPC `get_cadastral_parcel_data` qui accepte `parcel_number` et retourne les données de base (parcelle + localisation) SANS les données premium (historique, taxes, hypothèques). Les données premium ne sont retournées que si l'utilisateur a un accès payé dans `cadastral_service_access` OU si le mode `bypass_payment` est actif en config. | Migration SQL + `useCadastralSearch.tsx` |
| Modifier `useCadastralSearch` pour appeler cette RPC au lieu des requêtes directes. Le résultat contiendra des tableaux vides pour les services non payés. | `useCadastralSearch.tsx` |

**Alternative simplifiée** (si la RPC est trop complexe à court terme) : Filtrer les données côté client APRÈS le fetch mais AVANT de les passer au composant, en supprimant les données des services non payés du `searchResult`. Cela ne protège pas contre l'inspection réseau mais empêche l'accès via DevTools React.

### Correction 4 — Distinguer les factures dev/test des factures réelles (1 fichier)

| Action | Fichier |
|--------|---------|
| Dans `createInvoice` mode bypass, marquer la facture avec un champ `payment_method: 'MODE_DEV'` (déjà fait pour `discount_code_used`). Ajouter `test_mode: true` dans les métadonnées pour les factures en mode test. | `useCadastralPayment.tsx` |

---

## Résumé

| Catégorie | Problèmes | Fichiers impactés |
|-----------|-----------|-------------------|
| Accès sans paiement | 2 (config bypass, pas de bannière) | 1 (`CadastralBillingPanel.tsx`) |
| Sécurité données | 1 (données chargées avant paiement) | 2 (`useCadastralSearch.tsx`, migration SQL) |
| Flux paiement | 2 (état non géré, factures non distinguées) | 1 (`useCadastralPayment.tsx`) |
| **Total** | **5 problèmes** | **~4 fichiers + 1 migration** |

### Recommandation de priorité

1. **Correction 1** (bannière) — immédiat, clarifie le comportement actuel
2. **Correction 2** (sécuriser createInvoice) — immédiat, empêche le contournement
3. **Correction 4** (distinguer factures) — rapide, améliore la traçabilité
4. **Correction 3** (RPC serveur) — plus complexe mais nécessaire pour la sécurité en production

