# Plan : Ajustements de l'onglet Valeur (annonce de vente)

## Objectif
Rendre l'annonce de vente plus incitative, retirer la disponibilité (non pertinente) et harmoniser la casse des titres de description.

## Fichier principal
`src/components/cadastral/ccc-tabs/MarketValueTab.tsx`

## Changements

### 1. Titre « Détails de l'annonce de vente » (ligne 371)
- **Avant :** `Détails de l'annonce de vente` (rendu en majuscules par la classe `uppercase`).
- **Après :** `Pouvez-vous ajouter quelques images de cette parcelle qui la met en valeur ?`
- Supprimer les classes `uppercase tracking-wide` de ce Label pour que la phrase s'affiche en minuscules telle qu'écrite. L'icône Home est conservée.

### 2. Suppression du bloc « Disponibilité » (lignes 442-468)
Retirer entièrement le bloc dans la section annonce de vente :
- Le sélecteur **Disponible** (Immédiatement / Sous conditions)
- Le champ **Précisions** conditionnel

Impacts à traiter :
- **Validation « Suivant » (lignes 1047-1050)** : supprimer le contrôle `if (!sale.availability)` et son toast, le champ n'existe plus.
- **Récapitulatif `MarketValueSummary.tsx` (lignes 108-111)** : retirer l'affichage « Disponibilité: … » et la constante `AVAILABILITY_LABELS` (lignes 15-18) devenue inutilisée.

Les champs `availability`/`availabilityNote` restent dans la structure `saleListing` en base (pas de migration) — les enregistrements existants sont simplement ignorés à l'affichage. Le serveur (`validate_contribution_completeness`) n'exige pas la disponibilité, aucune modification backend nécessaire.

### 3. Mise en minuscules de « Comment décririez-vous cette propriété en quelques mots ? » (lignes 472 et 947)
Supprimer les classes `uppercase tracking-wide` des deux Labels (annonce de vente et annonces de location des locaux vacants) pour que le titre s'affiche en minuscules.

## Cohérence — récapitulatif

### `src/components/cadastral/ccc-tabs/review/MarketValueSummary.tsx`
- Ligne 107 : retirer `Prix: {sale.priceNegotiable ? 'Négociable' : 'Ferme'}` — le champ `priceNegotiable` n'est plus collecté depuis la reformulation précédente de l'onglet ; l'affichait « Ferme » par défaut est trompeur.
- Conserver : Photos, Description, Contact, Créneaux de visite.

## Vérification admin
`CCCMarketValuePanel.tsx` n'affiche ni « Détails de l'annonce de vente », ni la disponibilité, ni « Prix Ferme/Négociable » — aucune modification nécessaire.

## Validation
- Typecheck (`tsgo`) après modifications.
- Vérifier l'onglet Valeur dans le preview : nouvelle phrase incitative en minuscules, absence du bloc Disponibilité, titres de description en minuscules.
