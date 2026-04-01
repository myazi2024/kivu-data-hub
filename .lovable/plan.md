

# Fiche cadastrale PDF accessible depuis l'espace utilisateur

## Problème

Actuellement, le téléchargement de la fiche cadastrale (rapport PDF des services achetés) n'est possible que depuis `CadastralResultCard` immédiatement après l'achat. Dans le dashboard client (`CadastralClientDashboard`), seul le PDF de la **facture** est téléchargeable, pas la **fiche cadastrale** elle-même.

## Solution

Ajouter un bouton "Fiche cadastrale" dans le tableau des factures payées du dashboard client. Ce bouton :
1. Récupère les données cadastrales de la parcelle via `useCadastralSearch` (même logique que la recherche)
2. Récupère les services payés via `cadastral_service_access`
3. Génère le PDF via `generateCadastralReport`

## Modifications

### `src/components/cadastral/CadastralClientDashboard.tsx`

- Ajouter une fonction `generateCadastralReportPDF(invoice)` qui :
  - Requête `cadastral_parcels` + tables liées (ownership, tax, mortgage, boundary, building_permits) pour le `parcel_number` de la facture
  - Requête `cadastral_service_access` pour obtenir les services payés de cet utilisateur sur cette parcelle
  - Appelle `generateCadastralReport(result, paidServices, catalogServices)`
- Ajouter un bouton `FileText` (icône document) à côté du bouton Download existant dans la colonne Actions, uniquement pour les factures `paid`
- Ajouter un état `generatingReport` pour afficher un spinner pendant la génération

### Fichier impacté

| Fichier | Modification |
|---|---|
| `src/components/cadastral/CadastralClientDashboard.tsx` | Ajouter bouton + logique de génération de fiche cadastrale PDF |

