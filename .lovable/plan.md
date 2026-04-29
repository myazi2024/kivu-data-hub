## Contexte & diagnostic

Dans la base, une parcelle (`cadastral_parcels`) connaît déjà ses constructions :

- **Construction principale** : champs scalaires `construction_type`, `construction_nature`, `construction_materials`, `construction_year`, `floor_number`, `area_sqm`, `property_category`, `declared_usage`.
- **Constructions additionnelles** : tableau JSONB `additional_constructions` au format `[{ type, usage, surface_sqm }, ...]` (saisi via le CCC / module cadastral).
- **Autorisations de bâtir** liées : table `cadastral_building_permits` (jointe par `parcel_id`).

Le formulaire d'expertise (`RealEstateExpertiseRequestDialog.tsx`) pré-remplit aujourd'hui uniquement la construction principale (lignes 283–309), traite la parcelle comme si elle n'avait **qu'un seul bâtiment**, et n'expose jamais `additional_constructions` ni les permis existants. Résultat : si la parcelle a déjà été cadastrée (CCC), l'utilisateur doit ressaisir / reconfirmer manuellement des données que le système possède déjà, et il n'a aucun moyen propre de désigner « j'expertise la dépendance » plutôt que la maison principale.

## Approche recommandée — Sélecteur de construction + pré-remplissage par bâtiment

Plutôt qu'un simple pré-remplissage scalaire, on transforme le bloc Construction en un **sélecteur multi-bâtiments** alimenté par les données existantes de la parcelle, avec verrouillage des champs déjà connus.

### 1. Construire la liste des bâtiments connus

Au montage du dialogue, agréger depuis `parcelData` :

```text
buildings = [
  { id: 'main', label: 'Construction principale',
    source: 'CCC',
    type, nature, materials, year, usage,
    surface_sqm: area_sqm, floors: floor_number,
    locked: true (champs renseignés) },
  ...additional_constructions.map((c, i) => ({
    id: `extra-${i}`, label: `${c.type} (${c.surface_sqm} m²)`,
    source: 'CCC',
    type: c.type, usage: c.usage, surface_sqm: c.surface_sqm,
    locked: true })),
]
```

Si aucune construction n'est connue (parcelle non cadastrée ou non bâtie), on garde le formulaire en mode saisie libre comme aujourd'hui.

### 2. UI : choix du bâtiment à expertiser en haut du bloc Construction

```text
┌─────────────────────────────────────────────────────────┐
│ Construction concernée par l'expertise                  │
│ ○ Construction principale — Résidentielle, 2000, 180 m² │
│ ● Dépendance — Habitation, 21 m²                        │
│ ○ Garage — Stockage, 62 m²                              │
│ ○ Autre / nouvelle construction non listée              │
└─────────────────────────────────────────────────────────┘
[Badge: « Données issues du cadastre — vérifiées »]
```

- Radio group si ≤ 4 entrées, sinon `Select`.
- L'option **« Autre / nouvelle construction »** débloque la saisie manuelle complète (cas d'une construction non encore déclarée au cadastre — l'expertise sert alors aussi à mettre à jour la fiche).

### 3. Comportement du bloc Construction selon la sélection

Quand l'utilisateur choisit un bâtiment connu :

- Les champs déjà fournis par le cadastre (type, matériaux, nature, année, surface, usage) sont **pré-remplis et passés en lecture seule**, avec un badge discret « Issu du cadastre ».
- Un petit lien **« Corriger »** ouvre les champs en édition (cas où l'expert constate une divergence). La modification est tracée dans `additional_notes` ou un champ dédié `cadastre_discrepancies` pour signalement à l'admin.
- Les champs **non couverts par le CCC** (état du bien, qualité de construction, équipements détaillés, distances, risques, etc.) restent saisissables comme aujourd'hui — c'est le vrai apport de l'expertise.

Quand l'utilisateur choisit **« Autre »** : tous les champs redeviennent éditables, le pré-remplissage est nettoyé.

### 4. Persistance de la sélection

- Ajouter `target_building_ref` (texte : `main` | `extra-0` | `new`) et `target_building_label` au payload `CreateExpertiseRequestData`, pour que l'admin/expert sache exactement quel bâtiment a été expertisé.
- Si « Autre », après validation par l'expert, possibilité plus tard d'ajouter cette nouvelle construction à `additional_constructions` (hors scope ici, mais le champ rend l'évolution naturelle).

### 5. Permis de bâtir — réutilisation similaire

Le bloc « A-t-il un permis de bâtir ? » est aujourd'hui re-saisi à zéro. On pré-charge les permis existants depuis `cadastral_building_permits` :

```text
Permis de bâtir existants pour cette parcelle :
[✓] PB-2018-00421 — Délivré le 12/03/2018 — Service Urbanisme Gombe
[ ] Ajouter un nouveau permis
```

Sélection cochée → champs permis pré-remplis et verrouillés. Coche « Ajouter un nouveau » → formulaire vide comme aujourd'hui.

## Bénéfices

- **Zéro double saisie** quand la parcelle est déjà cadastrée.
- **Cohérence des données** : pas de divergence accidentelle entre fiche cadastrale et expertise.
- **Support natif des parcelles multi-bâtiments** (cas réel à Kinshasa : parcelle = villa + dépendance + commerce sur rue).
- **Traçabilité** : l'expertise indique précisément quel bâtiment elle couvre, utile pour le certificat et les valorisations futures.
- **Respect du modèle existant** : on ne crée aucune nouvelle table, on exploite `additional_constructions` (JSONB déjà en place) et `cadastral_building_permits`.

## Détails techniques

Fichiers à modifier :

- `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx`
  - Nouveau bloc `BuildingTargetSelector` en tête de l'onglet Général.
  - `useEffect` de pré-remplissage (lignes 283-309) refondu : il agrège `main` + `additional_constructions` et applique la sélection.
  - États ajoutés : `selectedBuildingRef`, `lockedFields: Set<string>`, `cadastreOverrides: Record<string,string>`.
  - Champs Construction passent en `readOnly` quand `lockedFields.has(field)` et qu'on n'est pas en mode « Corriger ».
  - Bloc permis : nouveau sous-composant qui charge `cadastral_building_permits` via le hook existant `useParcelHistory` (déjà utilisé dans la carte cadastrale, voir `useCadastralMapData.tsx`).

- `src/types/expertise.ts`
  - Ajouter dans `ExpertiseRequest` et `CreateExpertiseRequestData` :
    - `target_building_ref?: string` (`main` | `extra-<index>` | `new`)
    - `target_building_label?: string`
    - `cadastre_discrepancies?: string` (libre, optionnel)

- Migration SQL (légère) : ajouter ces 3 colonnes texte nullable à `real_estate_expertise_requests` et à la vue admin si besoin. Pas de RLS à changer.

- Mémoire à mettre à jour : `mem/features/expertise-request/specifications-completes-fr.md` pour documenter la règle « ne jamais redemander une donnée présente dans `cadastral_parcels` ou `additional_constructions` ».

## Hors scope (suggestions futures, à ne pas implémenter ici)

- Permettre à l'expert, après validation, de pousser la « nouvelle construction » dans `additional_constructions` automatiquement.
- Étendre la même logique au formulaire de mutation et au permis de construire.
