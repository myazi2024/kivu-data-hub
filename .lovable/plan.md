# Onglet « Location et valeur » : refonte selon la liste fournie

## Objectif
Remplacer les visuels actuels de l'onglet par votre liste, sans doublon, au format Analytics (cartes, filtres, insights, réglages admin, partage). Le terme « permis » devient « autorisation de bâtir » (règle du projet).

## Redondances retirées de votre liste
- Visuel 23 (avec/sans autorisation) = indicateurs 9 et 10 : fusionnés en un seul indicateur « Constructions avec autorisation » (le complément est affiché dans l'info-bulle) et un seul visuel donut.
- Visuels 3 et 4 (Top 10 localités) = visuels 1 et 2 triés : les visuels 1 et 2 affichent directement les 10 localités les plus chères, triées.
- Visuel 25 (rendement par localisation) est déjà contenu dans le visuel 5 (combiné) : supprimé.
- Visuel 17 (surface × capacité × prix) : nuage de points où la taille du point = capacité.

## Résultat
**Indicateurs (9)** : prix de vente moyen, prix de vente médian, loyer moyen, loyer médian, biens recensés, surface moyenne parcelle, surface moyenne bâtie, rendement locatif moyen, constructions avec autorisation (%).

**Visuels (25)**
- Géographie : prix de vente moyen (top 10), loyer moyen (top 10), combiné prix + rendement.
- Typologie : vente vs location par catégorie (8 catégories CCC, « Local commercial » au lieu de Bureau), valeur du marché par catégorie, part de marché par catégorie, vente/location Résidentiel vs Commercial.
- Physique : 4 nuages de points surface × prix, valeur par classe de surface (<100, 100-250, 250-500, 500-1000, ≥1000 m²), prix par hauteur (RDC à R+4 et plus), prix par capacité (1-2, 3-5, 6-10, 11+), nuage surface bâtie × capacité × prix.
- Âge/état : prix et loyer selon l'année de construction, vente/location achevée vs en cours, biens par tranche d'âge (0-5, 6-10, 11-20, plus de 20 ans).
- Réglementaire/investissement : valeur avec/sans autorisation, répartition avec/sans autorisation, rendement par catégorie, top 10 investissements (tableau), top 10 biens les plus chers à la vente, à la location, biens sur/sous-évalués.

Supprimés : mise en location, mode locatif, tranches de loyer et de revente, ancienneté de location, disposition à vendre, devise, expertise récente, valeur expertisée, annonces, hauteur par commune/quartier, évolution.

## Règles de calcul
- Prix de vente = prix de revente déclaré en USD ; loyer = même règle que le CCC (locaux vacants et occupés par le propriétaire exclus).
- Rendement = loyer annuel / prix de vente, seulement pour les biens ayant les deux.
- Surface bâtie = somme des surfaces des constructions déclarées ; autorisation = au moins une autorisation de bâtir déclarée.
- Sur/sous-évalué : prix au m² comparé à la médiane de la même catégorie et localité (au-delà de +30 % / en deçà de -30 %), avec au moins 3 biens comparables.
- Aucune valeur inventée : biens sans donnée ignorés dans chaque visuel. Top 10 biens : numéro de parcelle et localité uniquement, aucun nom.

## Détails techniques
- `RentalMarketBlock.tsx` réécrit ; calculs purs dans `src/utils/rentalMarketAnalytics.ts` avec tests (médiane, rendement, classes, sur/sous-évaluation, exclusions).
- Nouveau type `scatter` (Recharts ScatterChart) dans `ChartCard` et `CHART_TYPE_OPTIONS`, plus un rendu tableau pour le top 10 investissements ; graphiques combinés barres + courbe via `ComposedChart`.
- `analyticsTabsRegistry.ts` (entrée `rental-market`) : nouvelles clés KPI/visuels ; `crossVariables.ts` et `mapTabProfiles.ts` alignés (références aux anciennes clés retirées).
- Migration : suppression des réglages `analytics_charts_config` de l'onglet `rental-market` dont la clé n'existe plus.
- Vérification : tests, typecheck, build ; page protégée, donc pas de contrôle visuel sans session.
