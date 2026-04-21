
## Fix — Paiement test cadastral : la simulation Mobile Money casse sur `cadastral_invoices.payment_id`

### Cause racine

Le message affiché côté UI (`Traitement en cours, confirmer le paiement sur votre téléphone`) montre que ce n’est pas le bouton `Simuler le paiement (test)` qui est en cause, mais le flux **Mobile Money**.

Dans ce flux :

1. `process-mobile-money-payment` crée une ligne dans `payment_transactions` puis la passe à `status='completed'` en simulation.
2. Le trigger SQL `sync_invoice_on_tx_completed()` s’exécute.
3. Ce trigger fait :
```sql
UPDATE public.cadastral_invoices
   SET status = 'paid', payment_id = NEW.id, updated_at = now()
 WHERE id = NEW.invoice_id;
```
4. Or `cadastral_invoices.payment_id` référence **`public.payments(id)`**, alors que `NEW.id` vient de **`payment_transactions(id)`**.
5. Résultat : violation FK `cadastral_invoices_payment_id_fkey`.

### Pourquoi le bug persiste

Le correctif précédent a bien retiré `payment_id: txn.id` de `useCadastralPayment.tsx`, mais l’erreur se produit maintenant **côté base**, via le trigger automatique sur `payment_transactions`. Donc le frontend n’est plus la source du problème principal.

### Travaux à appliquer

#### 1. Corriger le trigger SQL de synchronisation facture/transaction
Créer une migration Supabase pour modifier `public.sync_invoice_on_tx_completed()` afin de :

- continuer à mettre `status='paid'`
- continuer à mettre `updated_at=now()`
- **ne plus écrire `payment_id = NEW.id`**

Version attendue :
```sql
UPDATE public.cadastral_invoices
   SET status = 'paid',
       updated_at = now()
 WHERE id = NEW.invoice_id
   AND status <> 'paid';
```

#### 2. Audit de cohérence sur les autres flux cadastral
Le même anti-pattern existe aussi dans `supabase/functions/stripe-webhook/index.ts` :

```ts
.update({
  status: "paid",
  payment_id: session.id,
  updated_at: ...
})
```

Problème :
- `session.id` Stripe n’est pas un `payments.id`
- c’est potentiellement une seconde source de casse ou de dette

Correction prévue :
- retirer aussi l’écriture de `payment_id` sur `cadastral_invoices` dans ce handler
- conserver la traçabilité via `payment_transactions.invoice_id` + `transaction_reference`

#### 3. Garder le modèle de traçabilité cohérent
Le lien métier correct pour les services cadastraux devient :

```text
cadastral_invoices.id
   ↑
payment_transactions.invoice_id
```

et non :

```text
cadastral_invoices.payment_id -> payment_transactions.id
```

Le champ `cadastral_invoices.payment_id` reste inchangé en base pour compatibilité historique, mais n’est plus alimenté par les flux cadastraux tant qu’il référence `payments`.

#### 4. Vérifier le bouton test dédié
Conserver le fix déjà fait dans `src/hooks/useCadastralPayment.tsx` :
- ne pas réintroduire `payment_id` dans `processTestPayment`

Aucune autre modification front nécessaire pour cette erreur spécifique.

### Fichiers concernés

- `supabase/migrations/<new_migration>.sql`
- `supabase/functions/stripe-webhook/index.ts`
- vérification de non-régression dans :
  - `src/hooks/useCadastralPayment.tsx`
  - `supabase/functions/process-mobile-money-payment/index.ts`

### Validation attendue

#### Cas 1 — Mobile Money en mode test
- Catalogue cadastral
- ouvrir paiement
- choisir Mobile Money
- lancer le paiement en simulation
- attendre l’auto-complétion
- résultat attendu :
  - pas de toast FK rouge
  - facture passe à `paid`
  - services débloqués
  - event `cadastralPaymentCompleted` déclenché

#### Cas 2 — Bouton `Simuler le paiement (test)`
- cliquer sur le bouton dédié
- résultat attendu :
  - aucun toast d’erreur
  - facture `paid`
  - accès accordé

#### Cas 3 — Vérification DB
- `payment_transactions` contient la transaction simulée
- `cadastral_invoices.status = 'paid'`
- `cadastral_invoices.payment_id` reste `NULL` pour le flux cadastral test/mobile money
- aucune violation FK

### Hors périmètre

- Pas de redesign complet du schéma `cadastral_invoices.payment_id`
- Pas de refonte du système `payments` global
- Pas de changement UX sur le texte “Confirmez le paiement sur votre téléphone”, même s’il est un peu trompeur en mode simulation

### Détail technique

```text
Flux fautif actuel
payment_transactions.completed
  -> trigger sync_invoice_on_tx_completed
    -> cadastral_invoices.payment_id = payment_transactions.id
    -> FK cassée (attend payments.id)

Flux corrigé
payment_transactions.completed
  -> trigger sync_invoice_on_tx_completed
    -> cadastral_invoices.status = 'paid'
    -> traçabilité via payment_transactions.invoice_id
```
