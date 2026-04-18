
## Audit du menu "Données foncières"

Avant de présenter un plan d'action, j'ai besoin d'explorer le module pour produire un audit fondé sur le code réel (pas sur des suppositions). Je vais lire les fichiers clés du module Analytics, puis livrer l'audit dans une forme actionnable.

### Périmètre de l'audit
- Page d'entrée Analytics + routing
- Hook `useLandDataAnalytics` (fetch, pagination, filtres test)
- Composants de graphiques + registres (chart registry, cross-variable registry)
- Carte interactive (`/map`) — drilldown 4 niveaux
- Configuration admin des analytics (ordre, types, visibilité)
- Performance, sécurité, dette technique connue

### Axes évalués
1. **Architecture & modularité** — taille des fichiers, séparation des responsabilités, respect du seuil 1000l
2. **Performance** — pagination, mémoïsation, lazy loading, taille des payloads, cache React Query
3. **Sécurité & RLS** — filtrage TEST côté client vs serveur, exposition PII, politiques RLS sur les tables sources
4. **Cohérence des données** — enrichissement parcel_id/parcel_number, normalisation des statuts, alignement avec les specs (mutation, expertise, litige, etc.)
5. **UX & accessibilité** — responsive (875px viewport), états vides/loading/erreur, filtres, exports
6. **Configuration admin** — pilotage dynamique (ordre, types), couverture des entités
7. **Carte interactive** — drilldown, bornes GeoJSON, performance des couches
8. **Dette technique connue** — référencer mem `land-data-analytics-debt-fr` et confirmer/mettre à jour

### Livrables
- Rapport structuré par axe : **constats → sévérité (bloquant / majeur / mineur) → recommandation**
- Top 5 actions prioritaires avec estimation d'effort
- Backlog de refactor proposé (lots indépendants, à valider avant exécution)

### Étapes d'exploration (read-only)
1. Lire les mems pertinents : `land-data-analytics-structure-fr`, `land-data-analytics-debt-fr`, `analytics-config-management-fr`, `cross-variable-analytics-fr`, `interactive-map-layers-fr`, `supabase-data-fetching-pagination-analytics-fr`, `status-normalization-pattern-fr`
2. Lister `src/components/analytics/`, `src/components/cadastral-map/`, `src/pages/` (routes Analytics + Map)
3. Lire `useLandDataAnalytics.tsx` (déjà partiellement vu), les registres de charts, la page racine, la carte
4. Vérifier les politiques RLS des tables sources (`supabase--read_query` sur `pg_policies`) pour les tables listées dans `TEST_FILTER_COLUMN`
5. Mesurer la taille des fichiers > 500 lignes du module
6. Vérifier le routing (où `/map` et la page analytics sont déclarés) pour confirmer le lazy loading

### Question préalable

Souhaitez-vous que je couvre **toute la zone "Données foncières"** (page Analytics + carte interactive `/map` + configuration admin) ou seulement un sous-ensemble (p. ex. juste les graphiques, juste la carte, juste l'admin) ? Cela conditionne l'effort d'exploration et la longueur du rapport final.

Si vous approuvez ce plan d'audit (et précisez le périmètre), je passe en mode default pour exécuter l'exploration et livrer le rapport.
