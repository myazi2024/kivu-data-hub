

# Audit du mode test — Redondances, désalignements et erreurs de logique

## Problèmes identifiés

### Bug 1 — Genre dans `generateTitleRequests` : `'M'`/`'F'` au lieu de `'Masculin'`/`'Féminin'`
**Fichier** : `testDataGenerators.ts` lignes 504-505
**Problème** : Le formulaire `LandTitleRequestDialog.tsx` utilise les valeurs `'Masculin'` et `'Féminin'` (SelectItem). Le test génère `'M'`/`'F'`, ce qui rend les graphiques "Genre" dans `TitleRequestsBlock` incohérents avec les vraies données collectées.
**Correction** : Remplacer `'M'`/`'F'` par `'Masculin'`/`'Féminin'`.

### Bug 2 — `property_condition` expertise : valeurs désalignées
**Fichier** : `testDataGenerators.ts` ligne 555
**Problème** : Le générateur utilise `['bon', 'moyen', 'mauvais', 'neuf']`. Les constantes officielles dans `expertiseLabels.ts` sont `'neuf'`, `'bon'`, `'moyen'`, `'mauvais'`, `'a_renover'`. La valeur `'a_renover'` n'est jamais générée → le graphique "État du bien" ne montre jamais "À rénover".
**Correction** : Ajouter `'a_renover'` au cycle.

### Bug 3 — `wall_material` expertise : labels humains au lieu de clés techniques
**Fichier** : `testDataGenerators.ts` ligne 556
**Problème** : Le générateur utilise `['Briques cuites', 'Parpaings', 'Bois', 'Tôles', 'Briques adobe', 'Pierre']`. Les clés réelles du formulaire sont `'beton'`, `'briques_cuites'`, `'briques_adobe'`, `'parpaings'`, `'bois'`, `'tole'`, `'mixte'` (cf. `WALL_LABELS`). La visualisation utilise ces clés pour les labels. Les données test ne matcheront jamais.
**Correction** : Utiliser les clés : `['beton', 'briques_cuites', 'briques_adobe', 'parpaings', 'bois', 'tole', 'mixte']`.

### Bug 4 — `roof_material` expertise : même problème que wall
**Fichier** : `testDataGenerators.ts` ligne 557
**Problème** : Utilise `['Tôles galvanisées', 'Tuiles', 'Dalle béton', 'Chaume']`. Les clés réelles sont `'tole_bac'`, `'tuiles'`, `'dalle_beton'`, `'ardoise'`, `'chaume'`, `'autre'`.
**Correction** : Utiliser les clés techniques.

### Bug 5 — `sound_environment` expertise : valeurs partielles
**Fichier** : `testDataGenerators.ts` ligne 558
**Problème** : Utilise `['calme', 'modéré', 'bruyant']`. Les clés réelles sont `'tres_calme'`, `'calme'`, `'modere'` (sans accent), `'bruyant'`, `'tres_bruyant'`. `'modéré'` (avec accent) ne matchera pas `'modere'`.
**Correction** : Utiliser `['tres_calme', 'calme', 'modere', 'bruyant', 'tres_bruyant']`.

### Bug 6 — `building_position` expertise : valeurs inventées
**Fichier** : `testDataGenerators.ts` ligne 559
**Problème** : Utilise `['isolé', 'en_bande', 'angle', 'mitoyen']`. Les clés réelles sont `'premiere_position'`, `'deuxieme_position'`, `'fond_parcelle'`, `'dans_servitude'`, `'coin_parcelle'` (cf. `BUILDING_POSITION_LABELS`). Aucune correspondance.
**Correction** : Utiliser les clés de `BUILDING_POSITION_LABELS`.

### Bug 7 — `floor_material` expertise : labels humains
**Fichier** : `testDataGenerators.ts` ligne 586
**Problème** : Utilise `['Carrelage', 'Ciment lissé', 'Parquet', 'Terre battue']`. Les clés réelles sont `'carrelage'`, `'ciment_lisse'`, `'parquet'`, `'marbre'`, `'terre_battue'`, `'autre'`.
**Correction** : Utiliser les clés techniques.

