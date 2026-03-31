

# Audit — Configuration des moyens de paiement

## Architecture

```text
┌─ Admin ──────────────────────────────┐
│ AdminPaymentMode      (on/off)       │
│ AdminPaymentMethods   (clés API)     │
│ AdminPaymentServiceIntegration       │
└──────────────────────────────────────┘
         ↓ payment_methods_config
┌─ Hooks ──────────────────────────────┐
│ usePaymentConfig   (état global)     │
│ usePaymentMethods  (CRUD admin)      │
│ usePaymentProviders (liste MM)       │
│ usePayment         (publications)    │
│ useCadastralPayment (services cad.)  │
│ usePermitPayment   (autorisations)   │
└──────────────────────────────────────┘
         ↓ supabase.functions.invoke
┌─ Edge Functions ─────────────────────┐
│ process-mobile-money-payment         │
│ create-payment (Stripe)              │
│ stripe-webhook                       │
└──────────────────────────────────────┘
```

8 composants UI appellent directement les Edge Functions de paiement. 3 hooks partagés + 1 helper (`expertisePaymentHelper`).

---

## Problemes identifies

### 1. CRITIQUE — Collecte du code PIN (PCI/securite)

**Fichier** : `MobileMoneyPayment.tsx` lignes 241-262
**Probleme** : Le champ "Code secret" collecte le PIN Mobile Money de l'utilisateur (`paymentData.name`). Les operateurs (Airtel, Orange, Vodacom) gerent la saisie du PIN via le push USSD sur le telephone. Collecter le PIN cote application viole les regles PCI-DSS et expose a des risques de vol de credentials. Le champ est requis pour soumettre (`disabled={!paymentData.name}`).
**Impact** : Faille de securite majeure. Risque legal.

### 2. CRITIQUE — IDs provider incoherents (3 systemes differents)

| Source | Airtel | Orange | M-Pesa |
|---|---|---|---|
| Admin defaults (L127-131) | `airtel` | `orange` | `mpesa` |
| usePaymentProviders / MobileMoneyPayment | `airtel_money` | `orange_money` | `mpesa` |
| RealEstateExpertiseRequestDialog | `airtel_money` | `orange_money` | `m_pesa` |
| CancellationPaymentStep | `mpesa` | `airtel_money` | `orange_money` |

**Probleme** : L'Edge Function valide le provider via `payment_methods_config.provider_id`. Si l'admin initialise avec `airtel` (default) mais le frontend envoie `airtel_money`, la requete echoue : "Payment provider not available".
**Impact** : Paiements rejetes silencieusement selon le composant utilise.

### 3. CRITIQUE — Edge Function `create-payment` (Stripe) ne supporte pas 3 types de paiement

**Fichier** : `create-payment/index.ts` ligne 13
**Types supportes** : `publications`, `cadastral_service`, `expertise_fee`, `certificate_access`, `mutation_request`
**Types manquants** : `permit_request` (autorisations de batir), `mortgage_cancellation` (mainlevees), `land_title_request` (titres fonciers)
**Probleme** : Si l'utilisateur choisit "Carte bancaire" pour ces 3 services, l'Edge Function retourne "Invalid payment request".
**Impact** : Paiement Stripe impossible pour 3 services sur 8.

### 4. CRITIQUE — Simulation en production (setTimeout)

**Fichier** : `process-mobile-money-payment/index.ts` lignes 218-234
**Probleme** : Le bloc "Real payment processing" (quand `test_mode=false` ET `apiKey` existe) contient un `setTimeout` qui auto-complete la transaction apres 5 secondes avec `provider_simulated: true`. Aucun appel reel a une API de paiement n'est effectue.
**Impact** : En production, les transactions sont marquees "completed" sans transfert d'argent reel.

### 5. MOYEN — Providers hardcodes dans 3 composants UI

| Composant | Lit la config DB ? |
|---|---|
| MobileMoneyPayment | Oui (via useEffect direct) |
| CancellationPaymentStep | Non — 3 `<SelectItem>` en dur |
| RealEstateExpertiseRequestDialog | Non — 3 `<SelectItem>` en dur (x2 occurrences) |
| MutationRequestDialog | ? |

**Probleme** : Si l'admin desactive Airtel Money, il reste visible dans CancellationPaymentStep et RealEstateExpertiseRequestDialog. Le hook `usePaymentProviders` existe mais n'est pas utilise par ces composants.
**Impact** : Incoherence entre config admin et UI utilisateur.

### 6. MOYEN — `usePayment.tsx` reimplemente le polling

