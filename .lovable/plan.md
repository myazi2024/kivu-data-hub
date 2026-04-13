
# Audit Config Graphiques — Alignement avec Données Foncières

## Résultat de l'audit

Après vérification systématique des 13 blocs analytics, du registre (`analyticsTabsRegistry.ts`), des variables de croisement (`crossVariables.ts`) et de l'interface admin (`AdminAnalyticsChartsConfig.tsx`), **les charts et KPIs sont bien alignés** — chaque clé dans les blocs a son entrée correspondante dans le registre et vice versa.

Cependant, **3 lacunes ont été identifiées** :

### 1. Type de chart `multi-area` absent du sélecteur admin

Le chart "Évolution" dans l'onglet **Litiges** utilise un `MultiAreaChartCard` (type `multi-area`), mais le dropdown des types dans l'admin (ligne 38-44 de `AdminAnalyticsChartsConfig.tsx`) ne propose que : `bar-h`, `bar-v`, `pie`, `donut`, `area`.

**Correction** : Ajouter `{ value: 'multi-area', label: 'Multi-courbes', icon: '≋' }` au tableau `CHART_TYPE_OPTIONS`.

### 2. Icône personnalisée (`custom_icon`) non exposée dans l'admin

Le champ `custom_icon` existe dans `ChartConfigItem` et est stocké en DB, mais l'éditeur d'items (`ItemEditor.tsx`) ne propose aucun champ pour le modifier. C'est une fonctionnalité prévue mais jamais implémentée.

**Correction** : Ajouter un champ texte optionnel "Icône" dans `ItemEditor.tsx` pour saisir un nom d'icône Lucide (ex: `FileText`, `Users`).

### 3. Charts spéciaux (StackedBar, MultiArea) sans protection dans le sélecteur de type

Les charts de type croisement natif (`type-status` mutations, `nature-resolution` litiges, `type-trend` certificats) n'ont pas de `chart_type` défini dans le registre (= `null`). Si un admin leur assigne un type via le sélecteur, cela sera ignoré car ils utilisent des composants spéciaux (`StackedBarCard`, `MultiAreaChartCard`) hardcodés dans les blocs. C'est confus pour l'admin.

**Correction** : Désactiver le sélecteur de type dans `ItemEditor.tsx` quand le `chart_type` du registre est `null` (= chart spécial non modifiable). Afficher un badge "Type fixe" à la place.

---

## Fichiers modifiés

- `src/components/admin/AdminAnalyticsChartsConfig.tsx` — ajouter `multi-area` aux options
- `src/components/admin/analytics-config/ItemEditor.tsx` — champ icône + protection charts spéciaux

## Note pour le futur

Le système est bien conçu : le registre `analyticsTabsRegistry.ts` EST la source de vérité pour l'admin. Toute modification dans un bloc analytics (ajout de chart/KPI) doit s'accompagner d'une entrée dans le registre ET dans `crossVariables.ts` si applicable. Ce principe est déjà respecté dans le code actuel.
