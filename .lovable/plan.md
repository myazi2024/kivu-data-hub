# Combiner territoires et communes pour la carte des circonscriptions

## Objectif
Améliorer la carte de l’Accueil en combinant les 164 zones de la carte des territoires avec les 58 communes vectorisées déjà disponibles dans 11 villes. La vue nationale ne mettra en évidence que les zones pouvant être rattachées de façon fiable à une circonscription foncière ; aucune limite ne sera inventée.

## Comportement retenu
- Conserver les territoires ou villes qui correspondent exactement à une circonscription, avec leur nom de circonscription et leur couleur unique.
- Dans les villes couvertes par la carte communale, superposer uniquement les communes dont le nom correspond à une circonscription de la même province.
- Laisser grisées et inertes les zones sans correspondance validée.
- Au survol ou au focus : afficher sous la carte le nom de la circonscription, la province et le nombre réel de parcelles enregistrées, y compris zéro.
- Au clic sur une circonscription identifiée : zoom animé sur sa limite et maintien des détails sous la carte.
- Permettre le retour à la RDC entière par un bouton « Retour » et par un second clic sur la zone sélectionnée.
- Conserver les usages clavier et tactile, la taille compacte de l’Accueil et l’absence de défilement sur les écrans d’ordinateur habituels.

## Correspondances et validation
- Considérer comme fiable une égalité de nom normalisée entre commune et circonscription dans la même province : accents, apostrophes, espaces et tirets sont tolérés.
- Ajouter un registre séparé de suggestions pour les variantes probables et les regroupements de plusieurs communes en une circonscription.
- Une suggestion ne devient jamais une limite colorée automatiquement : elle doit être explicitement marquée comme validée à partir d’une référence officielle.
- Couvrir les variantes déjà observables dans les données, par exemple `N'djili`/`Ndjili`, `Mont Ngafula`/`Mont-Ngafula`, `Ruashi`/`Rwashi`, `Mbuji Mayi`/`Mbuji-Mayi` et `Kimeni`/`Kimemi`, sans confondre deux provinces homonymes.

## Mise en œuvre
- Étendre le module de correspondance pour gérer deux sources géométriques : territoires/villes et communes, avec province et ville parentes.
- Construire une couche cartographique unifiée : territoires identifiés en fond, communes identifiées au-dessus des villes couvertes.
- Pour éviter les doubles zones, masquer la géométrie globale d’une ville dès que ses circonscriptions communales identifiées sont affichées.
- Réutiliser la projection et l’animation de cadrage déjà présentes sur la carte des communes pour le zoom et le retour.
- Garder le comptage public existant par circonscription ; aucune donnée personnelle supplémentaire ne sera exposée.
- Ajouter des tests pour les correspondances exactes, les variantes suggérées, les homonymes, l’exclusion des suggestions non validées et la priorité des communes sur la ville englobante.

## Orientation pour les villes subdivisées
1. **Immédiat** : exploiter les correspondances commune = circonscription dans les 11 villes déjà vectorisées.
2. **Validation** : produire la liste des suggestions trouvées automatiquement, puis valider uniquement celles soutenues par une nomenclature officielle.
3. **Regroupements** : pour une circonscription composée de plusieurs communes, fusionner leurs polygones seulement après confirmation officielle de sa composition.
4. **Extension** : rechercher ou fournir des limites communales manquantes pour les villes non couvertes ; garder ces villes grisées jusque-là.
5. **Territoires subdivisés** : utiliser ultérieurement les limites de secteurs, chefferies ou groupements et leur rattachement officiel, sans tracer de coupure approximative.

## Vérification
- Vérifier visuellement la vue nationale, le survol, le focus, le clic, le second clic et le bouton Retour.
- Vérifier que les nombres de parcelles restent exacts après zoom.
- Contrôler les formats ordinateur et mobile, l’absence de chevauchement et le maintien de la hauteur compacte de l’Accueil.
- Exécuter les tests de correspondance et le contrôle TypeScript.
