

# Audit des variables croisees — Analyse complete et ameliorations

## Synthese

Sur **143 charts** (hors `_global` et `rdc-map`), **67 ont des cross-variables** et **76 n'en ont pas**. En excluant les charts `geo`, `evolution`, et les matrices croisees (qui ne supportent pas de picklist), il reste **27 charts exploitables sans aucune variable croisee**.

## Etat actuel par onglet

| Onglet | Charts total | Avec cx | Sans cx (hors geo/evol) | Lacune |
|--------|-------------|---------|------------------------|--------|
| title-requests | 19 | 7 | **11** | Critique |
| parcels-titled | 17 | 15 | 0 | OK |
| contributions | 15 | 13 | 0 | OK |
| expertise | 19 | 15 | **2** | Mineur |
| mutations | 11 | 7 | **1** | Mineur |
| subdivision | 9 | 6 | **1** | Mineur |
| disputes | 17 | 10 | **0** | OK |
| mortgages | 6 | 4 | 0 | OK |
| building-permits | 7 | 5 | 0 | OK |
| taxes | 5 | 3 | 0 | OK |
| ownership | 4 | 2 | 0 | OK |
| certificates | 5 | 2 | **1** | Mineur |
| invoices | 6 | 3 | **1** | Mineur |

## Charts sans cross-variables et variables proposees

### title-requests (11 charts manquants — priorite haute)

| Chart | Titre | Variables croisees proposees |
|-------|-------|-----------------------------|
| `gender` | Genre (pers. physique) | Province, Type titre, Usage |
| `nationality` | Nationalite | Province, Type titre, Statut juridique |
| `entity-type` | Type d'entite (pers. morale) | Province, Type titre |
| `right-type` | Droit de l'Etat | Province, Type titre |
| `mutation-type` | Type de mutation | Province, Type titre, Statut juridique |
| `hist-legal-status` | Statut juridique (anciens) | Province, Type titre |
| `hist-duration` | Duree detention (anciens) | Province, Type titre |
| `transfers-per-parcel` | Transferts par parcelle | Province, Type titre, Usage |
| `title-owner-match` | Concordance titre/proprio | Province, Type titre, Statut juridique |
| `mutation-urgency` | Urgence de mutation | Province, Type titre |
| `mismatch-by-title-type` | Discordants par type titre | Province, Statut juridique |

### expertise (2 charts manquants)

| Chart | Variables proposees |
|-------|---------------------|
| `equipment` | Province, Qualite construction, Condition |
| `proximity` | Province, Qualite construction |

### mutations (1)

| Chart | Variables proposees |
|-------|---------------------|
| `revenue-trend` | Type mutation, Province |

### subdivision (1)

| Chart | Variables proposees |
|-------|---------------------|
| `revenue-trend` | Objet, Province |

### certificates (1)

| Chart | Variables proposees |
|-------|---------------------|
| `type-trend` | Province, Type certificat |

### invoices (1)

| Chart | Variables proposees |
|-------|---------------------|
| `revenue-trend` | Moyen paiement, Province, Zone geo |

## Pertinence des variables existantes — Ameliorations

Certaines variables croisees existantes sont trop generiques (ex: `Province` partout sans variables metier). Ajustements :

| Tab | Chart | Variable a ajouter | Justification analytique |
|-----|-------|--------------------|--------------------------|
| `mortgages` | `amount-brackets` | Statut (`mortgage_status`) | Comparer montants actifs vs soldes |
| `mortgages` | `duration` | Statut (`mortgage_status`) | Durees des hypotheques actives vs soldees |
| `building-permits` | `validity-period` | Type permis (`permit_type`) | Duree validite par type d'autorisation |
| `building-permits` | `current-status` | Type permis (`permit_type`) | Taux expiration par type |
| `taxes` | `amount-range` | Exercice (`tax_year`) | Evolution des tranches par annee |
| `taxes` | `fiscal-year` | Statut (`payment_status`) deja present — ajouter Zone (`geographical_zone`) | Comparaison geographique |
| `disputes` | `lifting-status` | Type litige (`dispute_type`) | Taux levee par type |
| `disputes` | `lifting-reason` | Type litige (`dispute_type`) | Motifs de levee par type de conflit |

## Plan d'implementation

### Fichier modifie : `src/config/crossVariables.ts`

Ajouter les 17 nouveaux charts au `CROSS_VARIABLE_REGISTRY` et enrichir 8 entrees existantes. Aucun autre fichier ne necessite de modification — les blocs de visualisation utilisent deja `cx(chartKey)` via `useBlockFilter`, et les charts qui n'avaient pas de `crossVariables` prop les recevront automatiquement car le composant `ChartCard` accepte deja ce prop de facon optionnelle (s'il est vide, pas de picklist affiche).

**Note** : Les charts `geo`, `evolution`, `revenue-trend` (area), `type-status`/`nature-resolution` (matrices) et `type-trend` sont des visuels speciaux. Pour `revenue-trend` et `type-trend`, les cross-variables fonctionnent si le composant sous-jacent supporte le stacking — a verifier pour chaque bloc.

### Volume : ~50 lignes ajoutees/modifiees dans 1 fichier.

