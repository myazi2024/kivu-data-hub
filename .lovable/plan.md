# Exploiter dans Analytics (onglet Construction) tous les indicateurs du bloc Construction du CCC

## Constat du scan

L'onglet Construction affiche déjà : type, nature, catégorie de bien, construites/non construites, matériaux, standing, année, usage déclaré, occupation, étages, capacité d'accueil, pression d'occupation, autorisation de bâtir, taille, hauteur, appartements (surface, orientation), environnement sonore, sources de bruit, géographie, évolution.

Indicateurs collectés par le CCC mais non exploités :

| Indicateur CCC | Donnée disponible | État |
|---|---|---|
| Maison basse | catégorie de bien | noyé dans « Catégorie de bien », pas de suivi propre |
| Usage déclaré par construction | constructions supplémentaires | seule la construction principale est comptée |
| État de la construction (achevée / en cours) | `construction_status` | jamais chargé ni affiché |
| Mis en location (nombre) | `is_rented` | affiché seulement dans l'onglet Marché locatif |
| Comment ce bien est-il mis en location (un seul / plusieurs locaux) | `rental_configuration`, `rental_units_count` | idem |
| Locaux occupés / vacants | `rental_units[].isOccupied` | non exploité |
| Usage réel du local | `actual_usage` (contributions) | jamais chargé |
| Capacité d'exploitation | `operational_capacity` + unité | jamais chargé |
| Contrat de location joint | `lease_contract_url` (présence seulement) | jamais chargé |
| Limites et entrées (mur, mur mitoyen, limite sans mur, route bordante, entrées) | `parcel_sides`, `road_sides` | chargés mais non exploités dans cet onglet |
| Constructions supplémentaires | `additional_constructions` | seulement le KPI « Multi-constr. » |

## Ce qui sera ajouté (onglet Construction)

Nouveaux KPI :
- Maisons basses
- En cours de construction (avec % des constructions)
- Mises en location (nombre, % des constructions)
- Locaux vacants

Nouveaux graphiques :
1. État de la construction — achevée vs en cours (camembert).
2. Mise en location — louées vs non louées (camembert).
3. Mode de location — un seul local vs plusieurs locaux (anneau), plus répartition du nombre de locaux (1, 2–3, 4–6, 7+).
4. Occupation des locaux loués — occupés par locataire / par le propriétaire / vacants.
5. Usage réel vs usage déclaré — barres comparant l'usage réel à l'usage prévu (écart d'usage).
6. Capacité d'exploitation — répartition par unité (places, couverts, lits…), sans additionner des unités différentes.
7. Contrat de location joint — avec / sans (anneau, présence seulement, aucun document exposé).
8. Limites de la parcelle — répartition des côtés : Mur, Mur mitoyen, Limite (sans mur).
9. Accès routier — parcelles bordées par au moins une route, nombre de côtés sur route, types de revêtement si renseignés.
10. Entrées — parcelles avec entrée déclarée et nombre d'entrées par côté.

Toutes les constructions (principale + supplémentaires) sont comptées dans les graphiques par construction (catégorie, usage, état, location), avec un sélecteur implicite : les KPI par parcelle restent par parcelle.

Chaque graphique : masqué s'il n'y a aucune donnée, filtres Analytics appliqués (province, circonscription, SU/SR…), variables croisées, insight automatique, configurable depuis l'admin (visibilité, titre, ordre, type de graphique) comme les existants.

## Hors champ
- Aucune modification du formulaire CCC.
- L'onglet Marché locatif reste inchangé (les loyers y restent ; ici seulement le volume et la structure de la location).
- Aucun montant de loyer ni contenu de contrat ajouté dans l'onglet Construction.

## Détails techniques
- `useLandDataAnalytics.tsx` : ajouter `construction_status` aux sélections parcelles et contributions ; `actual_usage, actual_usage_other, operational_capacity, operational_capacity_unit, lease_contract_url` côté contributions (et parcelles si les colonnes existent — vérifié au début de l'implémentation, sinon dérivé des contributions approuvées liées par numéro de parcelle). `lease_contract_url` réduit à un booléen `has_lease_contract` dès le chargement.
- `src/types/landAnalytics.ts` : champs ajoutés à `ParcelRecord` / `ContributionRecord`.
- Nouveau helper pur `src/utils/constructionAnalytics.ts` : aplatit principale + `additional_constructions` en liste de constructions (catégorie, usage, état, location, usage réel, capacité) et agrège `parcel_sides` / `road_sides` (types de limite, routes, entrées). Réutilise `isRentExemptUnit` (rentalStatus) pour le statut des locaux et les normaliseurs existants (usage, nature, type).
- `ParcelsWithTitleBlock.tsx` : nouveaux KPI et `chartDefs` ; si le fichier dépasse la limite, extraction des nouveaux graphiques dans un sous-composant.
- `analyticsTabsRegistry.ts` : nouvelles entrées `parcels-titled` (kpi + chart) avec ordre cohérent avec celui du bloc Construction du CCC.
- Tests vitest pour le helper (aplatissement, mur mitoyen, route Oui/Non, local vacant, propriétaire occupant).
