

# Audit d'alignement : Config graphiques Admin ↔ Menu Données foncières

## Contexte

Le menu **Données foncières** affiche des graphiques/KPIs définis dans les blocs de visualisation (`ParcelsWithTitleBlock.tsx`, `ContributionsBlock.tsx`). L'admin configure ces éléments via `AdminAnalyticsChartsConfig.tsx`, qui lit ses defaults depuis `ANALYTICS_TABS_REGISTRY` dans `analyticsTabsRegistry.ts`. Les croisements sont configurés via `CROSS_VARIABLE_REGISTRY` dans `crossVariables.ts`.

**Problème central** : des graphiques et KPIs ont été ajoutés récemment dans les blocs de visualisation mais **jamais déclarés dans le registre admin**, les rendant invisibles et non-configurables.

---

## Anomalies détectées

### Onglet `parcels-titled` (Parcelles)

| # | Type | item_key | Dans le bloc UI | Dans le registre admin | Dans cross-variables |
|---|------|----------|:-:|:-:|:-:|
| 1 | **chart** | `occupation` | ✅ | ❌ MANQUANT | ❌ MANQUANT |
| 2 | **chart** | `lease-type` | ✅ | ❌ MANQUANT | ❌ MANQUANT |
| 3 | **chart** | `floor-dist` | ✅ | ❌ MANQUANT | ❌ MANQUANT |
| 4 | **chart** | `sound-env` | ✅ | ✅ (absent du registre, mais présent via index 18+) | ❌ registre OK via `sound-env` |
| 5 | **chart** | `noise-sources` | ✅ | ❌ MANQUANT | ✅ OK |
| 6 | **kpi** | `kpi-occupied` | ✅ | ❌ MANQUANT | — |
| 7 | **kpi** | `kpi-hosting` | ✅ | ❌ MANQUANT | — |
| 8 | **kpi** | `kpi-multi-constr` | ✅ | ❌ MANQUANT | — |

### Onglet `contributions` (Contributions)

| # | Type | item_key | Dans le bloc UI | Dans le registre admin | Dans cross-variables |
|---|------|----------|:-:|:-:|:-:|
| 9 | **chart** | `occupation` | ✅ | ❌ MANQUANT | ❌ MANQUANT |
| 10 | **chart** | `lease-type` | ✅ | ❌ MANQUANT | ❌ MANQUANT |
| 11 | **kpi** | `kpi-with-lease` | ✅ | ❌ MANQUANT | — |

---

## Résumé des écarts

| Catégorie | Count |
|-----------|-------|
| Charts manquants dans le registre | 5 (3 parcelles + 2 contributions) |
| KPIs manquants dans le registre | 4 (3 parcelles + 1 contributions) |
| Cross-variables manquantes | 4 (occupation × 2, lease-type × 2) |
| **Total éléments non-configurables** | **9** |

**Impact** : L'admin ne peut ni masquer, ni réordonner, ni renommer, ni changer le type de ces 9 éléments depuis l'interface de configuration.

---

## Plan de corrections

### 1. Mettre à jour `analyticsTabsRegistry.ts`

**Onglet `parcels-titled`** — ajouter :
- 3 charts : `occupation` (pie), `lease-type` (bar-h), `floor-dist` (bar-v)
- 3 KPIs : `kpi-occupied`, `kpi-hosting`, `kpi-multi-constr`

**Onglet `contributions`** — ajouter :
- 2 charts : `occupation` (pie), `lease-type` (donut)
- 1 KPI : `kpi-with-lease`

### 2. Mettre à jour `crossVariables.ts`

**Onglet `parcels-titled`** — ajouter :
- `occupation` : croisements Province, Type titre, Usage
- `lease-type` : croisements Province, Type titre
- `floor-dist` : croisements Province, Usage

**Onglet `contributions`** — ajouter :
- `occupation` : croisements Province, Statut, Type contribution
- `lease-type` : croisements Province, Statut

### 3. Aucune modification UI

Les blocs de visualisation sont déjà fonctionnels. Seules les sources de configuration admin sont à mettre à jour.

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/config/analyticsTabsRegistry.ts` | +9 entrées (6 charts + 3 KPIs) dans 2 onglets |
| `src/config/crossVariables.ts` | +5 entrées de croisement dans 2 onglets |

