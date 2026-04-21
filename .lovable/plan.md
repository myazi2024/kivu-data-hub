

## Fix — Paiement test cadastral : violation FK `cadastral_invoices.payment_id_fkey`

### Cause racine

Dans `src/hooks/useCadastralPayment.tsx` (ligne 394-432), la fonction `processTestPayment` :

1. Insère une transaction simulée dans la table **`payment_transactions`** (récupère `txn.id`).
2. Met à jour `cadastral_invoices` avec `payment_id: txn.id`.

Or la contrainte FK `cadastral_invoices_payment_id_fkey` **référence la table `payments`**, pas `payment_transactions`. L'`id` issu de `payment_transactions` n'existe donc pas dans `payments` → violation FK, l'UPDATE échoue, le toast d'erreur s'affiche.

Le flux production Mobile Money (ligne 304-311) ne set **jamais** `payment_id` lors du `UPDATE cadastral_invoices` — c'est cohérent avec le modèle (la liaison se fait côté `payment_transactions.invoice_id`). Seul le code test a été écrit avec ce champ par erreur.

### Correction

**Fichier `src/hooks/useCadastralPayment.tsx` — `processTestPayment` (ligne 424-432)**

Retirer la ligne `payment_id: txn.id` de l'UPDATE sur `cadastral_invoices`. La traçabilité reste assurée par `payment_transactions.invoice_id` (déjà set ligne 409), exactement comme en production.

```diff
  await supabase
    .from('cadastral_invoices')
    .update({
      status: 'paid',
      payment_method: 'TEST',
-     payment_id: txn.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
```

### Validation attendue

- Mode test ON → catalogue services → ajout d'un service → « Simuler le paiement (test) ».
- Toast vert « Paiement test simulé », fiche parcellaire débloquée.
- Pas d'erreur FK en console.
- Vérification BD : la transaction `TEST-…` est bien présente dans `payment_transactions` avec `invoice_id` correctement renseigné, et la facture passe à `status='paid'`.

### Hors périmètre

- Pas de modification du schéma BD : la FK `payment_id → payments` reste inchangée (utilisée par d'autres flux comme publications).
- Pas de modification des flux Mobile Money / Stripe production (déjà corrects).
- L'erreur secondaire console `area_hectares` (générateurs CCC test, message non lié) est à traiter séparément si elle persiste.

