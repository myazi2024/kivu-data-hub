

# Supprimer le filtre "Tous paiements" du panneau Temps/Analytics

## Changement
Supprimer le bloc du sélecteur de statut de paiement (lignes 282-289) dans `AnalyticsFilters.tsx`. Cela inclut le `Select` avec l'icône `CreditCard`, l'option "Tous paiements" et les options dynamiques `paymentStatusOptions`.

## Nettoyage associé
- Retirer l'import `CreditCard` de `lucide-react` s'il n'est plus utilisé ailleurs dans le fichier.
- Retirer la prop `hidePaymentStatus` et la variable `paymentStatusOptions` si elles ne sont plus référencées.
- Retirer `paymentStatus` du type `AnalyticsFilter` dans `analyticsHelpers.ts` et la fonction `matchesPaymentStatus`.

## Fichiers modifiés
- `src/components/visualizations/filters/AnalyticsFilters.tsx`
- `src/utils/analyticsHelpers.ts`

