---
name: Cadastral map architecture
description: /cadastral-map décomposée en hooks (useCadastralMapData, useStripeReturnHandler, useLandTitleNotificationFlow, useLeafletMap), tuiles via useMapProvider (proxy Mapbox), géoloc on-demand, marker clustering, AudioContext singleton, WhatsApp depuis app_appearance_config, analytics map events
type: feature
---
La page `/cadastral-map` (anciennement 1615 LOC monolithe) est décomposée :

## Hooks
- `useCadastralMapData` : `useQuery` parcelles (limit 2000, sélectionne `is_subdivided` + `has_dispute`) + lots de lotissement, staleTime 60s
- `useParcelHistory(id)` : historique enrichi via `useQuery`, enabled conditionnellement
- `useStripeReturnHandler` : polling 15×2s avec `polling`/`pollProgress` exposés pour indicateur visuel
- `useLandTitleNotificationFlow` : state machine (hidden→button→notification→dismissed) remplaçant 4 cascades `setTimeout`
- `useLeafletMap` : init Leaflet, tuiles via `useMapProvider` (proxy Mapbox côté serveur, plus d'OSM en dur), assets marqueurs bundlés (plus de CDN cloudflare), géolocalisation **on-demand** via `requestUserLocation()`, **diff incrémental** des layers (Map<id, layerGroup>), **markerCluster** pour points sans polygone, dimensions de côté seulement si ≤50 parcelles

## Bugs corrigés
- `has_dispute` désormais sélectionné → overlay litige fonctionnel
- Limite 500 → 2000 parcelles + clustering automatique
- Calcul `calculateAreaFromCoordinates` côté client supprimé : utilise `area_sqm` BD (règle DB > frontend)
- Fichier orphelin `src/components/cadastral/CadastralMap.tsx` supprimé
- Géoloc auto au mount → bouton dédié (RGPD)

## UX/a11y
- `prefers-reduced-motion` : désactive animate-shake/scale-in/fade-in/pulse/marquee
- `aria-label` sur tous boutons icon-only (clear, advanced, geolocate, fav, close, whatsapp, légende)
- `useIsMobile` partout (plus de `window.innerWidth`)
- Indicateur paiement Stripe en cours avec progression
- Numéro WhatsApp + message dans `app_appearance_config` (clés `support_whatsapp_number`, `support_whatsapp_message`)

## Performance
- AudioContext singleton via `src/lib/feedbackAudio.ts` (`playFeedbackBeep`) — plus de fuite mémoire
- Diff layers Leaflet : seuls les ids ajoutés/retirés sont touchés (avant : tout re-créé à chaque update)

## Analytics
- Events : `cadastral_map_search`, `cadastral_map_parcel_select`, `cadastral_map_geolocate`, `cadastral_map_whatsapp_click` via `trackEvent`
