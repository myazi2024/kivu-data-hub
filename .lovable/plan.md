

# Correction du nom "Nyirangongo" → "Nyiragongo" dans le GeoJSON

## Constat

Le fichier `public/drc-territoires.geojson` contient une seule occurrence de `"Nyirangongo"` (dans la propriété `name` d'une feature). Le nom correct est `"Nyiragongo"`.

## Correction

**Fichier** : `public/drc-territoires.geojson`
- Remplacer `"name": "Nyirangongo"` par `"name": "Nyiragongo"`

Il faut également vérifier `src/utils/geographicData.ts` et `src/components/DRCTerritoiresMap.tsx` pour s'assurer que le nom "Nyiragongo" est cohérent partout (filtres, matching, labels).

**Impact** : 1 caractère supprimé dans 1 fichier, vérification de cohérence dans 2 autres.

