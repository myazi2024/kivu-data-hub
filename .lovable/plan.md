# Données foncières › Analytics : filtres de lieu calqués sur le CCC

## Ce qui ne va pas aujourd'hui
- Après le choix de la circonscription, la zone (SU/SR) est bien déduite en interne, mais rien ne l'affiche : l'utilisateur ne voit pas « SU - Urbaine » / « SR - Rurale » comme dans le CCC.
- Si une province n'a pas de liste de villes enregistrée, toute la suite urbaine (Ville › Commune › Quartier › Avenue) disparaît, au lieu de se rabattre sur les lieux présents dans les données.
- Les niveaux dépendants peuvent apparaître avant d'avoir choisi le niveau au-dessus, et la ligne n'indique pas l'étape suivante.

## Ce qui change (ordre identique au CCC)

```text
Lieu › RDC › Province › Circonscription foncière › [SU - Urbaine | SR - Rurale]
   SU : › Ville › Commune › Quartier › Avenue
   SR : › Territoire › Collectivité › Groupement › Village
```

1. Province d'abord ; la circonscription reste grisée tant qu'aucune province n'est choisie.
2. Au choix de la circonscription : badge figé « SU - Urbaine » ou « SR - Rurale » avec la mention « auto-détecté depuis la circonscription » (même présentation que le CCC). Choix manuel SU/SR seulement si la circonscription n'est pas répertoriée.
3. Seuls les filtres de la section détectée s'affichent, un niveau à la fois (chaque niveau apparaît quand le précédent est choisi).
4. Changer de province ou de circonscription efface la zone et tous les niveaux inférieurs ; un clic sur la carte suit la même règle.
5. Listes : celles du CCC en priorité, sinon les lieux présents dans les données de la province et de la circonscription choisies, pour ne jamais masquer un niveau à tort.

Aucun nouveau filtre, aucun changement de serveur.

## Détails techniques
- `AnalyticsLocationRow.tsx` : badge zone (tokens sémantiques), suppression de la condition `villes.length > 0` qui masquait la branche urbaine, affichage progressif.
- `useAnalyticsCascade.ts` : repli `extractUnique` pour villes/territoires, restreint à la circonscription sélectionnée (`sameGeo(land_district)`).
- `AnalyticsFilters.tsx` : synchronisation carte → filtres vérifiée (sélection territoire ⇒ zone SR, circonscription ⇒ zone déduite).
- Tests unitaires dans `src/utils/__tests__/analyticsFilters.test.ts` (déduction de zone, repli des listes, purge en cascade).
