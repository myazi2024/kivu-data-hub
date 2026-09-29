# Carte des circonscriptions foncières sur l'Accueil

## Objectif
Remplacer la carte des provinces de l'Accueil par la carte des territoires et villes déjà utilisée dans Données foncières, et s'en servir comme base de la cartographie des circonscriptions foncières.

## Règles d'affichage
- **Circonscription identifiée** (territoire ou ville = une seule circonscription, même nom dans la même province) : la zone prend le nom de la circonscription et une couleur unique qui lui est propre.
- **Zone non identifiée** (territoire découpé en plusieurs circonscriptions, ou sans correspondance) : couleur grise opaque, aucune réaction au survol.
- **Survol d'une circonscription identifiée** : le nom de la circonscription, sa province et le **nombre réel** de parcelles enregistrées s'affichent sous la carte (0 inclus).
- Clavier et tactile : même comportement que le survol (focus / appui).
- Petite légende : « Circonscription identifiée » / « Découpage en cours ».
- La mise en page actuelle (carte à gauche, textes à droite, pas de défilement sur ordinateur) est conservée.

## Correspondance territoire -> circonscription
Elle est calculée automatiquement à partir des listes déjà présentes dans l'application (les territoires de la carte et les 143 circonscriptions du formulaire CCC, onglet Localisation) : noms normalisés (accents, tirets, casse), comparés dans la même province. Une courte table de corrections manuelles couvre les variantes d'orthographe (ex. « Mbanza-Ngungu », « Kasenga/M'Pweto »). Aucune frontière n'est inventée : seules les zones qui correspondent exactement sont colorées.

## Nombre de parcelles
Comptage public, par circonscription uniquement (aucune donnée personnelle), ajouté à la fonction serveur qui fournit déjà les chiffres de l'Accueil, avec la même mise en cache.

## Orientation : territoires et villes découpés en plusieurs circonscriptions
Ordre d'efficacité conseillé :
1. **Villes découpées selon leurs communes** (Kinshasa, Goma/Karisimbi, Kisangani, Bukavu, Lubumbashi…) : l'application contient déjà une carte des communes. Quand une circonscription regroupe une ou plusieurs communes connues, on peut les fusionner pour obtenir sa frontière exacte. C'est le gain le plus rapide (Kinshasa : 16 circonscriptions couvertes d'un coup).
2. **Territoires coupés en « Nord / Sud / Centre »** (Kalehe, Shabunda, Kipushi…) : il faut la liste officielle des chefferies, secteurs ou groupements rattachés à chaque circonscription (arrêtés du Ministère des Affaires foncières). Avec cette liste et une carte des chefferies/secteurs (OCHA/HDX, niveau 3), on assemble les frontières sans les approximer.
3. **Cas restants** : tracer à partir des parcelles réellement enregistrées (enveloppe des parcelles d'une circonscription) seulement comme indication visuelle, marquée « approximative », jamais comme limite officielle.
4. **Gestion dans l'admin (étape suivante)** : un écran permettant d'associer un territoire, une ou plusieurs communes ou chefferies à une circonscription, pour enrichir la carte sans intervention technique.

Pour avancer sur les points 1 et 2, il me faudra de votre part la liste officielle des communes/chefferies composant chaque circonscription découpée.

## Détails techniques
- Nouveau composant de carte d'Accueil basé sur `/drc-territoires.geojson` (164 zones, propriété `name` uniquement) ; province déduite via `geographicData` (territoires par province).
- Module `src/lib/landDistrictMapping.ts` : normalisation, correspondance nom + province avec `landDistrictsData`, table d'alias, palette de couleurs stable (teinte déterministe par circonscription, tokens CSS).
- Extension de la fonction service-only et de l'Edge Function `home-bic-counts` : `parcels_by_district` (comptage `cadastral_parcels` groupé par circonscription, exclusion des TEST).
- Tests unitaires de la correspondance (noms accentués, alias, homonymes dans provinces différentes).
- Vérification Playwright : survol, zones grises inertes, pas de défilement sur 1280×720/800 et 1440×900, rendu mobile.
- Décision documentée dans `AGENTS.md` (remplace la règle « province SVG » actuelle).
