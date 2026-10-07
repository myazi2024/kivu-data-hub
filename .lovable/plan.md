# Harmoniser la Carte RDC avec Analytics

## Objectif
Faire de la circonscription foncière et de son découpage administratif la même source de vérité dans la carte et les filtres Analytics, sans inventer de limites géographiques.

## Changements prévus

1. **Unifier la sélection Carte ↔ Analytics**
   - Lorsqu’une circonscription est choisie sur la carte, appliquer la même détection que dans Analytics : province, zone SU/SR et ancre ville, commune ou territoire.
   - Exemple vérifié : un clic sur « Goma » conservera l’ancrage sur la commune de Goma ; il n’effacera plus ville/commune comme le fait actuellement la synchronisation venant de la carte.
   - Lorsqu’un filtre change ou est réinitialisé, nettoyer ensemble les niveaux dépendants et garder la carte, les filtres et l’URL cohérents.

2. **Aligner les limites affichées sur les mêmes règles**
   - Faire utiliser à la cartographie la logique commune `getLandDistrictAnchor` déjà employée par Analytics.
   - Colorer seulement les communes, villes ou territoires dont l’ancrage est exact, dans la bonne province.
   - Laisser grises les circonscriptions partielles ou non validées tant qu’aucune limite officielle n’est disponible ; aucune frontière ne sera approximée.
   - Conserver le zoom, le survol, les statistiques et la coloration par indicateur existants.

3. **Supprimer ce qui n’est plus pertinent**
   - Retirer la seconde logique de correspondance devenue redondante avec l’ancrage partagé.
   - Supprimer les suggestions non validées et leur indicateur interne, actuellement testés mais jamais utilisés dans le rendu.
   - Retirer les alias vides, états de carte jamais lus et fonction de remise à zéro non utilisée.
   - Garder les deux vues utiles « Provinces » et « Circonscriptions foncières » ainsi que la zone SU/SR silencieuse dans Analytics.

4. **Sécuriser les cas de navigation**
   - Couvrir la sélection depuis Analytics, depuis la carte, le retour arrière, le changement de province et l’ouverture directe par URL.
   - Vérifier les cas représentatifs : Goma/Karisimbi (communes), Beni-Ville (ville), Rutshuru (territoire), Kalehe-Nord/Butembo I (partiels sans limite inventée) et une circonscription inconnue.

## Validation
- Ajouter des tests de synchronisation et adapter les tests de correspondance cartographique à la source partagée.
- Exécuter les tests ciblés puis la suite complète.
- Contrôler la compilation et les erreurs d’exécution disponibles.
- La page étant protégée par une connexion externe, la vérification automatisée à l’écran restera limitée aux vues accessibles sans authentification.

## Détails techniques
- Centraliser la résolution géographique autour de `getLandDistrictAnchor` et exposer un résultat réutilisable par les filtres comme par `useLandDistrictFeatures`.
- Faire appliquer l’ancre par le pont `LandDistrictFilterContext` au lieu de remettre systématiquement les niveaux administratifs à `undefined`.
- Étendre les remises à zéro de `useMapDrilldown` à la circonscription, au territoire et à la zone afin d’éviter les états croisés.
