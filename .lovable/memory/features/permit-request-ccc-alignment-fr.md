---
name: Permit Request — Alignement CCC
description: Service "Demander une autorisation" (bâtir/régularisation) aligné sur CCC — picklists cascade, multi-bâtiments, identité partagée, frais progressifs, hardening
type: feature
---

## Service "Demander une autorisation" (BuildingPermitRequestDialog)

Audit P0+P1+P2 réalisé. Alignements appliqués :

### Picklists cascade CCC (P0)
- `PermitFormStep` consomme `useCCCFormPicklists` (`getOptions` + `getDependentOptions`) et `resolveAvailableUsages` au lieu de listes en dur.
- Cascade type → nature → usage avec reset auto dans `handleInputChange` (usePermitRequestForm).
- Inclut `Terrain nu` + `Non bâti`.

### Multi-construction (P0)
- Hook `buildKnownBuildingsForPermit(parcelData)` (fichier `permitBuildings.ts`) lit `additional_constructions[]` + main.
- Composant `PermitBuildingTargetSelector` (calqué sur `TaxBuildingTargetSelector`).
- `formData.constructionRef` ('main' | 'extra-N' | 'new') écrit dans `permit_request_data`.
- **Garde "main only"** dans `BuildingPermitRequestDialog.savePermitRequest` : les colonnes racine (`construction_type`, `construction_nature`, `declared_usage`, `area_sqm`, `construction_year`, `previous_permit_number`) ne sont écrites que si `isMain`.

### Identité partagée (P1)
- Pré-remplissage `applicantName` depuis `parcelData.current_owner_name` ou `taxpayer_identity.full_name`, puis `auth.user`.
- Champ NIF ajouté (validation `isValidNif`, pré-rempli depuis `taxpayer_identity.nif`).

### Détection doublon affinée (P1)
- `checkDuplicateRequest` filtre par `requestType + constructionRef` (lecture de `permit_request_data`).
- Statut `approved` n'est plus bloquant (permet régularisation après bâtir approuvé).

### Surface vs parcelle (P1)
- `surfaceWarning` dans le hook : warn si >80% emprise, **erreur bloquante** si > area_sqm.
- `plannedArea` read-only en régularisation quand un bâtiment existant est sélectionné.

### Frais progressifs (P2)
- `permit_fees_config` étendu : `min_area_sqm`, `max_area_sqm`, `applicable_usages[]`, `applicable_natures[]`, `amount_per_sqm_usd`, `cap_amount_usd`.
- `permitFeeCompute.ts` (`selectApplicableFees` + `computeFeeBreakdown`) gère filtres + base + per-m² + plafond.
- Picklists `picklist_utility_water` / `picklist_utility_power` insérées (fallback hardcodé conservé).

### Hardening (P0 mineur)
- `crypto.randomUUID()` dans `BuildingPermitRequestDialog.uploadAttachments` ET `BuildingPermitFormDialog` ligne 183.
- Brouillon localStorage **PII-safe** : `DRAFT_SAFE_FIELDS` exclut `applicantName/Phone/Email/Address/nif`.

### Fichiers
- `src/components/cadastral/building-permit-request/types.ts` — `constructionRef`, `nif`, `DRAFT_SAFE_FIELDS`, `isValidNif`, FeeItem étendu
- `src/components/cadastral/building-permit-request/permitBuildings.ts` — **nouveau**
- `src/components/cadastral/building-permit-request/PermitBuildingTargetSelector.tsx` — **nouveau**
- `src/components/cadastral/building-permit-request/permitFeeCompute.ts` — **nouveau**
- `src/components/cadastral/building-permit-request/usePermitRequestForm.ts` — refonte complète
- `src/components/cadastral/building-permit-request/PermitFormStep.tsx` — picklists cascade + sélecteur + alertes surface + NIF
- `src/components/cadastral/BuildingPermitRequestDialog.tsx` — guard isMain, crypto.randomUUID, dédup affinée
- `src/components/cadastral/BuildingPermitFormDialog.tsx` — crypto.randomUUID
