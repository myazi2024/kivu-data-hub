# Données foncières : aligner la base et le code sur les dernières mises à jour

## Constats vérifiés

1. **Réglages orphelins dans la base (onglet Carte RDC)** — 18 réglages ne correspondent plus à rien d'affiché. Le tableau compact sous la carte et l'infobulle n'utilisent que 11 indicateurs chacun, mais la base garde aussi d'anciens indicateurs :
   - tableau : `detail-certificates`, `detail-contributions`, `detail-density`, `detail-fiscal`, `detail-invoices`, `detail-parcels`, `detail-resolution`, `detail-revenue`, `detail-surface`, `detail-titles` ;
   - infobulle : `tooltip-certificates`, `tooltip-contributions`, `tooltip-density`, `tooltip-fiscal`, `tooltip-invoices`, `tooltip-parcels`, `tooltip-revenue`, `tooltip-titles`.
   Dans l'administration, ces commutateurs apparaissent sans aucun effet.
2. **Réglage « Titre de légende » (`map-legend-title`) sans effet** : il figure dans les réglages par défaut et dans la base, mais aucun écran ne le lit plus depuis la refonte de la légende.
3. **Doublons et code mort** :
   - la liste des 11 lignes d'infobulle est écrite deux fois (`DRCInteractiveMap.tsx` et `mapMeta.ts`) ;
   - `TOOLTIP_LINE_KEYS` et `DENSITY_TIER_KEYS` dans `mapMeta.ts` ne sont importés nulle part ; la carte réécrit les paliers à la main.

## Corrections

1. **Migration** : supprimer les 18 réglages orphelins et `map-legend-title` de l'onglet `rdc-map` (uniquement cet onglet ; aucune autre donnée touchée).
2. **Code** :
   - retirer `map-legend-title` des réglages par défaut de l'onglet Carte RDC ;
   - la carte utilise `TOOLTIP_LINE_KEYS` et `DENSITY_TIER_KEYS` de `mapMeta.ts` au lieu de ses listes recopiées (une seule source).
3. **Contrôle complémentaire pendant l'exécution** : recherche de tout autre code mort ou appel à la base devenu inutile dans les écrans Données foncières (props, états, paramètres d'URL retirés lors des refontes précédentes) ; suppression uniquement de ce qui n'a aucun usage, sans changement visible.

## Vérifications
- Requête après migration : plus aucun de ces réglages dans la base, rapport d'orphelins de l'administration vide pour la Carte RDC.
- Tests, contrôle des types et compilation.
- Aucun changement visuel attendu pour l'utilisateur ; l'administrateur voit seulement disparaître des commutateurs sans effet.