### Bug 8 — `construction_quality` expertise : labels non-alignés
**Fichier** : `testDataGenerators.ts` ligne 614
**Problème** : Utilise `['standard', 'luxe', 'economique']`. Les clés de `QUALITY_LABELS` sont `'luxe'`, `'standard'`, `'economique'` — ici c'est correct mais manque de variété (seulement 3 valeurs, pas de `'autre'`). Mineur.

### Bug 9 — `dispute_type` : valeur `'mediation'` n'existe pas dans les formulaires
**Fichier** : `testDataGenerators.ts` ligne 676
**Problème** : Le générateur utilise `['report', 'lifting', 'mediation']`. Les formulaires ne produisent que `'report'` (LandDisputeReportForm) et `'lifting'` (LandDisputeLiftingForm). La valeur `'mediation'` n'existe pas dans l'application — c'est une donnée fictive inventée qui ne correspond à aucun outil de collecte.
**Correction** : Supprimer `'mediation'`, utiliser seulement `['report', 'lifting']`.

### Bug 10 — `is_title_in_current_owner_name` absent des contributions
**Fichier** : `testDataGenerators.ts` lignes 220-327
**Problème** : Le plan précédent prévoyait d'ajouter ce champ mais il n'a pas été implémenté. Le formulaire CCC (`UserContributions.tsx`) le lit/écrit, et `MutationRequestDialog.tsx` le vérifie pour afficher un avertissement.
**Correction** : Ajouter `is_title_in_current_owner_name: idx % 3 !== 0` aux contributions.

### Redondance 11 — Données dupliquées entre `cadastral_parcels` et `cadastral_contributions`
**Fichier** : `testDataGenerators.ts`
**Problème** : Les deux générateurs (`generateParcels` et `generateContributions`) produisent les mêmes champs (parcel_sides, construction_materials, standing, title_reference_number, etc.) avec des valeurs potentiellement **différentes** pour le même `parcel_number` car `randInt()` est appelé séparément. Cela crée des incohérences : une parcelle peut avoir `area_sqm: 3500` dans `cadastral_parcels` et `area_sqm: 1200` dans `cadastral_contributions`.
**Correction** : Utiliser un seeded random ou extraire les valeurs communes dans un objet partagé entre les deux fonctions. Alternativement, fixer un seed basé sur `idx` pour les champs partagés.

### Bug 12 — `lease_type` dans parcelles utilise `'initial'`/`'renewal'` sans vérification
**Fichier** : `testDataGenerators.ts` ligne 183
**Problème mineur** : Valeurs non vérifiées contre le schéma DB. Si le schéma attend d'autres valeurs, l'insertion échouera silencieusement. À vérifier.

## Résumé des corrections

| # | Fichier | Correction |
|---|---------|------------|
| 1 | `testDataGenerators.ts` | Genre title requests: `'M'`→`'Masculin'`, `'F'`→`'Féminin'` |
| 2 | `testDataGenerators.ts` | Ajouter `'a_renover'` à property_condition |
| 3-4 | `testDataGenerators.ts` | wall_material et roof_material: utiliser clés techniques |
| 5 | `testDataGenerators.ts` | sound_environment: corriger `'modéré'`→`'modere'`, ajouter valeurs manquantes |
| 6 | `testDataGenerators.ts` | building_position: remplacer par clés de BUILDING_POSITION_LABELS |
| 7 | `testDataGenerators.ts` | floor_material: utiliser clés techniques |
| 9 | `testDataGenerators.ts` | dispute_type: supprimer `'mediation'` |
| 10 | `testDataGenerators.ts` | Ajouter `is_title_in_current_owner_name` aux contributions |
| 11 | `testDataGenerators.ts` | Synchroniser les valeurs communes entre parcelles et contributions |

