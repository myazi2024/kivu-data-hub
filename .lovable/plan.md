

# Rendre la barre de recherche et la légende dynamiquement responsives

## Constat

La barre de recherche et le bloc légende utilisent des valeurs positionnelles codées en dur (ex: `w-96`, `top-16`, `bottom: 12rem/15rem/30rem`, `max-w-[220px]`) et un breakpoint unique (`isMobile` = 768px via `md:`). Cela crée des problèmes sur les tailles d'écran intermédiaires (tablettes, petits laptops) et ne s'adapte pas fluidement au redimensionnement.

### Problèmes identifiés

**Barre de recherche (`CadastralMap.tsx` L982-1277)** :
- Largeur fixe `w-96` (384px) en desktop — déborde sur petits écrans non-mobile (768-900px)
- `max-w-[220px]` sur l'input mobile — trop étroit sur tablettes (768-1024px)
- Position inactive (`translate-y-[calc(100dvh-12rem)]`) — valeur fixe inadaptée aux différentes hauteurs d'écran
- Padding, taille des boutons et taille du texte ne s'adaptent qu'avec un switch binaire `isMobile`

**Légende (`CadastralMap.tsx` L1458-1535)** :
- Desktop : position fixe `top-16 right-3` — peut chevaucher la barre de recherche sur écrans étroits
- Mobile : `bottom` calculé avec des `rem` fixes (`12rem`, `15rem`, `30rem`) selon l'état — pas de calcul dynamique basé sur la taille réelle de l'écran
- Le breakpoint `md:hidden` / `hidden md:block` est abrupt — pas de transition entre les deux modes

## Modifications

### Fichier : `src/pages/CadastralMap.tsx`

**a) Barre de recherche — largeur responsive** :
- Remplacer `w-96` par `w-[min(24rem,calc(100vw-1.5rem))]` en desktop pour ne jamais déborder
- Supprimer `max-w-[220px]` sur l'input mobile — utiliser `flex-1` partout pour que l'input prenne toute la largeur disponible
- Ajouter des breakpoints Tailwind intermédiaires (`sm:`, `lg:`) pour les paddings et tailles de boutons

**b) Barre de recherche — position inactive responsive** :
- Remplacer `translate-y-[calc(100dvh-12rem)]` par une position calculée dynamiquement avec un state `windowHeight` via un `useEffect` + `resize` listener
- Ou utiliser `bottom-20` au lieu de `top-3 + translate-y` pour positionner la barre en bas quand inactive

**c) Légende — positionnement dynamique** :
- Desktop : remplacer `top-16` par `top-3` et ajouter un `max-h-[calc(100vh-8rem)] overflow-auto` pour que la légende ne déborde pas
- Mobile : calculer la position `bottom` dynamiquement en fonction de la hauteur du viewport via `dvh` ou un state `windowHeight` plutôt que des valeurs `rem` fixes
- Utiliser `bottom-[calc(100dvh-var(--legend-offset))]` ou simplement ancrer relativement au panneau sélectionné

**d) Zoom Leaflet — dynamique aussi** :
- Les marges du contrôle zoom (`margin-bottom` dans `<style>`) utilisent les mêmes `rem` fixes — les aligner avec la nouvelle logique responsive

**e) Ajouter un listener `resize`** :
- Un seul `useEffect` avec `window.addEventListener('resize', ...)` pour mettre à jour un state `viewportHeight` utilisé par la barre de recherche, la légende et le zoom control
- Debouncer le resize pour éviter les re-renders excessifs

### Détails techniques

- Nouveau state : `const [viewportHeight, setViewportHeight] = useState(window.innerHeight)`
- Hook resize avec debounce 150ms
- Calculs de position basés sur `viewportHeight` au lieu de `rem` fixes
- La barre de recherche inactive se positionne à `viewportHeight - 180` px du haut
- La légende mobile se positionne à `viewportHeight - (selectedParcel ? (actionsExpanded ? 480 : 240) : 192)` px du haut

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/pages/CadastralMap.tsx` | Responsive search bar + legend + zoom controls |

**Impact** : ~40 lignes modifiées dans 1 fichier. Aucune migration.

