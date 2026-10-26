# Audit et amélioration de la barre de navigation basse (mobile)

## Constats (captures à 360 × 592, la taille de votre téléphone)
1. **Fond trop transparent** : sur l'Accueil, le contenu de la page se voit à travers la barre (on distingue une carte derrière les icônes), ce qui brouille la lecture.
2. **Pastille décalée** : la pastille de l'entrée active n'est pas centrée sous l'icône (visible sur « Accueil »), car sa largeur et son point de départ ne suivent pas exactement les colonnes.
3. **Hiérarchie faible** : icônes et libellés gris clair, peu contrastés ; l'entrée active ne se distingue que par la couleur et une pastille pâle.
4. **Hauteur et zones de toucher** : 64 px au total, libellés à 11 px collés à l'icône ; au-dessus des écrans plus larges (tablette portrait 600–767 px), la barre s'étire sans limite visuelle.
5. **Rubrique active incomplète** : « Données » n'est active que sur `/map` (pas sur le catalogue des données foncières) ; « Compte » ne l'est pas sur les sous-pages de l'espace utilisateur ni sur `/test/...` ; « Services » s'allume sous « Médias » sans que l'utilisateur le comprenne.
6. **Pages sans barre / doublons** : la carte cadastrale et Données foncières redirigent ici vers la connexion, qui n'affiche pas la barre (pas de retour rapide). Sur les pages qui ont leurs propres boutons flottants en bas (carte, Analytics), risque de superposition déjà signalé.
7. **Clavier ouvert** : la barre reste collée au-dessus du clavier lors de la saisie (recherche, formulaires), réduisant l'espace utile.
8. **Feuille « Médias »** : pas d'indication de la page courante, pas de poignée de glissement, titres de section petits.

## Corrections proposées
- **Fond opaque** couleur du thème avec léger flou seulement en bordure, fine ombre vers le haut, pour une barre lisible partout.
- **Pastille recentrée** : calcul basé exactement sur la largeur de chaque colonne ; pastille un peu plus marquée (couleur principale à ~15 %) ; petit trait indicateur sous l'icône active.
- **Lisibilité** : libellés 11–12 px plus foncés, icône active pleine couleur BIC, légère montée, espacement icône/libellé régulier ; hauteur 64 px + zone iPhone conservée ; contenu centré avec largeur max sur grands téléphones.
- **États actifs fiables** : « Données » actif sur toutes les pages de données foncières, « Compte » sur toute l'espace utilisateur et la connexion, prise en compte des pages `/test/…` ; « Médias » actif pour ses pages avec le nom de la page affiché en surbrillance dans la feuille.
- **Masquage automatique** quand le clavier s'ouvre (champ en saisie) et réapparition à la fermeture ; option de masquage discret au défilement vers le bas, réaffichage au défilement vers le haut (désactivé si l'utilisateur réduit les animations).
- **Coexistence avec les boutons flottants** : vérification que carte cadastrale, Données foncières (barre Carte/Analytics), bouton « retour en haut » et bannière cookies restent au-dessus de la barre ; la bannière cookies est réduite en hauteur sur mobile pour ne plus masquer l'écran.
- **Feuille Médias** : poignée en haut, entrée courante mise en évidence, titres de section plus lisibles, fermeture par glissement.
- **Ordinateur/tablette** inchangés.

## Vérification
- Captures à 320, 360, 390 et 767 px sur Accueil, Services, Articles, Publications, À propos, Mentions légales, Connexion ; contrôle de l'entrée active sur chacune.
- Test du clavier ouvert, de la feuille Médias et du mouvement réduit.
- Carte cadastrale et Données foncières : contrôle par session connectée si possible, sinon listé pour votre vérification.

## Détails techniques
- `MobileBottomNav.tsx` : fond `bg-background` opaque + `shadow`, pastille `left-0 w-1/5` dans un conteneur sans padding, matching actif via helper pur `getActiveBottomNavKey(pathname, testPrefix, mediaHrefs)` dans `src/lib/` + tests unitaires ; masquage via `visualViewport` (clavier) et direction de scroll.
- `index.css` : ajuster `has-bottom-nav` / `.bottom-nav-offset` ; `CookieBanner` compact sous `md`.
- Feuille : `aria-current` sur l'entrée courante, poignée décorative.
