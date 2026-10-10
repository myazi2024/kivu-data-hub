# Données foncières : la carte des circonscriptions sans bandeau

## Résultat attendu
- Le bandeau du haut de carte disparaît entièrement : plus de titre « … — République Démocratique du Congo », plus de boutons « Provinces » / « Circonscriptions foncières », plus la ligne d'explication sur les zones grises.
- La carte s'ouvre par défaut sur les circonscriptions foncières ; la légende en bas (« Circonscriptions identifiées » / « Découpage en cours ») explique déjà les couleurs.
- Toute la hauteur libérée (environ 60 à 70 px) va à la carte. Le panneau « Données géographiques » garde sa taille.
- Dans ce panneau, « Cliquez sur une province » devient « Survolez ou sélectionnez une circonscription ».

## Comment la carte choisit sa vue, sans boutons
Par ordre de priorité :
1. Un visuel « Afficher sur la carte » est actif → carte des provinces coloriée par ce visuel (le bandeau « Mode visuel » garde donc tout son sens).
2. Une circonscription est sélectionnée → carte des circonscriptions, zoomée sur elle.
3. Ville et commune filtrées → carte des quartiers.
4. Ville filtrée → carte des communes.
5. Territoire filtré, ou choix « zone rurale » → carte des territoires.
6. Sinon (défaut) → carte des circonscriptions.

Retour : « Retirer de la carte », le bouton retour de la carte, ou le retrait du filtre ramènent à la vue précédente, puis aux circonscriptions.
Conséquence à connaître : la carte des provinces n'apparaît plus que par le mode visuel ; le survol d'une province dans les filtres affiche la carte des circonscriptions de cette province.

## Cohérence
- La légende des paliers Analytics (rouge / orange / jaune / gris) ne s'affiche que sur les vues provinces, communes, quartiers et territoires ; sur la vue circonscriptions, seule la légende des couleurs de circonscription reste.
- Le réglage d'administration « Note d'en-tête de carte » n'a plus rien à afficher : il est retiré de la configuration de l'onglet Carte RDC, pour ne pas laisser un réglage sans effet.
- La mention « Total : N parcelles enregistrées » qui figurait dans la ligne supprimée disparaît avec elle ; ce chiffre reste visible dans les indicateurs Analytics.

## Détails techniques
- `src/components/DRCInteractiveMap.tsx` : suppression du bloc d'en-tête (titre, boutons, paragraphe) ; le repère de focus clavier utilisé au changement de panneau mobile est réorienté vers la zone de carte (`tabIndex={-1}` + `aria-label`) ; la vue affichée n'est plus un état mais une valeur dérivée ; le compteur de parcelles devenu sans consommateur est retiré.
- `src/components/map/meta/mapView.ts` (nouveau) : fonction pure `resolveMapView` appliquant les 6 règles ci-dessus, testée unitairement.
- `src/components/map/hooks/useMapDrilldown.ts` : suppression de l'état de vue et du paramètre d'URL `view` (les liens partagés contenant `?view=` s'ouvrent simplement sur la vue par défaut) ; le paramètre `district` est conservé.
- `src/components/map/hooks/useMobilePagerEffects.ts` : le type du repère de focus est élargi à un élément générique.
- `src/config/analyticsTabsRegistry.ts` : retrait de l'entrée `map-header-note` de l'onglet `rdc-map`.
- Panneau « Données géographiques » : libellé d'accroche mis à jour.
- `AGENTS.md` : règle « la vue de la carte est dérivée des filtres, aucun sélecteur manuel ».
- Aucune modification de base de données.

## Vérification
- Tests unitaires de `resolveMapView` : défaut circonscriptions, circonscription sélectionnée, ville seule, ville + commune, territoire, zone rurale, mode visuel prioritaire, retour après retrait du filtre.
- Suite de tests complète et contrôle de compilation.
- Limite : la page Données foncières est réservée à certains rôles et votre base est externe, je ne peux donc pas ouvrir la carte à l'écran avec une session ; la vérification se fait par les tests et la lecture du code. Je vous indiquerai les points à contrôler de vos yeux : ouverture par défaut sur les circonscriptions, hauteur gagnée, légende en bas, bascule vers les quartiers/communes/territoires selon les filtres, et retour au mode visuel.
