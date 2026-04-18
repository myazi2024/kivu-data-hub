

## Audit détaillé — Espace admin "Config Graphiques"

### 1. Architecture (lecture seule)

| Couche | Fichier | LOC | Rôle |
|---|---|---|---|
| Page admin | `AdminAnalyticsChartsConfig.tsx` | **697** | Conteneur, mode switcher, sauvegarde |
| Sous-éditeurs | `analytics-config/{TabManager, ItemEditor, FilterManager, CrossVariableManager, GlobalWatermarkConfig}.tsx` | 86 + 124 + 158 + 185 + 90 | Modes spécialisés |
| Hook état local | `useInitializedConfig.ts` | 114 | Merge BD + registres → state local |
| Hook BD | `useAnalyticsChartsConfig.ts` | 274 | Queries, mutations, défauts filtres |
| Registres code | `analyticsTabsRegistry.ts` + `crossVariables.ts` | 449 + 193 | Source de vérité défauts |
| **Total** | | **2 370** | |

5 modes : **Onglets / KPIs / Charts / Filtres / Croisements** + 2 onglets système (`_global`, `rdc-map`).

### 2. État BD (table `analytics_charts_config`)

15 onglets avec overrides actifs. **3 anomalies critiques** :

| # | Anomalie | Impact |
|---|---|---|
| **A1** | `tab_key='boundary'` en BD contient des item_keys de **litiges** (`resolution-rate`, `conflict-type`, `kpi-resolved`…) qui ne matchent **aucun** item du nouveau registre `boundary` (S2 = `coverage`, `age`, `purpose`…). | Le merge perd les overrides ; affichage du bloc Bornage utilise les défauts code. **Collision de namespace.** |
| **A2** | `servitudes`, `geometry`, `consistency` (S2/S3) **absents de la BD**. | Non-configurables tant qu'admin n'a pas cliqué "Sauvegarder tout". Onglets pas listés dans `useAnalyticsTabsConfig` (filtre par `_tab__` BD). |
| **A3** | `tab_key='lifting'` orphelin en BD (n'existe pas dans le registre code). | Listé dans le warning de désync mais jamais nettoyé. |

### 3. Audit fonctionnel — ce qui manque

| # | Manque | Sévérité | Détail |
|---|---|---|---|
| F1 | **Pas d'ajout d'onglet/KPI/chart** depuis l'admin | Élevée | Tout passe par le registre code. L'admin = visibilité/ordre/style uniquement. |
| F2 | **Pas de suppression** d'overrides orphelins (boundary collision, lifting) | Élevée | Aucun bouton "Nettoyer la BD". `deleteTabOverrides` existe mais non exposé. |
| F3 | **Réinitialisation ne purge pas la BD** | Moyenne | Reset local uniquement → si overrides corrompus, persistent. |
| F4 | **Pas d'init automatique** des nouveaux onglets (`servitudes`, `geometry`, `consistency`) | Moyenne | L'admin doit cliquer manuellement "Sauvegarder tout". |
| F5 | **Filtres custom impossibles** | Moyenne | Seuls 3 toggles + 2 selects (date_field, status_field). Pas d'ajout. |
| F6 | **Sauvegarde non-atomique** | Moyenne | "Sauvegarder tout" upsert ~250 items en bloc — pas de transaction, pas de diff. |
| F7 | **Pas d'audit / versioning** | Moyenne | Aucune trace `who/when/what` sur les changements. |
| F8 | **Croisements non auto-détectés** | Faible | Un nouveau chart "croisable" doit être ajouté manuellement à `CROSS_VARIABLE_REGISTRY`. |
| F9 | **Pas de prévisualisation** | Faible | Aucun aperçu du graphique avec la couleur/icône/type choisis. |
| F10 | **Pas de validation** des `custom_icon` (nom Lucide) ni des bornes watermark | Faible | Saisie libre → erreurs silencieuses si nom invalide. |
| F11 | **Mobile** : viewport étroit → mode switcher se scroll horizontalement, sidebar remplacée par `<Select>` (OK mais perd les badges "modifié") | Faible | UX dégradée. |
| F12 | **`AdminAnalyticsChartsConfig.tsx` = 697 lignes** | Faible-Moyenne | Sous le seuil 1000 mais proche ; pourrait être éclaté en 1 fichier par mode. |

### 4. Sécurité & RLS

À vérifier dans un second passage : `analytics_charts_config` doit avoir RLS restreignant `INSERT/UPDATE/DELETE` aux rôles `super_admin` / `admin` uniquement. La page n'est protégée que par le routing admin côté client.

### 5. Recommandations priorisées

**P0 — Correctifs immédiats**
1. **Nettoyer la collision `boundary`** : purger les 12 lignes BD orphelines (item_keys litiges) sous `tab_key='boundary'`.
2. **Renommer le tab_key** soit du registre boundary code, soit garder `boundary` pour les litiges historiques. Recommandation : **renommer le nouveau bloc Bornage en `parcel-boundary`** pour éviter la confusion.
3. **Initialiser** `servitudes`, `geometry`, `consistency` en BD avec `item_type='tab'` + leurs items par défaut.
4. **Purger `lifting`** orphelin.

**P1 — UX admin**
5. Bouton **"Nettoyer les overrides orphelins"** (utilise `deleteConfig` sur les `tab_key` non présents dans le registre).
6. Bouton **"Synchroniser avec le registre"** : crée en BD les nouveaux onglets/items absents.
7. Indicateur visuel **par onglet** des items orphelins en BD.

**P2 — Évolutions**
8. Champ **filtre custom** dans FilterManager.
9. **Aperçu live** d'un chart avec config courante (couleur/icône/type).
10. **Audit log** (table `analytics_config_audit` : qui, quand, diff JSON).
11. Validation Lucide icon names + bornes watermark (opacity 0–1, size 30–200).
12. Modulariser `AdminAnalyticsChartsConfig.tsx` (extraire chaque viewMode dans un sous-composant `views/{TabsView,KpisView,ChartsView}.tsx`).

### 6. Question

Souhaitez-vous que je propose un plan d'implémentation pour :
- **(A) P0 uniquement** — nettoyage BD + init des nouveaux onglets (rapide, ~30 min)
- **(B) P0 + P1** — ajoute UX de nettoyage/sync (~1 h)
- **(C) Plan complet P0+P1+P2** — refonte modulaire + audit log

