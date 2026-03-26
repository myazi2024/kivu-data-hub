

# Corriger les valeurs fictives de "Service émetteur" dans les données de test

## Problème

Le générateur de données de test (`testDataGenerators.ts`) insère des valeurs de service émetteur fictives (`"Service Urbanisme Kinshasa"`, `"Service Urbanisme Goma"`) qui ne correspondent pas aux options standardisées du composant `BuildingPermitIssuingServiceSelect`. Ces valeurs polluent le graphique analytics "Service émetteur" dans l'onglet Parcelles.

Le graphique analytics lui-même est légitime : il agrège la colonne `issuing_service` de la table `cadastral_building_permits`, qui est désormais correctement alimentée par les deux formulaires (CCC et dropdown). Il ne faut donc pas supprimer le graphique, mais corriger les données de test pour qu'elles utilisent les vraies valeurs du référentiel.

## Modification

### 1. Aligner les valeurs de test sur le référentiel `ISSUING_SERVICES`

Dans `src/components/admin/test-mode/testDataGenerators.ts` (ligne 721), remplacer les valeurs fictives par des valeurs existantes dans `BuildingPermitIssuingServiceSelect` :

- `"Service Urbanisme Kinshasa"` → `"Division Provinciale de l'Urbanisme et Habitat - Kinshasa"` (valeur `DPUH Kinshasa` du référentiel)
- `"Service Urbanisme Goma"` → `"Service Communal d'Urbanisme - Goma"` (valeur `SCU Goma` du référentiel)

## Fichier impacté

| Fichier | Action |
|---------|--------|
| `src/components/admin/test-mode/testDataGenerators.ts` | Corriger les 2 valeurs `issuing_service` |

1 fichier modifié.