**Fichier** : `usePayment.tsx` lignes 59-90
**Probleme** : Boucle `while` avec 20 tentatives et `setTimeout` de 2s, alors que `pollTransactionStatus` centralise cette logique et supporte `AbortSignal`. Tous les autres hooks (`useCadastralPayment`, `usePermitPayment`, `expertisePaymentHelper`) utilisent deja `pollTransactionStatus`.
**Impact** : Code duplique, pas de support d'annulation.

### 7. MOYEN — `stripe-webhook` utilise route obsolete

**Fichier** : `stripe-webhook/index.ts` ligne 195
**Code** : `action_url: "/user-dashboard?tab=mutations"`
**Probleme** : Route `/user-dashboard` remplacee par `/mon-compte` dans le correctif precedent. Les notifications de paiement mutation par Stripe pointent vers l'ancienne route.
**Impact** : Redirection incorrecte via le `<Navigate>` (fonctionne mais URL sale).

### 8. MOYEN — Pas de validation Zod dans les Edge Functions

**Fichiers** : `process-mobile-money-payment/index.ts`, `create-payment/index.ts`
**Probleme** : Les deux Edge Functions utilisent une validation manuelle (`if (!body.payment_provider || ...)`). Aucune sanitization des champs (longueur, format telephone, injection).
**Impact** : Surface d'attaque accrue.

### 9. MOYEN — Double source de verite pour la cle Stripe

**Fichier** : `create-payment/index.ts` ligne 211
**Probleme** : La cle Stripe est lue depuis `Deno.env.get("STRIPE_SECRET_KEY")` (variable d'environnement) mais la config DB (`payment_methods_config.api_credentials.secretKey`) est aussi interrogee (ligne 198-204) uniquement pour verifier l'activation. Si les cles different, le paiement utilise celle de l'env, pas celle de la DB.
**Impact** : Confusion pour l'admin qui met a jour les cles dans le panneau admin mais pas dans les secrets Supabase.

### 10. MINEUR — Hook `usePaymentProviders` inutilise

**Fichier** : `src/hooks/usePaymentProviders.ts`
**Probleme** : Ce hook centralise le chargement des providers Mobile Money. Mais `MobileMoneyPayment.tsx` reimplemente la meme logique en interne (lignes 42-80). Les composants hardcodes ne l'utilisent pas non plus.
**Impact** : Code mort, objectif de centralisation non atteint.

### 11. MINEUR — `permit_request` et `mortgage_cancellation` absents du webhook Stripe

**Fichier** : `stripe-webhook/index.ts` — le `switch` sur `paymentType` ne gere pas ces types
**Impact** : Meme si `create-payment` etait corrige pour les supporter, le webhook ne traiterait pas le callback de completion.

---

## Recommandations

### Corrections prioritaires (securite + blocage fonctionnel)

1. **Supprimer le champ "Code secret/PIN"** de `MobileMoneyPayment.tsx`. Retirer le champ, la validation associee (`!paymentData.name`), et le champ `name` de `PaymentData`.

2. **Unifier les IDs providers** sur `airtel_money`, `orange_money`, `mpesa` partout :
   - `AdminPaymentMethods.tsx` : defaults L127-131
   - `RealEstateExpertiseRequestDialog.tsx` : remplacer `m_pesa` → `mpesa`
   - Remplacer tous les hardcodes par le hook `usePaymentProviders`

3. **Remplacer les providers hardcodes** dans `CancellationPaymentStep` et `RealEstateExpertiseRequestDialog` par `usePaymentProviders`.

4. **Corriger la route webhook** : `/user-dashboard?tab=mutations` → `/mon-compte?tab=mutations` dans `stripe-webhook`.

### Ameliorations architecturales

5. **Ajouter les types manquants** (`permit_request`, `mortgage_cancellation`, `land_title_request`) dans `create-payment` et `stripe-webhook` pour supporter Stripe sur tous les services.

6. **Remplacer le polling duplique** dans `usePayment.tsx` par `pollTransactionStatus`.

7. **Ajouter la validation Zod** dans les deux Edge Functions.

8. **Documenter la strategie de cle Stripe** : soit utiliser exclusivement `Deno.env` (recommande), soit lire depuis la DB — pas les deux.

### Fichiers concernes

| Fichier | Corrections |
|---|---|
| `src/components/payment/MobileMoneyPayment.tsx` | #1 PIN, #6 polling |
| `src/components/admin/AdminPaymentMethods.tsx` | #2 IDs |
| `src/components/cadastral/mortgage-cancellation/CancellationPaymentStep.tsx` | #3 providers dynamiques |
| `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` | #2 m_pesa, #3 providers |
| `src/hooks/usePayment.tsx` | #6 polling |
| `supabase/functions/stripe-webhook/index.ts` | #4 route, #5 types, #11 |
| `supabase/functions/create-payment/index.ts` | #5 types |
| `supabase/functions/process-mobile-money-payment/index.ts` | #7 Zod |

