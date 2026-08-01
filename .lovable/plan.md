# Audit onglets « Localisation » et « Valeur marchande » — correctifs

Revue des deux onglets (UI, hooks d'état, validation, persistance, mapping base de données). Deux pertes de données confirmées en mode édition, plus trois points de cohérence.

## 1. Perte de l'annonce de vente à la réédition (critique)

L'annonce de vente (photos de la parcelle, prix ferme/négociable, modalités de paiement, disponibilité, description, contact, créneaux) est bien enregistrée en base, mais n'est **jamais rechargée** quand l'utilisateur rouvre sa contribution. Tout le bloc réapparaît vide, la validation le re-signale comme incomplet, et un nouvel enregistrement écrase les données d'origine.

Correctif : restaurer ce bloc au chargement.

## 2. Perte de la configuration locative de la construction principale (critique)

Même problème pour la construction principale mise en location : le mode (« un seul local » / « plusieurs locaux »), le nombre de locaux, le loyer mensuel et le détail de chaque local (loyer, occupation, capacité, étage, date de mise en location) ne sont pas rechargés. Les constructions **additionnelles**, elles, sont bien restaurées — l'asymétrie confirme l'oubli.

Conséquence : à la réédition d'un bien en location, l'onglet redevient bloquant sans raison visible pour l'utilisateur.

Correctif : restaurer ces champs, à l'identique de ce qui est fait pour les constructions additionnelles.

## 3. Date de mise en location incohérente après changement d'année de construction (important)

Quand l'utilisateur corrige l'année de construction, seule la date globale de mise en location est purgée si elle devient antérieure. En mode « plusieurs locaux », les dates saisies **par local** restent inchangées et deviennent incohérentes. L'erreur n'apparaît qu'à la soumission, sans pointer le local fautif.

Correctif : appliquer la même purge aux dates de chaque local, pour la construction principale comme pour les constructions additionnelles.

## 4. Fenêtre « expertise de moins de 6 mois » figée (mineur)

Les bornes de dates de l'onglet Valeur sont calculées une seule fois au chargement de la page. Sur une session très longue, la borne devient légèrement obsolète.

Correctif : calculer ces bornes au rendu.

## 5. Clés de liste instables sur les permis de construire (mineur)

La liste des permis utilise l'index comme clé React : risque de champs mélangés si une suppression de permis est ajoutée plus tard.

Correctif : clé stable.

## Points vérifiés et jugés corrects (aucun changement)

- Entrée de parcelle et largeur de servitude : l'interface existe bien (panneau des côtés de parcelle) — validation et UI cohérentes.
- Cascade catégorie → type → nature → matériaux → usage, réinitialisation des champs locatifs au changement d'usage, agrégation automatique de la capacité d'accueil en mode multi : cohérentes et symétriques entre construction principale et additionnelle.
- Réindexation des références lors de la suppression d'une construction (taxes IRL, annonces) : correcte.
- Restauration de la servitude, des côtés de voirie, des tracés et de l'environnement sonore : correcte.

## Détails techniques

- `src/hooks/useCCCFormState.ts` (bloc `setFormData` de restauration, ~l.1100-1139) : ajouter `saleListing: (contrib as any).sale_listing || undefined` et `rentalConfiguration`, `rentalUnitsCount`, `monthlyRentUsd`, `rentalUnits` (depuis `rental_configuration`, `rental_units_count`, `monthly_rent_usd`, `rental_units`).
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` (~l.271-277) et `src/components/cadastral/AdditionalConstructionBlock.tsx` (~l.446-458) : étendre l'effet de purge de `rentalStartDate` aux entrées de `rentalUnits[]`.
- `src/components/cadastral/ccc-tabs/market-value/marketValueUtils.ts` (~l.66-71) : transformer `MIN_DATE`/`TODAY` en helpers calculés à l'appel, et adapter les appelants (`MarketValueTab.tsx`, `useFormValidation.ts`).
- `ConstructionSection.tsx` (~l.416) : clé de liste stable pour `buildingPermits`.

Aucune migration SQL, aucune modification de RLS, d'edge function ou de règle métier : uniquement restauration, cohérence de reset et affichage.
