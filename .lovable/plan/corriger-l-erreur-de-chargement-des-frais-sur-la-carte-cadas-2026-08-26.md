# Corriger l’erreur de chargement des frais sur la carte cadastrale

## Diagnostic confirmé

- La page `/cadastral-map` monte toujours `LandTitleRequestDialog`, même lorsque ce dialogue est fermé.
- `LandTitleRequestDialog` appelle immédiatement `useLandTitleDynamicFees`, qui interroge `land_title_fees_by_type` au chargement de la carte.
- La table contient 47 frais actifs et possède une politique RLS autorisant la lecture des lignes actives par tous.
- Cependant, la vérification des privilèges Data API ne retourne aucun `GRANT` pour `anon`, `authenticated` ou `service_role`. La requête échoue donc avant même l’évaluation de la politique RLS. Le mécanisme de réessai transitoire ne peut pas résoudre cette erreur permanente, puis affiche « Erreur lors du chargement des frais ».

## Correctifs

1. Ajouter une migration ciblée pour `public.land_title_fees_by_type` :
   - `GRANT SELECT` à `anon`, car la politique existante autorise publiquement les frais actifs ;
   - `GRANT SELECT, INSERT, UPDATE, DELETE` à `authenticated`, les écritures restant limitées aux administrateurs par la politique RLS existante ;
   - `GRANT ALL` à `service_role`.

2. Éviter le chargement inutile au démarrage de la carte :
   - ne monter `LandTitleRequestDialog` que lorsque l’utilisateur a effectivement accepté les conditions et ouvre la demande de titre foncier, ou rendre la récupération des frais explicitement dépendante de `open` ;
   - conserver le réessai actuel uniquement pour les vraies erreurs transitoires de session ou de réseau.

3. Améliorer le retour d’erreur du hook :
   - conserver le détail technique dans la console ;
   - ne montrer le toast qu’après un échec définitif d’une requête réellement nécessaire, lorsque le dialogue est ouvert.

## Vérification

- Contrôler les privilèges finaux et confirmer que la lecture Data API fonctionne avec les rôles `anon` et `authenticated` tout en laissant les écritures non administrateur bloquées par RLS.
- Charger `/cadastral-map` sans ouvrir la demande de titre : aucune requête de frais et aucun toast ne doivent apparaître.
- Ouvrir « Demander un titre foncier » : les 47 frais actifs doivent se charger sans erreur.
- Vérifier le typecheck et le comportement dans la prévisualisation authentifiée.
