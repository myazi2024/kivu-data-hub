

# Audit : Alignement des indicateurs CCC dans toute l'application

## Constat

Le formulaire CCC définit ses indicateurs via des **picklists dynamiques** (`useCCCFormPicklists`), mais plusieurs modules de l'application utilisent des **valeurs hardcodées différentes**, créant des incohérences dans les données collectées et les calculs.

### Divergences identifiées

```text
┌─────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Indicateur          │ CCC (source de vérité)       │ Valeurs divergentes          │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Nature construction │ Durable, Semi-durable,       │ PermitFormStep: "En dur",    │
│                     │ Précaire, Non bâti           │ "Semi-dur", "Précaire"       │
│                     │                              │ taxSharedUtils: "En dur",    │
│                     │                              │ "Semi-dur", "En paille"      │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Matériaux           │ Béton armé, Briques cuites,  │ LandTitleRequest: liste      │
│                     │ Parpaings... (par nature)     │ plate sans dépendance nature │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Type construction   │ Résidentielle, Commerciale,  │ PermitFormStep: ajoute       │
│ (permit)            │ Industrielle, Agricole,      │ "Mixte" (absent du CCC)      │
│                     │ Terrain nu                   │                              │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Usage déclaré       │ Dépend de type+nature        │ PermitFormStep: liste fixe   │
│ (permit)            │ (9+ valeurs)                 │ de 5 valeurs seulement       │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ detectUsageType()   │ CCC: "Habitation",           │ taxSharedUtils compare       │
│                     │ "Commerce", "Industrie"...   │ "Commercial", "Industriel",  │
│                     │                              │ "Agricole" (anciennes val.)  │
├─────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ detectConstruction  │ CCC: "Durable", "Semi-       │ taxSharedUtils compare       │
│ Type()              │ durable", "Précaire"         │ "En dur", "Semi-dur",        │
│                     │                              │ "En paille" (jamais match)   │
└─────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

## Plan de correction

### 1. Corriger `taxSharedUtils.ts` — Aligner sur les indicateurs CCC

- `detectUsageType()` : mapper les valeurs réelles du CCC ("Habitation" → residential, "Commerce" → commercial, "Industrie" → industrial, "Agriculture" → agricultural, "Usage mixte" → mixed, etc.)
- `detectConstructionType()` : mapper les natures CCC ("Durable" → en_dur, "Semi-durable" → semi_dur, "Précaire" → en_paille, "Non bâti" → null) au lieu de "En dur"/"Semi-dur"/"En paille"

### 2. Aligner `PermitFormStep.tsx` — Demande d'autorisation de bâtir

- **Type de construction** : remplacer les valeurs hardcodées par les mêmes que le CCC (supprimer "Mixte" ou l'ajouter au registre CCC si légitime)
- **Nature** : remplacer "En dur"/"Semi-dur"/"Précaire" par "Durable"/"Semi-durable"/"Précaire" (valeurs CCC)
- **Usage déclaré** : utiliser les picklists dynamiques du CCC au lieu de la liste fixe de 5 valeurs

### 3. Aligner `LandTitleRequestDialog.tsx` — Demande de titre foncier

- **Matériaux** : remplacer la liste plate hardcodée par les matériaux dépendants de la nature (comme le CCC)
- **Type/Nature/Usage** : s'assurer que `availableConstructionNatures` et `availableDeclaredUsages` utilisent les mêmes cascades que le CCC

### 4. Ajouter des normaliseurs manquants

- Créer ou enrichir `constructionNatureNormalizer.ts` pour mapper les anciennes valeurs ("En dur" → "Durable", "Semi-dur" → "Semi-durable", "En paille" → "Précaire") dans les analytics et rapports existants

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/tax-calculator/taxSharedUtils.ts` | Corriger les mappings usage et construction |
| `src/components/cadastral/building-permit-request/PermitFormStep.tsx` | Aligner type, nature, usage sur CCC |
| `src/components/cadastral/LandTitleRequestDialog.tsx` | Aligner matériaux et cascades |
| `src/utils/constructionTypeNormalizer.ts` | Enrichir avec les anciennes valeurs nature |

