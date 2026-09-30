# Revue et corrections du menu Accueil

## Constats

1. **Double chargement des chiffres** : la carte et la ligne de chiffres du bas de page appellent chacune le même service des compteurs. Deux appels identiques à chaque visite.
2. **Légende trompeuse** : sous la carte, la pastille « X identifiées » est d'une seule couleur, alors que chaque circonscription a sa propre couleur. Elle ne correspond à rien de visible sur la carte.
3. **Calcul inutile de la carte** : les contours des circonscriptions identifiées sont calculés deux fois (une fois pour la couche grise puis jetés). Ralentit l'animation de zoom.
4. **Identifiants de zones potentiellement en double** : les zones grises sont identifiées par leur seul nom ; deux territoires homonymes provoqueraient un affichage instable.
5. **Pastille « 26 provinces » incohérente** dans le bas de page : le nombre vient de la liste des provinces où le service est disponible (celle de la mention « Service disponible pour : Nord-Kivu, Sud-Kivu » supprimée). Selon la configuration, elle affiche soit « 26 » par défaut, soit « 2 provinces ».
6. **Image d'arrière-plan préchargée deux fois** : l'image par défaut est préchargée avant que l'image configurée par l'admin ne soit connue, ce qui entraîne deux téléchargements.
7. **Bouton « Explorer »** sous la carte : il ouvre la carte des données foncières sans rien lier à la circonscription choisie. Il reste, mais son libellé devient « Données foncières » pour être explicite.

## Corrections

- Un seul chargement des compteurs, partagé entre la carte et le bas de page (mis en cache quelques minutes).
- Légende : remplacer la pastille unie par un petit dégradé multicolore « Circonscriptions identifiées (X) ».
- Carte : ne calculer que les contours affichés ; identifiants de zones uniques.
- Bas de page : la pastille affiche toujours le nombre réel de provinces de la RDC (26), sans dépendre de la liste de disponibilité du service.
- Image : ne précharger que lorsque l'image définitive est connue.
- Bouton sous la carte : libellé « Données foncières ».
- Retirer le code devenu inutile (lecture de la configuration du catalogue dans le bas de page, fonctions de chargement dupliquées).

Rien ne change dans la mise en page, les couleurs, ni les règles de correspondance des circonscriptions.

## Vérification

Tests existants, contrôle des types, puis navigateur sur ordinateur (1280×720, 1280×800) et téléphone (390×844) : un seul appel réseau aux compteurs, survol/zoom/retour de la carte, chiffres du bas de page, page toujours sans défilement sur ordinateur.

## Détails techniques

- Nouveau hook `src/hooks/useHomeBicCounts.ts` (`useQuery`, clé `['home-bic-counts']`, `staleTime` 5 min) retournant la réponse brute ; `HomeProvinceMap` et `HomeBicIndicators` en dérivent (normalisation `normalizeGeoName` via `useMemo`).
- `HomeProvinceMap` : filtrer `areas` sans district avant `projectFeature` ; `key={\`area-${index}-${area}\`}`.
- `Footer` : supprimer `useCatalogConfig`, constante `26`.
- `HeroSection` : n'ajouter le `<link rel="preload">` que lorsque la configuration d'apparence est chargée.
- Mettre à jour `AGENTS.md` (compteurs d'accueil chargés via un seul hook partagé).
