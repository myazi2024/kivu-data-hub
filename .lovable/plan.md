

## Refonte complète — Swipe slide mobile (Carte RDC ⇄ Analytics)

Reconstruction from scratch, inspirée des UX modernes (iOS Pages, Instagram Stories, App Store). Le principe : un **carousel pager** où le doigt déplace les pages **en temps réel**, avec snap intelligent, vélocité physique et feedback continu.

---

### 1. Principes directeurs

- **Le doigt EST la page** : pas de threshold artificiel pour commencer le mouvement. Dès que l'utilisateur pose le doigt et bouge horizontalement, les deux panneaux suivent à 1:1.
- **Décision au relâchement** : snap vers la page la plus proche, pondéré par la vélocité (flick court = bascule, drag lent = retour si <50%).
- **Continuité visuelle absolue** : aucun cut, aucun fade. Une seule transformation `translateX` pilotée par un seul state.
- **Découvrabilité native** : un teaser d'amorce au mount (les deux pages "rebondissent" de 12px à droite puis reviennent) — comme Instagram quand tu ouvres un nouveau profil.
- **Zéro conflit** : la carte SVG reste tappable, le scroll vertical Analytics reste natif, pinch-zoom intact.

---

### 2. Nouvelle architecture

#### A. Nouveau hook `useSwipePager` (remplace `useSwipeNavigation`)

Pattern fondamentalement différent — on ne détecte plus un "swipe", on suit un **drag continu** :

```ts
useSwipePager({
  pageCount: 2,
  index: activeMobilePanel === 'analytics' ? 1 : 0,
  onIndexChange: (i) => setActiveMobilePanel(i === 1 ? 'analytics' : 'map'),
  enabled: isMobile,
  ignoreSelector: '...',
})
→ returns { ref, dragOffset, isDragging, pageWidth }
```

Logique interne :
- **`pointerdown`** : capture position, mémorise `startX`, marque `isDragging=true` après 8px de mouvement horizontal (lock). Si vertical d'abord → relâche.
- **`pointermove`** (rAF throttled) : `dragOffset = currentX - startX`, clampé avec **rubber-band aux extrémités** (résistance exponentielle si on tire au-delà de la dernière page).
- **`pointerup`** : décision physique :
  - distance parcourue ≥ 25% largeur écran → snap à la page suivante
  - vélocité ≥ 0.4 px/ms (flick) → snap dans la direction du flick, peu importe la distance
  - sinon → snap retour
- **Anti-clic fantôme** : si `isDragging` a été vrai, capture le prochain `click` (déjà OK).
- **Pointer Capture** (`setPointerCapture`) : garantit la continuité même si le doigt sort du conteneur.

#### B. Layout simplifié (une seule transformation)

```tsx
<div ref={pagerRef} className="relative h-full overflow-hidden touch-pan-y">
  <div
    className="flex h-full"
    style={{
      width: '200%',
      transform: `translate3d(calc(${-index * 50}% + ${dragOffset}px), 0, 0)`,
      transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(.22,.61,.36,1)',
      willChange: 'transform',
    }}
  >
    <section className="w-1/2 shrink-0">…carte + détails…</section>
    <section className="w-1/2 shrink-0">…analytics…</section>
  </div>
</div>
```

- `touch-pan-y` sur le conteneur : autorise le scroll vertical natif, intercepte uniquement le pan horizontal. Élimine 90 % des conflits scroll/swipe sans code.
- `translate3d` : composite GPU, 60 fps garantis.
- Une seule source de vérité de position : `index + dragOffset`.

#### C. Page indicator moderne (style iOS)

Sous les boutons mobiles :
- 2 dots fluides qui s'**étirent en barre** au fur et à mesure du drag (pas binaire).
- La largeur de la barre active = `interpolate(dragProgress, 0..1, 16px..6px)` pour la dot qui rétrécit, et inverse pour celle qui grandit.
- Animation pure CSS pilotée par la même variable `dragOffset`.

#### D. Teaser de découvrabilité (au mount, une seule fois)

Au lieu d'un toast textuel, **un mouvement physique** plus mémorable :
- 600ms après le mount, si jamais vu : on anime `dragOffset` de `0 → -32px → +16px → 0` sur 900ms (easeOutBack).
- L'utilisateur voit littéralement la page Analytics "pointer le bout de son nez" puis revenir.
- Persistance `localStorage('drc-pager-teaser-seen')`.
- Skip si `prefers-reduced-motion`.

---

### 3. Boutons & accessibilité (conservés, simplifiés)

- Boutons Carte/Analytics restent (a11y + desktop fallback) → ils déclenchent juste `setIndex(0|1)`, le hook anime tout seul.
- `role="tablist"` sur les dots, `aria-selected` synchronisé.
- Focus management : après animation (320ms), focus sur le titre du panneau actif.
- Reset scroll Analytics à chaque arrivée sur la page 1.

---

### 4. Performance

- Une seule div bouge, transform GPU, pas de re-render React pendant le drag (state interne du hook via `useRef` + `requestAnimationFrame` qui pousse une CSS variable directement sur le DOM).
- Optionnel : exposer `dragOffset` via **CSS variable** (`el.style.setProperty('--drag-x', ...)`) plutôt que via state React → zéro re-render pendant le geste.
- Les cartes lourdes (`DRCMapWithTooltip`, etc.) restent montées (nécessaire pour la continuité visuelle pendant le slide).

---

### 5. Suppression de l'existant

- Hook `useSwipeNavigation.ts` → **remplacé** par `useSwipePager.ts` (ancien supprimé, aucun autre consommateur dans le projet).
- État `hintShown` + toast `sonner` d'astuce → **supprimés** (remplacés par teaser physique).
- Edge glow indicator → **supprimé** (redondant avec le slide continu visible).
- Rubber-band actuel cappé à 40px → **remplacé** par rubber-band physique aux extrémités uniquement (pas au centre).
- `direction: 'left' | 'right'` → **supprimé** (le pager gère naturellement les deux sens).

---

### 6. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/hooks/useSwipePager.ts` | **CRÉÉ** — nouveau hook pager |
| `src/hooks/useSwipeNavigation.ts` | **SUPPRIMÉ** |
| `src/components/DRCInteractiveMap.tsx` | Refactor : layout pager, suppression hint toast/edge glow, dots fluides, teaser mount |
| `mem://features/land-data-analytics/interactive-map-layers-fr` | Mise à jour : nouvelle architecture pager |

---

### 7. Critères d'acceptation

1. **Drag 1:1** : poser le doigt et bouger latéralement déplace les deux panneaux instantanément, sans lag ni délai.
2. **Snap intelligent** : drag à 30% de largeur + relâche → bascule. Drag à 15% + relâche → retour. Flick rapide même à 5% → bascule.
3. **Aucun conflit** : scroll vertical Analytics fluide, tap province sélectionne, pinch-zoom carte intact.
4. **Teaser mount** : au 1er chargement mobile, la page Analytics "peek" 800ms après affichage, jamais re-déclenché.
5. **Dots fluides** : les indicateurs s'étirent progressivement pendant le drag, pas en escalier.
6. **60 fps** : pas de jank perceptible même sur device milieu de gamme (transform GPU).
7. **Boutons fonctionnels** : tap sur Carte/Analytics anime la transition (320ms), pas de cut.
8. **Reduced motion** : transition raccourcie à 0ms, pas de teaser.

