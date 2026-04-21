

## Balayage gauche/droite — Carte RDC ↔ Analytics (mobile)

### Constat
Sur mobile, `DRCInteractiveMap.tsx` utilise un état `activeMobilePanel: 'map' | 'analytics'` piloté uniquement par 2 boutons fixes en bas d'écran. Aucun geste de balayage horizontal n'est disponible — l'utilisateur doit obligatoirement viser ces boutons pour basculer.

### Solution
Ajouter un détecteur de swipe horizontal (touch + pointer events) qui bascule `activeMobilePanel` entre `'map'` et `'analytics'`, sans modifier la disposition (chaque panneau reste plein écran avec `hidden`/`flex`). Pas de carrousel, pas de translation animée du conteneur — animation visuelle assurée par un fade léger sur le panneau entrant.

### Comportement
- **Swipe gauche** (doigt va de droite vers gauche) sur le panneau **Carte** → bascule vers **Analytics**.
- **Swipe droite** (doigt va de gauche vers droite) sur le panneau **Analytics** → bascule vers **Carte**.
- Seuils : déplacement horizontal ≥ 60 px ET ratio |dx| > 1.5 × |dy| (pour ne pas confler avec le scroll vertical des KPI/charts).
- Désactivation automatique :
  - Sur viewport ≥ `lg` (les deux panneaux sont visibles côte à côte).
  - Quand l'utilisateur interagit avec la carte SVG (zoom/pan tactile sur `DRCMapWithTooltip`, `DRCCommunesMap`, etc.) — le swipe est ignoré si la cible du `touchstart` est dans un élément `[data-map-svg]` ou possède l'attribut `role="img"` SVG.
  - Quand un menu/Popover/ScrollArea horizontal est ouvert (détection via `closest('[data-radix-popper-content-wrapper]')`).
- Retour haptique léger (`navigator.vibrate?.(15)`) à la bascule, si supporté.
- Respect de `prefers-reduced-motion` : pas d'animation de transition supplémentaire.

### Implémentation

**1. Nouveau hook `useSwipeNavigation`** — `src/hooks/useSwipeNavigation.ts`
- Signature : `useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = 60, enabled = true, ignoreSelector?: string })` → retourne un `ref` à attacher au conteneur.
- Écoute `touchstart`/`touchmove`/`touchend` (passive). Calcule `dx`, `dy` au `touchend` ; déclenche le callback approprié si seuil + ratio respectés et si la cible n'est pas dans `ignoreSelector`.
- Retourne aussi un état `isSwiping` non utilisé ici (réservé pour un éventuel feedback visuel futur).

**2. Intégration dans `DRCInteractiveMap.tsx`**
- Importer le hook + `useIsMobile`.
- Branchement :
  ```ts
  const swipeRef = useSwipeNavigation({
    enabled: isMobile,
    ignoreSelector: '[data-no-swipe], svg[role="img"], [role="dialog"], [data-radix-popper-content-wrapper]',
    onSwipeLeft: () => setActiveMobilePanel('analytics'),
    onSwipeRight: () => setActiveMobilePanel('map'),
  });
  ```
- Attacher `ref={swipeRef}` au conteneur racine (`<div className="w-full h-full flex flex-col overflow-hidden relative">`, ligne 304).
- Marquer le wrapper SVG carte avec `data-no-swipe` (lignes 354, 384, 399, 412) pour préserver le pan/zoom carte tactile.
- Ajouter `animate-fade-in` (déjà dans le design system) sur les deux conteneurs colonne mobile (`Colonne gauche` ligne 323 et `Colonne droite` ligne 573) via une `key={activeMobilePanel}` côté wrapper mobile pour rejouer l'anim à chaque bascule.

**3. Hint visuel discret (one-shot)**
- Au premier affichage mobile (`localStorage` flag `swipe-hint-shown`), afficher pendant ~2 s un toast léger : « Glissez horizontalement pour basculer Carte ↔ Analytics ». Utilise le système de toast déjà présent (sonner). Pas de tutoriel intrusif.

### Sécurité, perfo & a11y
- Listeners `passive: true` sauf `touchend` — pas de blocage du scroll.
- Aucun event global `window` : tout est scoped au conteneur via `ref`.
- Le hook nettoie les listeners au démontage.
- Les boutons existants restent disponibles → pas de régression a11y clavier (le swipe est un complément, pas un remplacement).
- `aria-live="polite"` sur le bouton actif pour annoncer le changement de panneau aux lecteurs d'écran.

### Hors scope
- Pas de carrousel translaté (Embla/Swiper) — surcoût injustifié pour 2 vues plein écran.
- Pas de geste vertical (ne change pas le panneau « détails »).
- Pas de modification de `CadastralMap` (autre route — peut être généralisé plus tard si demandé).

### Fichiers impactés
- `src/hooks/useSwipeNavigation.ts` (nouveau, ~60 lignes)
- `src/components/DRCInteractiveMap.tsx` — branchement hook, attribut `data-no-swipe`, `key` mobile, hint toast
- `mem://features/land-data-analytics/interactive-map-layers-fr` — note ajout swipe mobile

