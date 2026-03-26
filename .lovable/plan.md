

# Aligner le formulaire "Ajouter une autorisation" (dropdown) sur le formulaire CCC et nettoyer les affichages

## Problème

Le formulaire "Ajouter une autorisation" (dropdown actions, `BuildingPermitFormDialog.tsx`) contient un champ **"Contact service"** (`issuingServiceContact`) qui n'existe pas dans le formulaire CCC. Ce champ crée une divergence entre les deux formulaires qui collectent les mêmes données.

De plus, l'affichage dans l'onglet Parcelle (`CadastralResultCard.tsx`) montre `issuing_service_contact` qui n'est plus collecté par le CCC — il faut le retirer pour aligner l'affichage aux données réellement collectées.

## Modifications

### 1. Supprimer `issuingServiceContact` du formulaire dropdown

Dans `BuildingPermitFormDialog.tsx` :
- Retirer le champ "Contact service" du formulaire UI (lignes 330-338)
- Retirer `issuingServiceContact` de l'interface `PermitRecord` et de l'état initial
- Retirer de la sérialisation lors du submit (ne plus envoyer `issuingServiceContact` dans le JSON)
- Retirer de `hasUnsavedChanges()` et `resetAndClose()`
- Retirer de la preview (récapitulatif)

### 2. Retirer l'affichage "Contact" dans l'onglet Parcelle

Dans `CadastralResultCard.tsx` :
- Retirer les blocs affichant `issuing_service_contact` (lignes ~706-716 pour les autorisations courantes, ~777-788 pour l'historique)

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/BuildingPermitFormDialog.tsx` | Supprimer champ + état + sérialisation |
| `src/components/cadastral/CadastralResultCard.tsx` | Retirer affichage contact service |

2 fichiers modifiés.

