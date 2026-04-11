

# Audit detaille — Config Graphiques (Admin > Vue d'ensemble)

## Architecture

L'interface "Config Graphiques" (`AdminAnalyticsChartsConfig.tsx` — **1 569 lignes**) pilote la configuration visuelle de tous les dashboards Analytics via 5 modes : Onglets, KPIs, Graphiques, Filtres, Croisements.

```text
┌─────────────────────────────────────────────────────────────┐
│  Barre de modes: [Onglets] [KPIs] [Graphiques] [Filtres] [Croisements]  │
├─────────────────────────────────────────────────────────────┤
│  Chaque mode = layout 2 panneaux :                         │
│  ┌──────────────┬──────────────────────────────────────┐    │
│  │ Liste onglets│  Editeur contextuel                   │    │
│  │ (ScrollArea) │  (items + save)                       │    │
│  └──────────────┴──────────────────────────────────────┘    │
│  + Bouton "Sauvegarder tout" global                        │
│  + Bouton "Voir dans Analytics" (navigation)               │
│  + Detection desync croisements                            │
└─────────────────────────────────────────────────────────────┘
```

**Flux de donnees** : `ANALYTICS_TABS_REGISTRY` (624 lignes, 15 onglets, ~160 charts + ~80 KPIs) → fusion avec DB (`analytics_charts_config`) via React Query → etat local (`localItems`, `localTabs`, `localFilters`, `localCross`) → upsert Supabase.

---

## Problemes identifies

| Priorite | Probleme | Impact |
|----------|----------|--------|
| **Haute** | **Fichier monolithique de 1 569 lignes** : 5 sous-composants (`ItemEditor`, `TabManager`, `FilterManager`, `CrossVariableManager`, composant principal) + logique de sauvegarde + initialisation dans un seul fichier | Maintenabilite tres faible, risque de regressions |
| **Haute** | **Registre de 624 lignes dans le hook** : `ANALYTICS_TABS_REGISTRY` melange config statique (350 lignes de donnees JSON) avec la logique de hooks React Query | Lisibilite, separation des responsabilites |
| **Haute** | **4 `useEffect` d'initialisation identiques** (lignes 696-778) : chacun filtre `configs`, construit un Map, fusionne avec des defaults. Pattern duplique 4 fois | Duplication, risque de desync |
| **Moyenne** | **`custom_title` surcharge pour stocker des valeurs heterogenes** : texte de titre, nom de champ DB (`created_at`), valeur numerique (`0.06`, `80`), JSON stringify de variables de croisement, position (`center`) — tout dans la meme colonne | Confusion semantique, parsing fragile |
| **Moyenne** | **Pas de validation des inputs** : le champ `field` des croisements accepte n'importe quelle valeur texte sans verifier si le champ existe dans la table cible. Idem pour les champs date/statut source. | Erreurs silencieuses cote Analytics |
| **Moyenne** | **Sauvegarde dupliquee** : la logique de sauvegarde des croisements est copiee 2 fois — dans `handleSaveAll` (lignes 871-883) et dans le `onClick` inline du bouton (lignes 1519-1531) | Duplication, divergence potentielle |
| **Moyenne** | **Pas de drag-and-drop** : `GripVertical` icon est affiche mais le reordonnancement se fait par boutons haut/bas un a un. Pour 19 charts (expertise), c'est tres fastidieux | UX degradee |
| **Basse** | **`isChartsViewTab` logique inversee** : `!EXCLUDED_SYSTEM_TABS.includes(key) || key === '_global'` inclut `_global` mais aussi tout ce qui n'est pas system — la condition OR est redondante car `_global` est dans `EXCLUDED_SYSTEM_TABS` | Code confus mais fonctionnel |
| **Basse** | **Pas de confirmation avant "Reinitialiser"** : `handleReset` (ligne 913) remet les valeurs par defaut sans dialogue de confirmation | Perte de donnees accidentelle |
| **Basse** | **`display_order` duplique** dans le registre : `title-requests` a deux items a `display_order: 9` (`owner-same` et `surface`) | Ordre ambigu |
| **Basse** | **Imports inutilises** : `Palette`, `PieChartIcon`, `TrendingUp`, `MapIcon`, `Globe` sont importes mais certains ne sont utilises que conditionnellement dans le JSX inline | Bundle size marginal |

---

## Recommandations prioritaires

### 1. Decouper le fichier principal (1 569 → ~5 fichiers)

Extraire les sous-composants dans des fichiers dedies :
- `src/components/admin/analytics-config/ItemEditor.tsx`
- `src/components/admin/analytics-config/TabManager.tsx`
- `src/components/admin/analytics-config/FilterManager.tsx`
- `src/components/admin/analytics-config/CrossVariableManager.tsx`
- `src/components/admin/analytics-config/GlobalWatermarkConfig.tsx`

Le fichier principal ne conserverait que l'orchestration (~300 lignes).

### 2. Extraire le registre statique

Deplacer `ANALYTICS_TABS_REGISTRY` dans `src/config/analyticsTabsRegistry.ts` (fichier de donnees pur, ~350 lignes). Le hook ne garderait que la logique React Query (~270 lignes). Corriger les `display_order` dupliques.

### 3. Factoriser l'initialisation

Creer un hook `useInitializedConfig(configs, isLoading)` qui retourne `{ localItems, localTabs, localFilters, localCross }` en une seule passe au lieu de 4 `useEffect` independants.

### 4. Factoriser la sauvegarde des croisements

Extraire `buildCrossItems(localCross)` dans un utilitaire et l'utiliser dans `handleSaveAll` et le bouton de sauvegarde croisements.

### 5. Ajouter la confirmation avant reinitialisation

Reutiliser le pattern `AlertDialog` deja en place pour les changements d'onglet.

---

## Section technique

**Fichiers a modifier** :
- `src/components/admin/AdminAnalyticsChartsConfig.tsx` — decoupage en 5+ fichiers
- `src/hooks/useAnalyticsChartsConfig.ts` — extraction du registre, factorisation des inits
- `src/config/crossVariables.ts` — pas de modification, mais reference pour validation

**Risque** : Le decoupage est un refactoring pur sans changement de comportement. La fusion des `useEffect` doit etre testee pour s'assurer que les 4 etats restent synchronises.

**Estimation** : ~400 lignes de code a deplacer/reorganiser, 0 nouvelle fonctionnalite, 0 migration DB.

