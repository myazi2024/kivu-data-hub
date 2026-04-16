

# Auto-masquage du bloc de filtres Analytics au repos

## Objectif

Le bloc de filtres (Temps + Lieu) en haut de chaque visuel doit disparaître automatiquement après une période d'inactivité du curseur, puis réapparaître dès que l'utilisateur bouge la souris.

## Approche

Modifier uniquement `src/components/visualizations/filters/AnalyticsFilters.tsx` :

1. **Ajouter un état `visible`** (défaut `true`) et un timer `useRef`
2. **Écouter `onMouseMove`** sur le conteneur parent (`space-y-1 ... sticky`) — à chaque mouvement, remettre `visible = true` et relancer un timer de ~3 secondes
3. **Au timeout**, passer `visible = false`
4. **Appliquer une transition CSS** sur le wrapper : `opacity-0 max-h-0 overflow-hidden` quand masqué, `opacity-100 max-h-40` quand visible, avec `transition-all duration-300`
5. **Écouter `onMouseEnter`** pour réafficher immédiatement quand le curseur entre dans la zone (même cachée — garder une fine bande de détection en `min-h-[4px]`)

## Détail technique

```tsx
// Dans AnalyticsFilters.tsx
const [visible, setVisible] = useState(true);
const timerRef = useRef<ReturnType<typeof setTimeout>>();

const handleMouseActivity = useCallback(() => {
  setVisible(true);
  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => setVisible(false), 3000);
}, []);

useEffect(() => {
  // Start idle timer on mount
  timerRef.current = setTimeout(() => setVisible(false), 3000);
  return () => clearTimeout(timerRef.current);
}, []);
```

Le wrapper principal passe de :
```tsx
<div className="space-y-1 bg-background/95 ... sticky top-0 z-10">
```
à :
```tsx
<div 
  className={`... sticky top-0 z-10 transition-all duration-300 ${
    visible ? 'opacity-100 max-h-40 py-1.5' : 'opacity-0 max-h-1 py-0 overflow-hidden'
  }`}
  onMouseMove={handleMouseActivity}
  onMouseEnter={handleMouseActivity}
>
```

Le `onMouseMove` est aussi ajouté sur le **parent** englobant (le `div.space-y-2` dans chaque bloc) pour détecter le mouvement même quand les filtres sont masqués. Pour cela, on wrappera le contenu de `AnalyticsFilters` dans un div qui écoute le mouvement sur toute la zone du bloc, via un **second wrapper invisible** en position absolute couvrant le parent.

**Alternative plus simple** : écouter `mousemove` sur `document` dans le composant. Cela évite de modifier les 13 blocs.

## Fichier modifié

| Fichier | Changement |
|---------|------------|
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | Ajouter logique auto-hide avec `mousemove` sur `document`, transition CSS |

Un seul fichier modifié, aucun changement dans les blocs.

