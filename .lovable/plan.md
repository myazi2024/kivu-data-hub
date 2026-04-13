

# Audit Mode Test — Echec de generation

## Cause racine

L'erreur `"Parcelles (batch 6000): TypeError: Failed to fetch"` est un echec reseau (pas une erreur DB). Voici pourquoi :

- **7 020 parcelles** sont generees, decoupees en batches de 200 = **35 requetes POST sequentielles**
- Chaque enregistrement de parcelle contient ~30 champs dont 4 tableaux JSONB (`gps_coordinates`, `parcel_sides`, `road_sides`, `servitude_data`) = **payload tres lourd** (~1-2 KB par enregistrement, ~200-400 KB par batch)
- Apres ~30 requetes lourdes en rafale, le navigateur ou Supabase coupe la connexion (timeout/rate limit)
- Le meme probleme se reproduit pour les contributions (7 020 records)

## Corrections prevues

### 1. Reduire la taille des batches pour les tables lourdes

**Fichier : `testDataGenerators.ts`**

- `generateParcels` : passer de batches de 200 a **50** (parcelles avec JSONB lourd)
- `generateContributions` : idem, batches de **50**
- Les autres tables (invoices, payments, etc.) peuvent rester a 200 car les records sont plus legers

### 2. Ajouter un delai entre les batches

Inserer un `await new Promise(r => setTimeout(r, 50))` entre chaque batch pour eviter le rate limiting. Appliquer sur `generateParcels` et `generateContributions`.

### 3. Ajouter une logique de retry

Pour chaque batch echoue avec `TypeError: Failed to fetch`, retenter 2 fois avec un delai exponentiel (500ms, 1s) avant de throw. Cela couvre les echecs reseau transitoires.

### 4. Reduire le volume total (optionnel mais recommande)

Reduire `BASE_PARCELS` de 20 a 10, passant le total de 7 020 a **3 510 parcelles**. C'est largement suffisant pour tester les analytics sur 26 provinces avec densite variable.

## Fichiers modifies

- `src/components/admin/test-mode/testDataGenerators.ts` — batch size, delai, retry, volume

## Section technique

Changements localises dans les boucles d'insertion de `generateParcels` et `generateContributions`. Aucun changement de schema, aucune migration.

