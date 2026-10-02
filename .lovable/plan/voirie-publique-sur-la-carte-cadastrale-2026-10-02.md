# Voirie publique sur la carte cadastrale

## Résultat attendu
Quand une parcelle est sélectionnée par recherche ou sur la carte, ses côtés bordant une route affichent clairement le type et le nom de la route, son revêtement et sa largeur, ainsi que la présence ou l’absence déclarée d’éclairage public et de caniveau. Les informations manquantes restent indiquées comme non renseignées, sans inventer de valeur.

## Mise en œuvre
1. Remplacer les petits badges récapitulatifs actuels par une liste lisible « Voirie et équipements » dans la fiche de la parcelle. Une ligne par côté routier, avec un numéro de côté, le nom/type de voie puis les caractéristiques et équipements déclarés. Prévoir un état vide si aucune donnée de voirie n’est disponible.
2. Sur la carte, mettre en évidence **uniquement les segments de limite de la parcelle sélectionnée** qui sont déclarés comme bordant une route, avec un repère numéroté cohérent avec la liste. Toucher un côté dans la fiche le repère sur la carte ; changer de parcelle efface la sélection précédente. Si aucun contour GPS exploitable n’existe, la liste reste consultable sans trait inventé.
3. Garder la fiche compacte et défilable sur mobile ; préserver l’accès aux boutons existants. Conserver les couleurs et les composants de l’application, sans modifier les services payants.
4. Vérifier les cas avec plusieurs routes, valeurs absentes, anciens formats de côté, parcelles sans tracé, et l’affichage sur ordinateur et mobile.

## Détails techniques
- La saisie CCC enregistre `road_sides` dans la contribution ; l’approbation le reporte sur la parcelle. La vue publique `cadastral_parcels_public` expose déjà ce champ et la carte le charge : aucune migration ou ouverture de données personnelles n’est nécessaire.
- Normaliser localement l’identification des côtés routiers (`hasRoad`, `bordersRoad`, ancien `borderType`) et associer `sideIndex` aux segments des coordonnées GPS. L’overlay Leaflet de la parcelle sélectionnée sera séparé des couches persistantes pour éviter l’accumulation de repères.
- Ne pas tracer l’axe, la largeur réelle ou le parcours d’une route : seules les limites cadastrales déclarées seront soulignées.
