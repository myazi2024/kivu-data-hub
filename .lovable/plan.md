

## Aligner le mode test avec les visuels Analytics (focus capacité d'accueil)

### Constat
Audit des nouveaux visuels ajoutés à `ParcelsWithTitleBlock.tsx` (Construction) vs données générées :

| Visuel Analytics | Champ source | Génération actuelle | Couverture |
|---|---|---|---|
| `hosting-capacity` (6 buckets : 1-2, 3-5, 6-10, 11-20, 21-50, >50 pers) | `hosting_capacity` | `randInt(2, 15)` dans `parcels.ts` L65 + `contributions.ts` L122 | ❌ Buckets `21-50` et `>50` toujours vides ; `11-20` rare |
| `occupancy-pressure` (Sous-occupé / Équilibré / Saturé) | ratio `occupant_count / hosting_capacity` | `occupant_count: randInt(1, 8)` vs `hosting_capacity: 2-15` | ❌ « Saturé » (>1) quasi impossible (occ max 8 ≤ cap min 2 ≪ 15) ; biais fort vers « Sous-occupé » |
| `kpi-avg-capacity` | moyenne `hosting_capacity` | OK mais peu réaliste (~8) | ⚠️ trop linéaire |

Les autres visuels Construction (`occupation`, `floor-dist`, `building-size`, `building-height`, `standing`, etc.) sont déjà couverts. Les autres onglets Analytics (Titres, Hypothèques, Permis, Litiges, Mutations, Lotissement, Taxes, Certificats, Géométrie, Bornage, Servitudes, Cohérence) ne sont pas impactés par les changements récents — leur générateurs respectifs alimentent déjà tous les `groupField` listés.

### Cible
Deux fichiers, modifications ciblées et déterministes (via index `idx`) — pas de migration BD, pas de changement de schéma.

1. `src/components/admin/test-mode/generators/parcels.ts` (lignes 64-65)
2. `src/components/admin/test-mode/generators/contributions.ts` (lignes 121-122)

### Changements

**1. Distribution réaliste de `hosting_capacity` couvrant tous les buckets**

Remplacer `hosting_capacity: constructionNature ? randInt(2, 15) : null` par une distribution déterministe par index pour garantir que les 6 buckets reçoivent des données :

- ~35 % : 1-2 pers (logements individuels)
- ~30 % : 3-5 pers (familles)
- ~20 % : 6-10 pers (grandes familles / petits collectifs)
- ~10 % : 11-20 pers (immeubles)
- ~4 % : 21-50 pers (résidences, écoles)
- ~1 % : 51-150 pers (institutionnel, hôtels)

Implémenté via `idx % 100` sur des plages, avec `seededInt` pour la valeur exacte dans chaque plage → reproductible.

**2. `occupant_count` cohérent avec la nouvelle capacité, couvrant les 3 niveaux de pression**

Remplacer `occupant_count: constructionNature && idx % 10 < 7 ? randInt(1, 8) : null` par un calcul corrélé à la capacité :

- ~25 % : `occupant_count = round(cap * 0.2-0.4)` → bucket « Sous-occupé »
- ~50 % : `occupant_count = round(cap * 0.6-0.95)` → bucket « Équilibré »
- ~15 % : `occupant_count = round(cap * 1.05-1.4)` → bucket « Saturé »
- ~10 % : `null` (vacant ou non renseigné)

Garantit que la donut « Pression d'occupation » a les 3 segments visibles, et que `kpi-avg-capacity` est plus représentatif.

**3. Synchronisation `parcels.ts` ↔ `contributions.ts`**

Les deux fichiers utilisent le même `idx`. Extraire un helper `computeOccupancy(idx, hasConstruction)` dans `_shared.ts` qui retourne `{ hosting_capacity, occupant_count, is_occupied }` → garantit la même valeur dans la parcelle et sa contribution (cohérence cross-table, important pour les croisements `hosting-capacity × occupation`).

### Hors scope
- Aucun changement à `ParcelsWithTitleBlock.tsx`, à la registry analytics ou à `crossVariables.ts`.
- Aucun autre onglet Analytics modifié (couverture déjà OK).
- Aucune migration BD : modifications limitées au générateur côté client.
- Pas de changement aux autres champs (`is_occupied`, `floor_number`, `additional_constructions`, etc.) — déjà bien distribués.

### Vérification post-merge
1. Admin → Mode test → « Régénérer les données test ».
2. `/test/map` → onglet Construction : les 6 buckets « Capacité d'accueil » sont visibles + 3 segments « Pression d'occupation » + KPI « Cap. moy. » > 0.
3. Croisements : `hosting-capacity × occupation` et `occupancy-pressure × standing` retournent des séries non vides.

