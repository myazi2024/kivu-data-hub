

# Revue du bloc "Moyens de Paiement" — Divergences et améliorations

## Divergences identifiées

| Problème | Détail |
|----------|--------|
| **Duplication composant / hook** | `AdminPaymentMethods.tsx` gère son propre state local et ses propres requêtes Supabase, alors que le hook `usePaymentMethods.tsx` fait exactement la même chose. Le composant n'utilise pas le hook. |
| **Pas de dirty-check** | Le bouton "Sauvegarder" est toujours actif, contrairement au pattern établi dans `AdminTestMode` et `AdminPaymentMode` qui implémentent `isDirty`. |
| **Pas d'audit logging** | Les changements de configuration des moyens de paiement ne sont pas journalisés dans `admin_audit_logs`, contrairement aux autres modules admin qui utilisent `logAuditAction`. |
| **Clés API stockées en clair dans la DB** | Les `api_credentials` (apiKey, secretKey, webhookSecret) sont stockées en JSON dans `payment_methods_config`. Les clés sensibles devraient être masquées après sauvegarde et idéalement stockées dans Supabase Vault ou les secrets Edge Functions. |
| **Toast au chargement initial** | `loadConfiguration()` affiche un toast de succès à chaque chargement — bruit inutile, les autres modules ne font pas ça. |
| **Select natif au lieu de composant UI** | Le sélecteur de fournisseur carte bancaire utilise un `<select>` HTML natif au lieu du composant `Select` de shadcn/ui. |
| **Pas de validation des clés API** | Aucune validation de format (ex: clé Stripe commence par `pk_`/`sk_`), l'admin peut sauvegarder des clés vides ou invalides. |
| **Pas de test de connexion** | Impossible de vérifier que les clés API fonctionnent avant de passer en production. |
| **Résumé incomplet** | La card résumé ne montre pas les devises supportées (USD, CDF) ni le lien avec le mode de paiement (activé/désactivé). |

## Plan de correction

### 1. Refactorer pour utiliser `usePaymentMethods`

Remplacer tout le state local et les requêtes directes de `AdminPaymentMethods.tsx` par le hook existant `usePaymentMethods.tsx`. Supprimer le code dupliqué.

### 2. Ajouter le dirty-check

Comparer l'état initial (snapshot au chargement) avec l'état courant pour n'activer le bouton "Sauvegarder" que quand il y a des modifications. Pattern identique à `AdminPaymentMode`.

### 3. Ajouter l'audit logging

Utiliser `logAuditAction` de `supabaseConfigUtils.ts` pour journaliser chaque sauvegarde avec les anciennes et nouvelles valeurs (en masquant les clés sensibles dans le log).

### 4. Masquer les clés API après sauvegarde

Afficher les clés existantes sous forme masquée (`sk_****...1234`) avec un bouton "Révéler". Ne renvoyer le champ que si l'admin le modifie explicitement (éviter de réécrire les clés à chaque sauvegarde).

### 5. Supprimer le toast de chargement initial

Retirer le toast de succès dans `loadConfiguration` — seul un toast d'erreur est pertinent.

### 6. Remplacer le `<select>` natif par `Select` shadcn/ui

Utiliser le composant `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` pour cohérence visuelle.

### 7. Ajouter la validation des clés API

Validation basique de format avant sauvegarde :
- Stripe : `pk_` / `sk_` / `whsec_`
- Champs obligatoires quand le fournisseur est activé

### 8. Ajouter un bouton "Tester la connexion"

Pour chaque fournisseur activé avec des clés renseignées, un bouton qui appelle une Edge Function de vérification (ping API du fournisseur) et affiche le résultat.

### 9. Enrichir la card résumé

Ajouter : devises supportées (USD, CDF), statut du mode de paiement (activé/désactivé avec lien), et indication du mode test global.

## Fichiers modifiés

| Action | Fichier |
|--------|---------|
| Modifié | `src/components/admin/AdminPaymentMethods.tsx` — Refactoring complet (hook, dirty-check, audit, masquage clés, validation, UI Select, résumé enrichi) |
| Modifié | `src/hooks/usePaymentMethods.tsx` — Ajouter support masquage clés et méthode de test connexion |
| Créé | `supabase/functions/test-payment-provider/index.ts` — Edge Function pour tester la connectivité d'un fournisseur |

