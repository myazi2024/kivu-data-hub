

# Restaurer le champ "Service émetteur" dans le formulaire CCC

## Contexte

Le champ "Service émetteur" a été supprimé du formulaire CCC (onglet Infos, section autorisation de bâtir/régularisation) mais existe toujours dans le formulaire standalone (`BuildingPermitFormDialog.tsx`) et dans la table DB (`building_permits.issuing_service`). Il faut le restaurer dans le CCC.

## Modifications

### 1. Ajouter `issuingService` à l'interface `BuildingPermit` (GeneralTab.tsx L37-45)

Ajouter `issuingService: string;` à l'interface.

### 2. Ajouter le champ UI dans le formulaire (GeneralTab.tsx ~L1183)

Après la grille N° autorisation / Date (ligne 1183), insérer un champ "Service émetteur" utilisant le composant `BuildingPermitIssuingServiceSelect` déjà existant.

### 3. Mettre à jour l'état initial et le CRUD (useCCCFormState.ts)

- L126-128 : ajouter `issuingService: ''` à l'état initial
- L484 : ajouter `issuingService: ''` au `addBuildingPermit`
- L1120 : ajouter `issuingService: p.issuing_service || p.issuingService || ''` au chargement DB

### 4. Inclure dans la sérialisation (useCCCFormState.ts L938)

Ajouter `issuingService: permit.issuingService` à l'objet sérialisé pour la soumission.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/ccc-tabs/GeneralTab.tsx` | Interface + champ UI |
| `src/hooks/useCCCFormState.ts` | État initial, chargement, sérialisation |

2 fichiers modifiés.

