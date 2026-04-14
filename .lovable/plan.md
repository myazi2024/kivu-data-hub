

# Ajout du visuel "Sources de bruit" dans l'onglet Parcelles

## Constat

Le bloc "Environnement sonore" du formulaire CCC collecte **deux donnees** :
1. `sound_environment` — niveau sonore global (deja visualise en donut)
2. `nearby_noise_sources` — liste des sources de bruit (ex: "Route principale, Marche")

Seul le niveau sonore est represente dans Analytics. Les **sources de bruit** (`nearby_noise_sources`) n'ont aucun visuel, alors qu'elles sont collectees et stockees en base.

## Modifications

### 1. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- Importer `Ear` (ou `Radio`) depuis lucide-react
- Ajouter un `useMemo` `noiseSourcesData` qui :
  - Split chaque `c.nearby_noise_sources` par `, `
  - Compte les occurrences de chaque source individuelle
  - Retourne un tableau `[{ name, value }]` trie par valeur decroissante
- Inserer une entree `{ key: 'noise-sources', ... }` dans `chartDefs` juste apres `sound-env`, avec type `bar-v` (barres horizontales pour lister les sources), icon `Ear`, colorIndex 11

### 2. `src/config/crossVariables.ts`
- Ajouter dans le bloc `'parcels-titled'` :
  ```
  'noise-sources': [{ label: 'Province', field: 'province' }, { label: 'Env. sonore', field: 'sound_environment' }],
  ```

### Fichiers impactes
- `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- `src/config/crossVariables.ts`

