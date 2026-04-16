

# Audit du mode test — Résultats et corrections

## Problème principal : `is_title_in_current_owner_name` absent des parcelles test

Le champ est généré dans `generateContributions` (ligne 399) mais **pas dans `generateParcels`** (lignes 196-250). Or le bloc analytics `TitleRequestsBlock` utilise `data.parcels` (via `filtered`) pour les 3 nouveaux charts de concordance :

- `title-owner-match` (donut) — ligne 170 : `p.is_title_in_current_owner_name`
- `mutation-urgency` (bar-h) — ligne 178 : `filtered.filter(p => p.is_title_in_current_owner_name === false)`
- `mismatch-by-title-type` (bar-v) — ligne 200+

**Résultat** : en mode test, toutes les parcelles ont `is_title_in_current_owner_name = null` → les 3 charts et le KPI "Titres discordants" affichent 0 / "(Non renseigné)" à 100%.

## Autres vérifications (OK)

| Élément | Statut |
|---------|--------|
| `nationality` dans `current_owners_details` (contributions) | OK (corrigé précédemment) |
| `entityType` / `rightType` conditionnels | OK |
| `owner.since` varié (dans/hors délai 20j) | OK (ligne 341 : `idx % 7 === 0` → récent) |
| Steps de génération (14 étapes) alignés avec les fonctions | OK |
| RPC `count_test_data_stats` — toutes les tables comptées | OK |
| RPC `cleanup_all_test_data` — FK-safe order | OK |
| Rollback frontend `rollbackTestData` — ordre cohérent | OK |
| `EMPTY_STATS` / `TestDataStats` — 20 champs alignés avec la RPC | OK |
| Filtres TEST-% dans `useLandDataAnalytics` (fetchAll) | OK |
| `title_issue_date` dans parcelles test | OK (ligne 225) |
| `lease_years` dans parcelles test | OK (ligne 217) |

## Correction à apporter

### Fichier : `src/components/admin/test-mode/testDataGenerators.ts`

Dans `generateParcels` (ligne 196-250), ajouter `is_title_in_current_owner_name` avec la même logique que les contributions :

```ts
is_title_in_current_owner_name: idx % 3 !== 0,  // ~67% concordants, ~33% discordants
```

C'est la seule modification nécessaire (1 ligne ajoutée dans 1 fichier).

