
# Adapter le bloc sous la carte au filtre géographique actif

## Diagnostic
Le problème restant ne vient pas des 14 blocs Analytics à droite. Le bloc récapitulatif situé **sous la carte** dans `src/components/DRCInteractiveMap.tsx` affiche encore des métriques calculées uniquement avec `selectedProvince`.

Or la sélection `selectedVille`, `selectedCommune` et `selectedQuartier` est déjà bien propagée depuis `AnalyticsFilters` vers `ProvinceDataVisualization`, puis vers `DRCInteractiveMap`. La carte en tient compte, mais **pas le résumé sous la carte**.  
Résultat : quand `Virunga` est sélectionné, la carte se centre sur Virunga, mais le bloc sous la carte reste agrégé au niveau province.

## Correction à faire
1. Remplacer la logique actuelle “Données province” par une logique “Résumé de la sélection”.
2. Construire un scope actif à partir du niveau le plus précis disponible :
   - Province
   - Ville
   - Commune
   - Quartier
3. Filtrer les datasets utilisés par ce résumé selon ce scope actif.
4. Recalculer tous les KPI du bloc avec les données filtrées :
   - Parcelles
   - Titres demandés
   - Contributions
   - Mutations
   - Litiges
   - Certificats
   - Expertises
   - Revenus
   - Recettes fiscales
   - Factures
   - Surface
   - Taux de résolution
   - Densité
5. Mettre à jour l’en-tête du bloc pour afficher la sélection réelle :
   - `Virunga — Karisimbi — Goma`
   - ou `Karisimbi — Goma`
   - ou `Goma`
   - ou `Nord-Kivu`
6. Corriger le bouton de fermeture mobile pour réinitialiser toute la sélection géographique active, sinon le bloc resterait visible même après suppression de la province seule.

## Détails techniques
- Dans `DRCInteractiveMap.tsx`, remplacer les helpers centrés province (`countForProvince`, `sumForProvince`) par des helpers génériques basés sur un prédicat de scope, par exemple :
  - `matchesScope(record)`
  - `countForScope(records)`
  - `sumForScope(records, field)`
- Utiliser une comparaison normalisée (`trim().toLowerCase()`) pour `province`, `ville`, `commune` et `quartier`, afin d’éviter les faux négatifs liés à la casse ou aux espaces.
- Créer un `useMemo` dédié pour les stats du scope courant afin d’éviter de recalculer à chaque rendu.
- Garder `selectedProvince` pour la navigation carte, mais ne plus l’utiliser comme source unique des chiffres affichés dans le bloc sous la carte.

## Fichier concerné
- `src/components/DRCInteractiveMap.tsx`

## Vérifications
1. Sélectionner `Nord-Kivu > Goma > Karisimbi > Virunga` et vérifier que le bloc sous la carte affiche uniquement les chiffres de Virunga.
2. Retirer le quartier et vérifier que le bloc remonte bien au niveau `Karisimbi`.
3. Retirer la commune et vérifier le niveau `Goma`.
4. Revenir à la province seule et vérifier le niveau `Nord-Kivu`.
5. Tester le bouton de fermeture sur mobile pour confirmer que la carte et le bloc reviennent à un état cohérent.
