

# Fix — Paiement test : "Impossible de créer la facture"

## Cause

En mode test avec paiement activé, `createInvoice()` appelle la RPC `create_cadastral_invoice_secure` qui échoue (probablement une erreur interne liée aux prix ou séquences). Le `processTestPayment` a besoin d'un `invoiceId` pour fonctionner, mais il ne reçoit jamais cet ID car la création de facture échoue en amont.

## Solution

Quand le mode test est actif, `createInvoice` doit contourner la RPC sécurisée et créer la facture directement via un INSERT simple (comme le chemin bypass gratuit), mais avec le statut `'pending'` pour que le dialog de paiement test puisse ensuite la marquer comme `'paid'`.

## Modification

**Fichier** : `src/hooks/useCadastralPayment.tsx`

Dans `createInvoice`, ajouter un paramètre `isTestMode` ou importer `useTestMode`, puis avant l'appel RPC (ligne 128), ajouter une branche :

```
if (isTestModeActive) {
  // Insert direct sans RPC — facture pending pour simulation
  const { data: invoice, error } = await supabase
    .from('cadastral_invoices')
    .insert({
      user_id: user.id,
      parcel_number: parcelNumber,
      selected_services: serviceIds,
      total_amount_usd: totalAmount,
      original_amount_usd: totalAmount,
      discount_amount_usd: 0,
      payment_method: 'TEST',
      client_email: user.email || '',
      status: 'pending',
      currency_code: 'USD',
      exchange_rate_used: 1
    })
    .select()
    .single();

  if (error) throw error;
  return { id: invoice.id, invoice_number: invoice.invoice_number || 'TEST-...', ... };
}
```

Cela permet au dialog de paiement test de recevoir un `invoiceId` valide, puis `processTestPayment` complète le flux normalement.

**Fichier secondaire** : aucun autre changement nécessaire — le dialog et `processTestPayment` sont déjà câblés correctement.

