

## Audit — Swipe mobile entre Carte RDC et Analytics

### 1. Architecture actuelle

**Fichiers clés**
- `src/hooks/useSwipeNavigation.ts` — hook v2 (touchstart/move/end avec rAF, vélocité, garde directionnelle, anti-clic fantôme)
- `src/components/DRCInteractiveMap.tsx` — branchement du hook sur le conteneur racine, état `activeMobilePanel: 'map' | 'details' | 'analytics'`, hint one-shot via localStorage

**Configuration en place**
- `enabled: isMobile`
- `direction: onAnalyticsPanel ? 'right' : 'left'` (garde directionnelle bidirectionnelle)
- `ignoreSelector` ciblé : `[data-swipe-ignore]`, dialogs Radix, `button`, `a`, `input`, `textarea`, `select`
- Feedback visuel : rubber-band ±24px (15% du delta), pagination dots, edge glow, vibration 15ms
- Hint contextuel : toast `sonner` à la 1ère bascule, persistance `localStorage('drc-map-swipe-hint-shown')`
- Respect `prefers-reduced-motion` pour rubber-band et glow

### 2. Points forts

| Aspect | Statut |
|---|---|
| Détection tap vs swipe (threshold 45px / flick 30px @ 0.5px·ms⁻¹) | OK |
| Annulation précoce sur geste vertical (`dy>10` + `dy>dx`) | OK |
| Anti-clic fantôme post-swipe (capture click 400ms) | OK |
| Garde directionnelle empêchant double-bascule | OK |
| Throttling rAF pendant `touchmove` | OK |
| Callback ref pattern (pas de re-bind) | OK |
| Rétro-compatibilité boutons + accessibilité (`role=tablist`, `aria-label`) | OK |
| Documentation mémoire à jour | OK |

### 3. Faiblesses identifiées

**A. Cohérence d'état panneau**
- L'état est `'map' \| 'details' \| 'analytics'` mais seules deux valeurs sont réellement utilisées sur mobile. La valeur `'details'` est morte → ambiguïté.
- La condition rubber-band `!onAnalyticsPanel` traite `'details'` comme `'map'`, mais le bouton ne la sélectionne jamais.

**B. Perte de contexte au swipe**
- Aucun retour à `rdc-map` ni reset du scroll Analytics quand on bascule. Un utilisateur qui a scrollé Analytics revient au même endroit, ce qui peut sembler cassé.
- Pas de focus management : après bascule, le focus clavier reste sur l'élément précédent (problème a11y).

**C. Hint one-shot trop discret**
- Le toast s'affiche **après** le 1er swipe réussi, donc l'utilisateur qui n'a jamais swipé ne le voit jamais. Aucune découvrabilité initiale.
- Aucune animation d'amorce sur les pagination dots ni sur les boutons pour suggérer le geste.

**D. Conflits potentiels avec interactions carte**
- Le tap sur une province SVG `<path>` n'est pas dans `ignoreSelector` (correct, car il faut pouvoir distinguer tap court vs swipe). Mais le seuil 45px peut être ressenti court sur écran 360px de large (12,5% de la largeur). Risque de bascule accidentelle quand l'utilisateur veut juste explorer une province.
- Le pinch-zoom natif (2 doigts) reset correctement (`e.touches.length !== 1`), mais aucun test de `e.scale` pour pincements lents.

**E. Edge cases hook**
- `setTimeout` retire le listener `click` de manière non-référencée à `removeEventListener` avec `{ capture: true } as any` — fonctionnel mais fragile (le listener est `{ once: true }`, donc le timeout est de toute façon redondant).
- Pas de `pointercancel` ni gestion des stylets/souris (uniquement `touch*`). Sur tablette avec stylet → swipe ignoré.
- `navigator.vibrate?.(15)` peut échouer silencieusement sur iOS Safari (pas supporté) — pas un bug mais inutile.

**F. Performance**
- 4 cartes lourdes (`DRCMapWithTooltip`, `DRCCommunesMap`, `DRCQuartiersMap`, `DRCTerritoiresMap`) restent montées même quand `activeMobilePanel === 'analytics'` (uniquement `hidden`). Coût mémoire pour rien sur mobile.
- `ProvinceDataVisualization` également monté en permanence côté droit.

**G. UX visuelle**
- Le `rubber-band` capé à 24px est très subtil sur écran 360px (6,7%). À peine perceptible vs concurrence (Instagram, App Store ≈ 25–30%).
- Pas de transition slide horizontale entre les deux panneaux : on a un `hidden` brutal au moment de la bascule (les `animate-fade-in` s'enchaînent mais ne donnent pas l'impression d'un swipe continu).

### 4. Recommandations priorisées

**P0 — Découvrabilité (impact UX max)**
- Afficher le hint **une seule fois au montage** (pas après le 1er swipe), avec un délai 800ms. Garder le `localStorage` flag.
- Ajouter une animation pulse subtile sur la dot du panneau opposé pendant 1.5s au montage si jamais swipé.

**P1 — Continuité visuelle**
- Remplacer `hidden / animate-fade-in` par une vraie translation horizontale : conteneur 200% largeur, `translateX(0 \| -50%)` avec `transition: transform 250ms cubic-bezier(.2,.8,.2,1)`. Élimine le snap visuel.
- Augmenter le rubber-band cap à 40px (≈11%) pour un retour tactile plus net.

**P2 — Robustesse & performance**
- Supprimer la valeur morte `'details'` du type `activeMobilePanel`.
- Conditionner le montage des cartes lourdes : `{!isMobile || activeMobilePanel !== 'analytics' ? <maps/> : null}` (re-render au switch acceptable car cache GeoJSON + React Query).
- Ajouter un reset scroll Analytics + focus management au switch (`scrollTop = 0` sur `ScrollArea`, focus sur titre Analytics).
- Étendre le hook à `pointer events` (pointerdown/move/up) pour couvrir stylet + souris, fallback `touch` si non supporté.
- Nettoyer le `setTimeout` redondant dans `useSwipeNavigation.ts` (le `{ once: true }` suffit).

**P3 — Confort tactile**
- Augmenter `threshold` à 60px sur écran < 400px de large pour réduire les bascules accidentelles depuis un tap sur province.
- Ajouter un seuil temporel min (ex: ne pas déclencher si geste < 80ms) pour filtrer les flicks parasites.

### 5. Verdict global

**État** : Fonctionnel, robuste sur les fondations (anti-clic fantôme, garde directionnelle, rAF throttling, a11y boutons). 

**Manque** : Découvrabilité du geste et continuité visuelle de la transition. La fonctionnalité fonctionne mais ne se *sent* pas premium parce que (1) l'utilisateur ne sait pas qu'elle existe avant d'avoir swipé, et (2) la bascule est un cut, pas un slide.

**Recommandation** : Traiter d'abord P0 (hint au montage + pulse dot) et P1 (slide horizontal continu). P2/P3 peuvent suivre selon retours utilisateurs.

### Fichiers concernés (si correctifs validés)
- `src/components/DRCInteractiveMap.tsx` — hint au mount, slide layout, suppression `'details'`, conditional mount, scroll reset
- `src/hooks/useSwipeNavigation.ts` — pointer events, threshold adaptatif, nettoyage timeout
- `mem://features/land-data-analytics/interactive-map-layers-fr` — mise à jour notes

