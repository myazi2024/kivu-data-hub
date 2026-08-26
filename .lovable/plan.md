# Carte cadastrale — barre de recherche rognée en bas (desktop)

## Constat (vérifié)
- `src/pages/CadastralMap.tsx` :
  - `<main>` a `height: calc(100dvh - 4rem)` + `overflow-hidden` (lignes 266–274).
  - Le conteneur Leaflet est `absolute inset-0` (ligne 284), donc sa hauteur = `100dvh - 4rem`.
  - La barre de recherche (overlay) est `absolute` dans ce même `<main>` (lignes 322–328).
  - À l'état inactif, son `top` vaut `Math.max(viewportHeight - 180, 12)` où `viewportHeight` vient de `window.innerHeight` (lignes 95–104, 326).
- Problème : `viewportHeight` = hauteur de la **fenêtre**, mais la barre est positionnée dans un conteneur haut de `100dvh - 4rem`. Elle dérive donc de ~4rem (64px) vers le bas. Sa marge réelle par rapport au bord bas du conteneur tombe à ~4px ; dès que la carte de recherche est un peu plus haute (toggle « N° parcelle / N° titre » sur 2 lignes, rangée input + Avancée + Titre qui s'étire), le bas est rogné par le `overflow-hidden` du `<main>`.
- Le commentaire ligne 270 indique déjà l'intention « no JS viewport math » pour le zoom — la barre de recherche est l'exception restante.

## Correctif
Remplacer le calcul basé sur `window.innerHeight` par un positionnement **relatif au conteneur**, mesuré dynamiquement, avec une marge basse explicite. Conserver le glissement existant (`transition: top 0.3s ease`).

### Implémentation (`src/pages/CadastralMap.tsx`)
1. Ajouter un `searchCardRef` sur la carte interne de la barre de recherche (la `div` ligne 329).
2. Suivre la hauteur réelle du conteneur Leaflet (qui = hauteur du `<main>`) via un `ResizeObserver` sur `mapContainerRef` → état `mapContainerHeight` (remplace `viewportHeight` pour ce calcul). Conserver le `ResizeObserver` existant sur `window` uniquement s'il sert ailleurs ; sinon le supprimer.
3. Suivre la hauteur réelle de la carte de recherche via un `ResizeObserver` sur `searchCardRef` → état `searchCardHeight`.
4. Calculer le `top` inactif dynamiquement :
   ```text
   const BOTTOM_MARGIN = 24; // 1.5rem, libère l'attribution Leaflet
   const inactiveTop = Math.max(mapContainerHeight - searchCardHeight - BOTTOM_MARGIN, 12);
   top = (isSearchBarActive || selectedParcel) ? '0.75rem' : `${inactiveTop}px`
   ```
   - `searchCardHeight` vaut 0 au premier rendu : retomber sur une borne supérieure (ex. 160px) tant que la mesure n'est pas disponible, pour ne pas coller au bord.
5. Conserver `transition: 'top 0.3s ease, transform 0.3s ease'` et le comportement actif/selected (`top: 0.75rem`).
6. Mobile inchangé (`right-3 top-3`).

### Résultat attendu
- La barre de recherche reste entièrement visible en bas à gauche, avec une marge basse de 24px.
- Elle s'adapte dynamiquement à la hauteur réelle du conteneur (resize, orientation, hauteur de nav variable) — plus de dérive liée à `window.innerHeight`.
- Le glissement haut/bas au focus/sélection conserve son animation.

## Hors périmètre
- Pas de modification du comportement de recherche, des suggestions, ni de la logique métier.
- Pas de modification mobile.
