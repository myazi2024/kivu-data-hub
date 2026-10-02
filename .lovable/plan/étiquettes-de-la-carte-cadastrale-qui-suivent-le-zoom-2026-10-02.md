# Étiquettes de la carte cadastrale qui suivent le zoom

## Objectif
Sur la carte cadastrale, les étiquettes posées sur la carte grossissent quand on zoome et rétrécissent quand on dézoome. Cela concerne les mesures des côtés de la parcelle, les repères et mesures de la voirie, le nom de la route, les côtés et la hauteur des constructions, les étiquettes « Lotie » et « Lot n ». Elles restent lisibles : jamais trop petites quand on est loin, jamais énormes quand on est très près.

## Comportement
- Zoom 19 (vue de la parcelle) = taille actuelle (échelle 1).
- Chaque niveau de zoom en plus ou en moins agrandit ou réduit les étiquettes d'environ 25 %.
- L'échelle reste entre 0,6 et 1,8.
- Le changement est fluide pendant le zoom et ne recharge aucune donnée.
- Quand on dézoome beaucoup (zoom 15 ou moins), les mesures détaillées se masquent pour ne pas encombrer la carte ; les contours restent visibles.

## Détails techniques
- `src/hooks/useLeafletMap.tsx` : à la création de la carte, écoute `zoom` / `zoomend` ; calcule `scale = clamp(1.25^(zoom-19), 0.6, 1.8)` et l'écrit en variable CSS `--map-label-scale` sur le conteneur de la carte, plus une classe `map-zoom-far` sous le seuil de zoom 15. Valeur initiale posée dès le montage.
- Styles en ligne des étiquettes `dimension-label`, `subdivided-label`, `lot-label` déplacés vers des classes dans `src/index.css` (couleurs via jetons sémantiques).
- `src/index.css` : les classes `road-side-marker__*`, `building-side-marker__label`, `building-height-marker__label`, `dimension-label`, `lot-label`, `subdivided-label` utilisent `transform: scale(var(--map-label-scale, 1))` avec `transform-origin: center`, pour que l'ancre reste sur le point mesuré ; transition courte, désactivée si `prefers-reduced-motion`.
- `.map-zoom-far` masque les marqueurs de côtés et de dimensions (pas les contours).
- Aucun changement de données, de requêtes ni de serveur.

## Vérification
Typecheck et tests ; contrôle visuel des étiquettes à plusieurs niveaux de zoom si l'écran carte est accessible, sinon vérification de votre côté.
