# Audit — Fiche Cadastrale : Informations manquantes

(Données ficitives : Ne pas ajouter les données et indicateurs qui ne sont pas collectés par les outils de collecte de l'application)

## Champs DB présents mais absents de la fiche

En comparant les colonnes de `cadastral_parcels` avec les sections affichées, voici les données existantes en base mais **jamais affichées** :


| Champ DB                  | Description                                 | Section concernée              |
| ------------------------- | ------------------------------------------- | ------------------------------ |
| `location`                | Adresse textuelle libre (obligatoire en DB) | Identification ou Localisation |
| `parcel_sides`            | JSONB — dimensions et orientation des côtés | Localisation                   |
| `surface_calculee_bornes` | Surface recalculée à partir des bornes GPS  | Identification                 |
| `has_dispute`             | Boolean — flag litige sur la parcelle       | Vérification juridique         |
| `is_subdivided`           | Boolean — parcelle lotie/subdivisée         | Identification                 |


## Données relationnelles manquantes


| Donnée                       | Problème                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Paiements hypothécaires**  | Les `MortgagePayment[]` sont récupérés mais seul le **total remboursé** est affiché — pas de détail par échéance |
| **Documents de bornage**     | Affichés uniquement s'ils ont une URL — pas d'indication "document manquant"                                     |
| **Reçus de taxe**            | `receipt_document_url` existe dans `TaxHistory` mais n'est jamais affiché                                        |
| **Documents de permis**      | `permit_document_url` existe dans `BuildingPermit` mais n'est jamais affiché                                     |
| **Contact service émetteur** | `issuing_service_contact` existe dans `BuildingPermit` mais n'est jamais affiché                                 |
| **Type de litige**           | `dispute_type` existe dans `LandDispute` mais n'est pas dans le tableau                                          |
| **Parcelle du litige**       | `parcel_number` existe dans `LandDispute` mais n'est pas affiché                                                 |


## Informations contextuelles absentes


| Information                 | Impact                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Durée du bail**           | `lease_type` est affiché mais pas la durée restante ni les années de bail (La donnée Bail n'est pas par l'application). |
| **Surface GPS vs déclarée** | `surface_calculee_bornes` permettrait d'afficher un écart entre surface déclarée et mesurée                             |
| **Dimensions des côtés**    | `parcel_sides` contient les longueurs et orientations — utile pour un croquis ou tableau                                |
| **Statut de subdivision**   | `is_subdivided` est utilisé dans `LegalSection` via `legal_verification` mais pas dans `IdentificationSection`          |
| **Indicateur de litige**    | `has_dispute` est un flag direct sur la parcelle, redondant avec `LegalSection` mais absent de l'en-tête/identification |


## Corrections proposées

### 1. IdentificationSection — ajouter 3 champs

- `location` (adresse textuelle)
- `surface_calculee_bornes` avec écart vs `area_sqm` si disponible
- `is_subdivided` (badge Oui/Non)

### 2. LocationSection — ajouter dimensions des côtés

- Afficher `parcel_sides` sous forme de tableau (Côté, Longueur, Orientation) si le JSONB est non vide

### 3. ConstructionSection — ajouter documents et contact

- `permit_document_url` : lien DocumentAttachment par permis
- `issuing_service_contact` : champ texte sous le service émetteur

### 4. ObligationsSection — ajouter reçus fiscaux

- `receipt_document_url` : lien DocumentAttachment par ligne de taxe

### 5. DisputesSection — ajouter type de litige

- Colonne `dispute_type` dans le tableau

### 6. DocumentHeader — indicateur visuel litige

- Si `parcel.has_dispute === true`, afficher un badge orange "⚠ Litige" à côté du type de parcelle

## Fichiers impactés


| Fichier                              | Modifications                                           |
| ------------------------------------ | ------------------------------------------------------- |
| `sections/IdentificationSection.tsx` | +3 DataFields (location, surface bornes, is_subdivided) |
| `sections/LocationSection.tsx`       | +tableau parcel_sides                                   |
| `sections/ConstructionSection.tsx`   | +DocumentAttachment par permis, +contact service        |
| `sections/ObligationsSection.tsx`    | +DocumentAttachment par reçu fiscal                     |
| `sections/DisputesSection.tsx`       | +colonne dispute_type                                   |
| `DocumentHeader.tsx`                 | +badge litige conditionnel                              |
