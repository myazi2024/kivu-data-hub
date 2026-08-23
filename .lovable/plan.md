# Plan : Reformulation de l'onglet « Valeur marchande » du formulaire CCC

## Objectif
Reformuler l'onglet « Valeur » pour le recentrer sur l'avis du propriétaire plutôt que sur une annonce de vente transactionnelle, et supprimer les informations de paiement non pertinentes.

## Fichier principal
`src/components/cadastral/ccc-tabs/MarketValueTab.tsx`

## Changements

### 1. Titre du bloc principal (ligne 260)
- **Avant :** `Valeur marchande de la parcelle`
- **Après :** `Nous souhaitons connaître votre avis sur cette parcelle`
- Sous-titre conservé (« Estimation commerciale et expertise éventuelle »).

### 2. Suppression du bloc « Modalités de prix » (lignes 424-450)
Retirer entièrement ce bloc dans la section « Annonce de vente » :
- Le sélecteur **Prix** (Ferme / Négociable)
- Le sélecteur **Modalités de paiement** (Cash / Échelonné / Cash ou échelonné)

Les champs `priceNegotiable` et `paymentTerms` ne sont plus collectés côté UI. Les champs DB restent intacts (pas de migration) — les enregistrements existants sont juste ignorés à l'affichage.

### 3. Titre « Description & contact » (ligne 482 — annonce de vente)
- **Avant :** `Description & contact`
- **Après :** `Comment décririez-vous cette propriété en quelques mots ?`

### 4. Titre « Description & contact » (ligne 958 — annonces de location des locaux vacants)
- **Avant :** `Description & contact`
- **Après :** `Comment décririez-vous cette propriété en quelques mots ?`

### 5. Titre expertise (ligne 553)
- **Avant :** `Valeur vénale — une expertise immobilière a-t-elle été réalisée au cours des 6 derniers mois ?`
- **Après :** `Une expertise immobilière a-t-elle été réalisée au cours des 6 derniers mois ?`

## Cohérence — récapitulatif et admin

### `src/components/cadastral/ccc-tabs/review/MarketValueSummary.tsx`
- Ligne 94 : retirer l'affichage de `sale.paymentTerms` (« Modalités: … ») puisque ce champ n'est plus collecté. Conserver les autres infos (Disponibilité, Description, Contact, Créneaux).

### Vérification admin (`CCCMarketValuePanel.tsx` / `CCCRentalBlock.tsx`)
- Vérifier qu'aucun titre n'affiche « Valeur marchande de la parcelle » ni « Description & contact » ; adapter si présents.
- Les panneaux admin lisent `paymentTerms` uniquement si présent en base — pas de modification nécessaire (compatibilité ascendante).

## Validation
- Typecheck (`tsgo`) après modifications.
- Vérifier l'onglet Valeur dans le preview : titre du bloc, absence du bloc Modalités de prix, nouveaux titres des descriptions, titre expertise.
