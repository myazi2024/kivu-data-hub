

# Audit : Redondances entre les services Actions et le formulaire CCC

## Constat

Le formulaire CCC collecte des indicateurs de base (type/nature/usage de construction, matériaux, standing, année de construction, étages, propriétaire, hypothèques, litiges, taxes, permis). Certains services du dropdown Actions re-collectent ces mêmes données au lieu de les pré-remplir depuis `parcelData`.

```text
┌──────────────────────┬──────────────────────────────────┬──────────────────────┐
│ Service              │ Données re-collectées            │ Déjà dans le CCC ?   │
├──────────────────────┼──────────────────────────────────┼──────────────────────┤
│ Expertise immob.     │ Type construction (villa, appt)  │ OUI (property_cat.)  │
│                      │ Année construction               │ OUI                  │
│                      │ Nombre d'étages                  │ OUI (floor_number)   │
│                      │ Surface bâtie                    │ OUI (area_sqm)       │
│                      │ Matériaux murs                   │ OUI (constr. mater.) │
│                      │ Matériaux toiture                │ OUI (non collecté)   │
│                      │ Nb pièces/chambres/SDB           │ NON — spécifique     │
├──────────────────────┼──────────────────────────────────┼──────────────────────┤
│ Obtenir autorisation │ Type construction                │ OUI                  │
│ (PermitFormStep)     │ Nature construction              │ OUI                  │
│                      │ Usage déclaré                    │ OUI                  │
│                      │ Nb étages, nb pièces             │ PARTIEL              │
│                      │ Toiture, eau, électricité        │ NON — spécifique     │
│                      │ Identité demandeur               │ OUI (owner identity) │
├──────────────────────┼──────────────────────────────────┼──────────────────────┤
│ Demander Mutation    │ Date acquisition, âge titre      │ OUI — déjà pré-rempl │
├──────────────────────┼──────────────────────────────────┼──────────────────────┤
│ Gestion Hypothèque   │ Montant, créancier, durée        │ NON — nouvelle hyp.  │
│ Ajouter autorisation │ N° permis, date, service         │ NON — nouveau permis │
│ Taxe foncière        │ Usage, zone, superficie          │ Déjà pré-rempli ✓    │
│ Litige foncier       │ Identité (mode standalone)       │ Masqué en embedded ✓ │
│ Lotissement          │ GPS parcelle                     │ Déjà pré-rempli ✓    │
└──────────────────────┴──────────────────────────────────┴──────────────────────┘
```

**Services sans redondance** : Mutation (pré-remplit déjà), Hypothèque (nouvelles données), Ajouter autorisation (nouveau permis), Taxe foncière (pré-remplit via parcelData), Litige (masque en embedded), Lotissement (utilise GPS).

**Services avec redondance** : Expertise immobilière et Obtenir une autorisation (PermitFormStep).

## Plan de correction

### 1. Expertise immobilière — Pré-remplir depuis `parcelData`

Le dialog reçoit déjà `parcelData` mais ne l'utilise que pour afficher la province. Pré-remplir automatiquement :

- `constructionType` : mapper `parcelData.property_category` vers les clés expertise (`Villa` → `villa`, `Appartement` → `appartement`, `Local commercial` → `commercial`, `Terrain nu` → `terrain_nu`, etc.)
- `constructionYear` : depuis `parcelData.construction_year`
- `numberOfFloors` : depuis `parcelData.floor_number`
- `totalBuiltAreaSqm` : depuis `parcelData.area_sqm`
- `wallMaterial` : mapper `parcelData.construction_materials` vers les clés expertise (`Parpaings` → `parpaings`, `Briques cuites` → `briques_cuites`, etc.)

Afficher un indicateur "Pré-rempli depuis le CCC" en lecture seule, mais laisser l'utilisateur modifier (car l'expert a besoin de données actualisées).

### 2. PermitFormStep — Pré-remplir depuis les données parcelle

Le composant `BuildingPermitRequestDialog` reçoit `parcelNumber` mais pas `parcelData`. Corriger :

- Passer `parcelData` depuis `ParcelActionsDropdown` → `BuildingPermitRequestDialog` → `PermitFormStep`
- Pré-remplir `constructionType` depuis `parcelData.construction_type`
- Pré-remplir `constructionNature` depuis `parcelData.construction_nature`
- Pré-remplir `declaredUsage` depuis `parcelData.declared_usage`
- Pré-remplir `applicantName` depuis le profil utilisateur connecté (comme le fait déjà le litige foncier)
- Pré-remplir `applicantPhone` et `applicantEmail` depuis le profil

### 3. Indicateur visuel de pré-remplissage

Ajouter un petit badge/alerte au début des formulaires concernés :
> "Certaines informations ont été pré-remplies depuis les données cadastrales de cette parcelle. Vous pouvez les modifier si nécessaire."

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` | Pré-remplir 5 champs depuis `parcelData` |
| `src/components/cadastral/building-permit-request/PermitFormStep.tsx` | Pré-remplir type/nature/usage/identité |
| `src/components/cadastral/BuildingPermitRequestDialog.tsx` | Passer `parcelData` au composant |
| `src/components/cadastral/ParcelActionsDropdown.tsx` | Passer `parcelData` à `BuildingPermitRequestDialog` |

4 fichiers, modifications ciblées de pré-remplissage.

