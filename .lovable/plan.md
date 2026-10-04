# Occupation par le propriétaire (multi-locaux) et ordre des champs IRL

## 1. Onglet Localisation — « Divisé en plusieurs locaux »

Après « Ce local est-il actuellement occupé ? » = Oui, nouvelle question à cocher :
**« Ce local est occupé par : » Le propriétaire (bailleur) / Un locataire**

- Question obligatoire quand le local est occupé (signalée en rouge si manquante, bloque comme les autres champs requis).
- Si « Le propriétaire » : les champs « En location depuis le », « Loyer mensuel (USD) » et « Contrat de location (optionnel) » sont masqués, vidés et ne sont plus exigés.
- Si « Un locataire » : comportement actuel inchangé.
- « Non » (inoccupé) : la question n'apparaît pas ; « Inoccupé depuis le » reste comme aujourd'hui.
- Usage réel, occupants et capacité d'accueil restent demandés dans les deux cas (utiles à la densité).
- S'applique à la construction principale et aux constructions additionnelles.

## 2. Alignement des autres onglets

- **Valeur marchande** : le revenu locatif total et les calculs de rendement ne comptent que les locaux loués à un locataire ; les locaux occupés par le propriétaire sont exclus (et affichés comme tels si le détail par local est montré).
- **Obligations (IRL)** : le loyer total rappelé sous « Construction concernée » exclut les locaux du propriétaire ; une construction dont aucun local n'est loué à un locataire n'est plus proposée pour l'IRL.
- **Récapitulatif** : chaque local affiche « Occupé par le propriétaire » ou « Occupé par un locataire ».
- Notification « contrat de location manquant » : ignore les locaux occupés par le propriétaire.
- Admin (fiche contribution) : affichage de la nouvelle information.

## 3. Onglet Obligations — sous-onglet Taxe

Pour « Impôt sur les revenus locatifs », ordre : **Type de taxe → Construction concernée → Année**.
- L'Année est désactivée tant qu'aucune construction n'est choisie.
- Changer de type ou de construction réinitialise l'Année si elle devient incohérente (déjà déclarée pour cette construction).
- Impôt foncier annuel : ordre actuel Type → Année inchangé.

## 4. Vérification

- Tests automatiques ajoutés : validation (local propriétaire sans loyer/date = valide ; local locataire sans loyer = bloquant), calcul des loyers, ordre IRL.
- Relecture complète des onglets CCC, typecheck et suite de tests ; contrôle visuel des écrans accessibles.

## Détails techniques

- `RentalUnit` gagne `occupiedBy?: 'owner' | 'tenant'` ; stockée en `occupied_by` dans le jsonb `rental_units` (aucune nouvelle colonne). Choisir « owner » vide `monthlyRentUsd`, `rentalStartDate`, `leaseContractUrl`.
- Fichiers : `RentalConfigurationFields.tsx`, `useFormValidation.ts` (branches multi principale l.195-220 et additionnelles l.265-290), mapping snake/camel (`contributionFormMapping.ts`), `marketValueUtils.ts`/`MarketValueTab.tsx`, `ObligationsTab.tsx` (réordonner le bloc construction avant l'année, `buildRentalConstructionRefs`), `RentalSummary.tsx`, `leaseContractNotice.ts`, `userRentalMarket.ts`, `cccConsistency.ts` admin.
- Back-end : migration mettant à jour la validation serveur des `rental_units` (fonction de cohérence existante, migration 20260804102644) pour ne pas exiger loyer/date quand `occupied_by = 'owner'`, et refuser un loyer sur ces locaux ; anciennes données sans `occupied_by` traitées comme « locataire ».
