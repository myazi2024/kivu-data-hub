# Audit Carte Cadastrale — non-affichage

## Constats

### Front-end

1. **Conteneur de carte sans hauteur garantie** (`src/pages/CadastralMap.tsx`)
  - Le `<main>` a `flex-1 + height: calc(100dvh - 4rem)`. Le `<div ref={mapContainerRef}>` interne a `height: 100%`.
  - Sur mobile (360×556 actuel), `100dvh - 4rem` peut tomber à ~492 px ; OK en théorie, mais le div n'est rendu que dans la branche `!loading`. Si `useCadastralMapData` reste en loading (RLS qui rejette, requête lente, erreur réseau silencieuse), on n'affiche QUE le spinner et la carte n'a jamais de conteneur — donc pas de tuiles.
2. **Init de Leaflet conditionnée à `ready: !loading**` (`useLeafletMap.tsx`)
  - L'effet ne s'exécute qu'après que `loading` passe à `false` ET que le ref soit attaché ; en cas d'erreur silencieuse de la query parcelles, `loading` reste `true` (en réalité React Query met `isLoading=false` sur error mais `data=undefined`, ici converti à `[]` — donc devrait débloquer). À vérifier en réel.
3. `**useMapProvider` recrée `getTileUrl/getTileLayerOptions` à chaque render** : l'effet d'application des tuiles a ces fonctions dans ses dépendances → re-création/destruction du tileLayer en boucle, peut entraîner une carte grise tant que les tuiles ne sont pas re-téléchargées (flicker).
4. **Listener resize sans `dvh**` : `viewportHeight` (window.innerHeight) est utilisé pour positionner la barre de recherche desktop ; sans incidence sur la carte elle-même.
5. `**ProtectedRoute**` : si la session n'est pas chargée, on voit l'écran d'auth (capture confirme : sur la nav vers `/cadastral-map` la page renvoyée est l'écran de connexion). À confirmer côté utilisateur que la session est active.

### Back-end

6. `**map_providers**` : OSM est le défaut (`is_default=true, requires_api_key=false`) — les tuiles devraient charger sans le proxy. Mapbox actif mais non défaut.
7. **Edge function `proxy-mapbox-tiles**` : l'URL construite par `useMapProvider.getTileUrl()` ne préserve pas l'extension `.png` (`.../tiles/{z}/{x}/{y}` sans `.png`). Mapbox accepte cela, mais Leaflet peut envoyer une requête sans extension qu'un proxy strict pourrait refuser. Le whitelist actuel autorise `(\.\w+)?` donc OK.
8. **RLS sur `cadastral_parcels**` : si l'utilisateur n'a pas accès, la requête `useCadastralMapData` peut renvoyer 0 lignes sans erreur — la carte s'initialise mais reste vide (aucune fitBounds, vue par défaut Goma). À vérifier.
9. **Realtime channel `map_providers_changes**` : abonnement créé sans cleanup conditionnel (OK ici, mais peut empiler les channels en HMR).

## Plan de correction

### 1. Front-end — sortir le conteneur de la branche conditionnelle

Toujours rendre le `<div ref={mapContainerRef}>` ; n'afficher le spinner qu'en overlay :

```tsx
<div ref={mapContainerRef} className="absolute inset-0" />
{loading && (
  <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-sm">
    <Loader2 ... />
  </div>
)}
```

→ garantit que Leaflet a toujours un conteneur dimensionné, indépendamment de l'état query.

### 2. Stabiliser `useMapProvider`

Mémoïser `getTileUrl` et `getTileLayerOptions` avec `useCallback` (dépendances : `provider`). Évite la re-création du tileLayer à chaque render.

### 3. Forcer `invalidateSize` après mount

Dans `useLeafletMap`, après l'init et à chaque changement de `selectedParcel`/`actionsExpanded` (qui change la hauteur via CSS var), appeler `map.invalidateSize()` pour que Leaflet recalcule. Ajouter aussi un `ResizeObserver` sur le conteneur.

### 4. Logguer les erreurs query

Dans `useCadastralMapData`, exposer `error` et l'afficher dans une bannière non-bloquante quand la requête échoue (au lieu d'avoir une carte muette).

### 5. Vérification back-end

- `SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL` (s'assurer qu'il y a des données non-test).
- Vérifier les policies RLS de `cadastral_parcels` : autorisent-elles un utilisateur authentifié non-admin ? (lecture publique attendue d'après l'usage).
- Tester `proxy-mapbox-tiles` (logs récents) si l'utilisateur a basculé sur Mapbox dans Admin > Carte.

### 6. Vérification de session

Confirmer auprès de l'utilisateur s'il est bien connecté (notre reproduction tombe sur l'écran de login). Si non, l'écran d'auth est attendu et il n'y a pas de bug ; sinon on poursuit les fixes 1-4.

## Fichiers touchés

- `src/pages/CadastralMap.tsx` (overlay loader + conteneur permanent)
- `src/hooks/useLeafletMap.tsx` (invalidateSize + ResizeObserver)
- `src/hooks/useMapProvider.ts` (mémoïsation des helpers)
- `src/hooks/useCadastralMapData.tsx` (exposer error)

## Question préalable

Lors de la reproduction (`/cadastral-map`), nous tombons sur l'écran de **connexion** — confirmez-vous que vous étiez bien authentifié au moment du bug ? Oui,  je me suis authentifié. Et la carte est-elle blanche/grise, ou affichée mais sans parcelles ? Blanche/grise et sans parcelle. 