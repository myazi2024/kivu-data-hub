

# Audit UX — Fonctionnalites intuitives absentes dans "Donnees foncieres"

## Contexte

Le module "Donnees foncieres" (page `/map`) est compose de :
- **Carte interactive** (gauche) : carte choroplèthe RDC avec drill-down province → ville → commune → quartier / territoire
- **Panel Analytics** (droite) : 13 onglets thematiques (Titres, Parcelles, Contributions, Expertise, Mutations, Lotissement, Litiges, Hypothèques, Autorisations, Impôts, Propriete, Certificats, Factures), chacun avec KPIs + graphiques filtrables
- **Filtres** : temporels (annee/semestre/trimestre/mois/semaine) + geographiques (province/section/ville/commune/quartier) + statut
- **Fonctions existantes** : copie de graphiques en image, cross-variables (croisement), insights pedagogiques (definition + interpretation), watermark, zoom carte, plein ecran

## Fonctionnalites intuitives absentes

### 1. Export des donnees filtrées (CSV/Excel)
**Probleme** : L'utilisateur peut filtrer finement les donnees mais n'a aucun moyen de les exporter. Il ne peut que copier des graphiques en image.

**Solution** : Ajouter un bouton "Exporter" dans chaque bloc (à côte des filtres) qui genere un fichier CSV des donnees filtrées du bloc actif. Un bouton global dans le header Analytics pour exporter tous les blocs.

**Fichiers** :
- Creer `src/utils/exportCsv.ts` — fonction utilitaire d'export CSV
- Modifier `src/components/visualizations/filters/AnalyticsFilters.tsx` — ajouter bouton export
- Modifier chaque bloc pour passer les donnees filtrées au composant de filtre

### 2. Synthese KPI globale (tableau de bord récapitulatif)
**Probleme** : Chaque onglet a ses propres KPIs, mais il n'existe aucune vue consolidée. L'utilisateur doit parcourir 13 onglets pour avoir une vue d'ensemble.

**Solution** : Ajouter un onglet "Synthèse" (premier onglet) affichant les KPIs principaux de chaque domaine (total parcelles, titres, litiges actifs, hypothèques, mutations en cours, etc.) dans une grille unique, avec mini-sparklines.

**Fichiers** :
- Creer `src/components/visualizations/blocks/SummaryBlock.tsx`
- Modifier `src/hooks/useAnalyticsChartsConfig.ts` — ajouter l'onglet dans le registre
- Modifier `src/components/visualizations/ProvinceDataVisualization.tsx` — ajouter au BLOCK_MAP

### 3. Impression / Export PDF du rapport analytics
**Probleme** : Aucune fonctionnalite d'impression. L'utilisateur qui veut partager un rapport doit faire des captures d'ecran manuelles.

**Solution** : Ajouter un bouton "Imprimer" dans le header Analytics qui ouvre une vue print-friendly (CSS `@media print`) optimisée avec en-tete BIC, date, filtres actifs, et tous les graphiques du bloc actif.

**Fichiers** :
- Modifier `src/components/DRCInteractiveMap.tsx` — ajouter bouton dans le CardHeader Analytics
- Ajouter des styles `@media print` dans `src/index.css` ou un composant PrintLayout dédié

### 4. Comparaison entre deux periodes ou deux zones
**Probleme** : Les filtres permettent de voir UNE période ou UNE zone à la fois, mais impossible de comparer (ex: T1 vs T2 2025, ou Kinshasa vs Nord-Kivu).

**Solution** : Ajouter un mode "Comparer" qui duplique le panneau de filtres et affiche côte à côte les KPIs et graphiques de deux contextes différents.

**Fichiers** :
- Creer `src/components/visualizations/CompareMode.tsx`
- Modifier les blocs pour accepter un second jeu de données filtré
- Ajouter un toggle "Comparer" dans le header Analytics

### 5. Recherche rapide de parcelle depuis les analytics
**Probleme** : L'utilisateur qui voit une anomalie dans les graphiques (ex: fraude, litige) n'a aucun moyen de cliquer pour voir la parcelle concernée.

**Solution** : Rendre les segments de graphiques cliquables pour afficher un panneau latéral listant les parcelles correspondantes à la catégorie cliquée, avec lien vers la fiche cadastrale.

**Fichiers** :
- Modifier `ChartCard.tsx` — ajouter handler `onClick` sur les segments Recharts
- Creer `src/components/visualizations/shared/DrilldownPanel.tsx` — panneau latéral listant les enregistrements

### 6. Indicateur de fraîcheur des donnees
**Probleme** : L'utilisateur ne sait pas quand les donnees ont été mises à jour pour la dernière fois.

**Solution** : Afficher un badge discret "Dernière maj : il y a X min" dans le header Analytics, base sur le timestamp du dernier fetch.

**Fichiers** :
- Modifier `src/hooks/useLandDataAnalytics.ts` — exposer `lastFetchedAt`
- Modifier `src/components/DRCInteractiveMap.tsx` — afficher le badge

### 7. Persistance des filtres (URL ou localStorage)
**Probleme** : Chaque fois que l'utilisateur navigue ou rafraîchit, tous les filtres sont réinitialisés. Les analyses complexes sont perdues.

**Solution** : Synchroniser les filtres actifs avec les paramètres URL (`?province=Kinshasa&year=2025&tab=disputes`) pour permettre le partage de liens filtrés et la persistance.

**Fichiers** :
- Modifier `src/components/DRCInteractiveMap.tsx` — sync state ↔ URL params
- Modifier `src/components/visualizations/filters/AnalyticsFilters.tsx` — lire les params initiaux

## Recommandation de priorite

| # | Fonctionnalite | Impact UX | Complexité |
|---|---------------|-----------|------------|
| 1 | Export CSV | Très élevé | Faible |
| 6 | Fraîcheur données | Élevé | Très faible |
| 7 | Persistance filtres URL | Élevé | Moyenne |
| 2 | Synthèse KPI globale | Élevé | Moyenne |
| 3 | Impression PDF | Moyen | Moyenne |
| 5 | Drill-down parcelles | Élevé | Élevée |
| 4 | Comparaison | Moyen | Élevée |

## Volume estimé

Pour implémenter les 3 priorités hautes (Export CSV + Fraîcheur + Persistance URL) : ~200-300 lignes sur 4-5 fichiers.

