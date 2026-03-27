

# Ajouter la section "Autorisation de bâtir" au bloc Construction du formulaire d'expertise

## Contexte

Le bloc Construction du formulaire d'expertise a été aligné sur le CCC (Catégorie, Type, Matériaux, Nature, Usage, Standing), mais il manque la section "Autorisation de bâtir" qui suit le Standing dans le CCC (GeneralTab.tsx lignes 1063-1231).

La table `real_estate_expertise_requests` ne possède aucune colonne pour stocker les données d'autorisation.

## Plan

### 1. Migration SQL — colonnes autorisation

Ajouter à `real_estate_expertise_requests` :
- `has_building_permit` (boolean) — Oui/Non
- `building_permit_number` (text) — N° de l'autorisation
- `building_permit_type` (text) — 'construction' ou 'regularization'
- `building_permit_issue_date` (date) — date de délivrance
- `building_permit_issuing_service` (text) — service émetteur
- `building_permit_document_url` (text) — URL du document uploadé

### 2. UI — section Autorisation dans le formulaire d'expertise

Dans `RealEstateExpertiseRequestDialog.tsx`, après le Standing (ligne ~1246) et avant la Description :

- Toggle Oui/Non : "Avez-vous une autorisation de bâtir ?"
- Si Oui : formulaire avec type (Bâtir/Régularisation), N° autorisation, date, service émetteur (`BuildingPermitIssuingServiceSelect`), upload document
- Si Non : message informatif (comme dans le CCC)
- Masqué pour Terrain nu et Appartement (comme dans le CCC)
- Validation date liée à l'année de construction (même logique que le CCC)

### 3. Soumission et résumé

- Ajouter les champs autorisation dans la logique d'insertion DB
- Upload du document vers Supabase Storage si fourni
- Afficher les infos autorisation dans le résumé (étape finale)
- Mettre à jour le calcul du score de complétion

### 4. Types Supabase

Mettre à jour `types.ts` avec les nouvelles colonnes.

## Fichiers

| Action | Fichier |
|--------|---------|
| Migration | Nouvelles colonnes sur `real_estate_expertise_requests` |
| Modifié | `RealEstateExpertiseRequestDialog.tsx` — UI autorisation + soumission + résumé |
| Modifié | `src/integrations/supabase/types.ts` — nouvelles colonnes |

