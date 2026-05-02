---
name: Dispute existence is paid-only
description: L'existence d'un litige (parcels.has_dispute) est une information du service payant land_disputes — interdiction de la divulguer en surface publique (carte, en-têtes, badges, résultats de recherche).
type: constraint
---

## Règle

Le booléen `parcels.has_dispute` (et toute donnée dérivée comme `legal_verification.has_dispute`) signale qu'une parcelle est greffée d'un litige foncier actif. Cette information appartient exclusivement au service payant `land_disputes` du catalogue cadastral (voir `CadastralDocumentView.tsx` → `paidServices.includes('land_disputes')` + `LockedSection`).

**Interdictions absolues sur les surfaces accessibles avant paiement :**
- ❌ Étiquette/marker « ⚠ Litige » sur la carte cadastrale (`useLeafletMap.tsx`).
- ❌ Couleur/contour spécifique aux parcelles en litige sur la carte.
- ❌ Badge « Litige » dans `DocumentHeader.tsx` ou tout autre en-tête de fiche.
- ❌ Indicateur dans `CadastralResultCard` ou les résultats de recherche.
- ❌ Sélection du champ `has_dispute` dans les requêtes alimentant ces vues publiques (ex. `useCadastralMapData`).

## Pourquoi

1. **Modèle économique** : la consultation des litiges est un service facturé. La révéler gratuitement détruit la valeur du service.
2. **Réputation** : un faux signalement, ou un litige en cours de résolution, exposé publiquement nuit injustement au propriétaire de la parcelle.
3. **Cohérence** : l'app applique déjà ce principe via `LockedSection` pour la section Litiges du document — les surfaces périphériques doivent suivre la même règle.

## Usages légitimes (à conserver)

- ✅ `LandDisputeReportForm` (workflow propriétaire qui signale).
- ✅ `AdminCCC*`, `CCCDetailsDialog` (espace admin).
- ✅ `useLandDataAnalytics` (analytics agrégés/anonymisés).
- ✅ `pdf.ts` lors de la génération du rapport cadastral payant complet.
- ✅ `DisputesSection` à l'intérieur de `CadastralDocumentView` quand `paidServices.includes('land_disputes')`.

## Surfaces fixées (mai 2026)

- `useCadastralMapData.tsx` : retrait de `has_dispute` du `select` et du type `ParcelData`.
- `useLeafletMap.tsx` : suppression de la branche `hasDispute` (couleur, contour, marker).
- `DocumentHeader.tsx` : suppression du badge `Litige`.
