# Filtres Analytics : retirer les mentions « auto-détecté » et « Calquée sur »

## Ce qui change

La détection du découpage reste active (niveaux remplis et verrouillés, seuls les filtres du dessous proposés), mais rien ne l'annonce à l'écran : l'utilisateur sait qu'il a choisi la bonne circonscription.

```text
avant : … › Circonscription › SU - Urbaine › auto-détecté › Calquée sur : Commune de Goma (ville de Goma) › Quartier › Avenue
après : … › Circonscription › SU - Urbaine › Quartier › Avenue
```

- La mention en italique « auto-détecté » est supprimée.
- La pastille « Calquée sur : Commune de Goma (ville de Goma) » est supprimée.
- La pastille de zone « SU - Urbaine » / « SR - Rurale » reste : elle indique simplement quelle suite de filtres s'affiche, comme dans le formulaire CCC.
- Les listes des niveaux couverts par la circonscription restent masquées (Goma ne propose ni Ville ni Commune), et le premier filtre proposé est le niveau juste en dessous.

Aucun autre changement : ni nouveau filtre, ni logique serveur, ni formulaire CCC (sa ligne « Type auto-détecté depuis le numéro » reste inchangée).

## Détails techniques

- `src/components/visualizations/filters/AnalyticsLocationRow.tsx` :
  - supprimer le bloc pastille « Calquée sur : … » et le calcul de `anchorLabel` qui le nourrit (sinon variable inutilisée) ;
  - supprimer le texte « auto-détecté » et simplifier l'`aria-label` de la pastille de zone en « Zone » ;
  - garder `getLandDistrictAnchor` pour `lockVille` / `lockCommune` / `lockTerritoire` et pour le préremplissage au choix de la circonscription.
- `src/lib/geographicData.ts` : inchangé (`getLandDistrictAnchor` et la table de correspondances continuent de servir au verrouillage).
- Vérifications : `npx tsgo --noEmit -p tsconfig.app.json`, `bun run test` (les tests de `landDistrictAnchor.test.ts` restent valables), `tail /tmp/observability/build-errors.log`.
