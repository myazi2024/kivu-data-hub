

## Optimisation du swipe mobile Carte ↔ Analytics

### Constat
Le hook `useSwipeNavigation` actuel fonctionne mais souffre de plusieurs limitations qui dégradent la perception d'optimisation :

1. **Aucun feedback visuel pendant le geste** — le doigt glisse sans que le panneau ne suive. L'utilisateur ne sait pas si le swipe est détecté tant qu'il n'a pas relâché.
2. **Détection tardive** — le calcul ne se fait qu'au `touchend`. Pas d'annulation anticipée si le geste devient vertical → conflit avec le scroll des analytics.
3. **Seuils rigides** — 60 px fixe sans tenir compte de la vélocité du geste (un flick rapide court devrait suffire).
4. **Pas de garde directionnelle** — un swipe gauche sur le panneau Analytics (déjà à droite) déclenche quand même `onSwipeLeft` sans effet, gaspillant la vibration.
5. **Re-création du listener à chaque rendu** — les callbacks `onSwipeLeft/Right` changent de référence à chaque render de `DRCInteractiveMap`, déclenchant le `useEffect` et rebranchant les listeners en boucle.
6. **`touchmove` absent** — pas de détection précoce d'un geste vertical dominant pour libérer le scroll natif.
7. **Pas d'indicateur de progression** — aucun hint visuel (pagination dots, edge glow) ne montre qu'il y a 2 vues navigables.

### Optimisations proposées

**A. Hook `useSwipeNavigation` v2 — détection intelligente**
- Ajout d'un handler `touchmove` qui :
  - Calcule `dx`/`dy` en continu.
  - **Annule** le swipe (`active = false`) dès que `|dy| > 10 px ET |dy| > |dx|` → libère le scroll vertical natif sans latence.
  - Expose `isSwiping` + `swipeDelta` (état React) pour permettre un feedback visuel optionnel.
- **Détection par vélocité** : si `|dx| / dt > 0.5 px/ms` (flick rapide), seuil abaissé à 30 px ; sinon seuil normal 60 px. Stocke `startTime = performance.now()` au touchstart.
- **Garde directionnelle** : nouvelle option `direction?: 'left' | 'right' | 'both'` — ignore les swipes dans la direction non pertinente (ex: panneau Carte n'écoute que `left`, panneau Analytics n'écoute que `right`).
- **Stabilisation des callbacks** : utiliser `useRef` interne pour stocker les callbacks → le `useEffect` ne dépend plus que de `enabled`, `threshold`, `ignoreSelector`. Plus de rebranchement intempestif.
- **Annulation au scroll** : écouter `touchcancel` pour reset proprement.

**B. Feedback visuel pendant le geste** (`DRCInteractiveMap.tsx`)
- Pendant `isSwiping` actif (dx significatif), appliquer un léger `transform: translateX(${dx * 0.15}px)` sur le panneau actif (effet « rubber band » iOS, max 24 px).
- Au `touchend` réussi : transition fluide `translateX(0)` + bascule du panneau.
- Au `touchend` annulé : retour `translateX(0)` avec spring (300 ms `ease-out`).
- Désactivé si `prefers-reduced-motion`.

**C. Indicateurs de page (pagination dots)**
- Ajouter au-dessus des deux boutons mobiles existants une rangée de 2 points (`•  •`) reflétant `activeMobilePanel`. Le point actif est `bg-primary w-4`, l'inactif `bg-muted w-1.5`. Transitions 200 ms.
- Position : centré au-dessus de la barre de boutons (ou intégré dedans).

**D. Edge glow discret au bord**
- Quand `isSwiping` et la direction est valide, afficher un dégradé léger (`bg-gradient-to-r from-primary/10 to-transparent`, largeur 16 px) au bord opposé indiquant la direction de bascule.
- Disparaît à la fin du geste.

**E. Tuning des seuils**
- Threshold par défaut : **45 px** (plus réactif que 60 px sur mobile compact 360 px).
- Ratio dx/dy passé de 1.5 à **1.2** (plus tolérant aux gestes diagonaux légers).
- Vélocité flick : **0.5 px/ms** → seuil 30 px.

**F. Bug d'instabilité du `useEffect` (priorité)**
Actuellement les fonctions `onSwipeLeft`/`onSwipeRight` sont recréées à chaque render de `DRCInteractiveMap` (closures inline). Le `useEffect` du hook se re-déclenche → listeners ajoutés/retirés en permanence → micro-perte de gestes lorsque le re-render coïncide avec un `touchstart`. **Correction via callback ref pattern** : stocker les callbacks dans un `useRef` mis à jour à chaque render (sans déclencher le effect), et lire `cbRef.current.onSwipeLeft()` dans les handlers.

### Sécurité, perfo, a11y
- `touchmove` reste `passive: true` → pas de blocage scroll.
- `requestAnimationFrame` pour throttler les mises à jour de `swipeDelta` (évite jank).
- `prefers-reduced-motion` : pas de translation rubber-band, pas d'edge glow, juste la bascule sèche.
- Boutons de bascule conservés (a11y clavier inchangée).
- `aria-live="polite"` déjà présent sur les boutons → annonce du changement de panneau aux lecteurs d'écran.

### Hors scope
- Pas de carrousel translaté plein conteneur (Embla) — le rubber band suffit comme feedback.
- Pas de gestion 3 panneaux ou plus — limité à `'map' | 'analytics'`.
- Pas de modification des autres routes (`CadastralMap`, etc.).

### Fichiers impactés
- `src/hooks/useSwipeNavigation.ts` — refonte (touchmove, vélocité, direction, callback ref, isSwiping/swipeDelta exposés)
- `src/components/DRCInteractiveMap.tsx` — branchement v2, transform rubber band, pagination dots, edge glow, suppression callbacks inline
- `mem://features/land-data-analytics/interactive-map-layers-fr` — note swipe v2 optimisé

