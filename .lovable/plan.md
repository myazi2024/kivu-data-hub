

# Audit — Menu "Données foncières" (`/map`)

## Architecture

Le menu "Données foncières" correspond à la route `/map` qui rend `Map.tsx` → `DRCInteractiveMap.tsx`. La page est structurée en 2 colonnes :
- **Gauche (col-span-4)** : Carte SVG choroplèthe de la RDC + panneau détails province
- **Droite (col-span-8)** : Analytics avec 14 onglets de visualisation

Les données sont chargées via `useLandDataAnalytics` (14 tables Supabase en parallèle avec pagination). La configuration des onglets et graphiques est pilotée par `useAnalyticsChartsConfig` (table `analytics_charts_config`).

---

## Etat de santé : Bon

L'ensemble est fonctionnel, bien architecturé et configurable depuis l'admin. Pas d'erreurs console détectées. Voici les points d'amélioration identifiés :

---

## Constats

### Structure & Navigation

| # | Constat | Sévérité |
|---|---|---|
| 1 | **Pas de titre de page** — La page `/map` n'a pas de `<title>` ou meta description. Mauvais pour le SEO et l'accessibilité. | P2 |
| 2 | **Navigation mobile correcte** — Bascule Carte/Analytics via boutons flottants en bas. Fonctionne bien. | OK |
| 3 | **Plein écran** — La navigation se masque correctement en fullscreen. | OK |

### Carte Interactive

| # | Constat | Sévérité |
|---|---|---|
| 4 | **Echelle fixe `scale(0.8)`** (ligne 294) — La carte SVG est réduite à 80% de sa taille dans un conteneur flex. Cela gaspille de l'espace visuel, surtout sur mobile. | P2 |
| 5 | **Copier en image** — Utilise `html2canvas` importé dynamiquement. Bon pattern. | OK |
| 6 | **Légende choroplèthe** — 4 paliers configurables depuis l'admin. Correctement implémenté. | OK |
| 7 | **Tooltip** — 11 lignes configurables (parcelles, titres, contributions, etc.). | OK |

### Analytics (14 blocs)

| # | Constat | Sévérité |
|---|---|---|
| 8 | **Tous les 14 blocs sont présents** : TitleRequests, ParcelsWithTitle, Contributions, Expertise, Mutation, Subdivision, Disputes, Mortgages, BuildingPermits, Taxes, OwnershipHistory, FraudAttempts, Certificates, Invoices. | OK |
| 9 | **Filtres géographiques complets** — Cascade Province → Section (Urbaine/Rurale) → Ville/Territoire → Commune/Collectivité → Quartier/Groupement → Avenue/Village. Alimenté par `geographicData`. | OK |
| 10 | **Filtres temporels complets** — Année → Semestre → Trimestre → Mois → Semaine. | OK |
| 11 | **Synchronisation carte ↔ analytics** — Cliquer sur une province filtre les analytics, et filtrer par province dans les analytics zoome la carte. Bidirectionnel. | OK |
| 12 | **Onglets mobile** — Affichés verticalement à gauche sur mobile, horizontalement en haut sur desktop. | OK |

### Données & Performance

| # | Constat | Sévérité |
|---|---|---|
| 13 | **Pagination `fetchAll`** — Contourne la limite de 1000 lignes Supabase. Correct. | OK |
| 14 | **14 requêtes parallèles** au chargement — `Promise.all` de 14 `fetchAll`. C'est beaucoup. Si une table est volumineuse, le temps de chargement initial peut être long. | P3 |
| 15 | **Enrichissement en mémoire** — Les records de permits, taxes, mortgages, etc. sont enrichis avec les données géographiques des parcelles via des `Map` lookups. Correct mais consomme de la mémoire pour de gros volumes. | P3 |
| 16 | **`staleTime: 5 min`** — Les données sont mises en cache 5 minutes. Raisonnable pour un dashboard analytics. | OK |
| 17 | **Watermark configurable** — Priorité : map-specific → global fallback. Correct. | OK |

### Panneau Détails Province

| # | Constat | Sévérité |
|---|---|---|
| 18 | **15 KPI affichés** par province : parcelles, titres, contributions, mutations, litiges, certificats, expertises, revenus, recettes fiscales, factures, densité, surface, résolution litiges. Tous configurables via admin. | OK |
| 19 | **Message "Cliquez sur une province"** quand rien n'est sélectionné. Correct. | OK |

### Accessibilité

| # | Constat | Sévérité |
|---|---|---|
| 20 | **Texte très petit** — Beaucoup de `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`. Difficile à lire, surtout sur mobile. | P2 |
| 21 | **Boutons avec `aria-label`** — Les boutons mobiles Carte/Analytics ont des labels. OK. | OK |
| 22 | **Contraste** — Les couleurs de la légende sont codées en dur (#bec8d1, #f0b90b, #e87422, #b31942) mais configurables via admin. | OK |

---

## Résumé

Le module "Données foncières" est **solide et mature** :
- 14 blocs d'analyse couvrant tous les domaines (titres, parcelles, contributions, expertises, mutations, lotissements, litiges, hypothèques, autorisations, taxes, historique propriété, fraude, certificats, factures)
- Filtres géographiques et temporels complets avec cascade
- Configuration admin complète (visibilité onglets, titres, couleurs, types de graphiques)
- Synchronisation bidirectionnelle carte ↔ analytics

**Aucun bug bloquant détecté.** Les améliorations possibles sont mineures :

| Priorité | Amélioration | Impact |
|---|---|---|
| P2 | Ajouter `document.title` pour le SEO | Faible effort |
| P2 | Augmenter la taille minimale des textes (7px → 10px minimum) pour l'accessibilité | Moyen effort |
| P2 | Revoir le `scale(0.8)` de la carte pour optimiser l'espace | Faible effort |
| P3 | Envisager un chargement progressif des 14 tables (lazy loading par onglet actif) | Effort élevé |

