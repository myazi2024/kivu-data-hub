---
name: Cadastral map architecture
description: /cadastral-map décomposée en hooks, tuiles via proxy Mapbox, géoloc on-demand, marker clustering, AudioContext singleton, panier optimisé, layout mobile safe-area + 100dvh + bottom-sheet
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
- `has_dispute` **n'est plus sélectionné** côté carte ni exposé visuellement (info payante `land_disputes`, voir mémoire `dispute-existence-paid-only-fr`)
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

## Panier cadastral (audit)
- Sync Supabase symétrique : `useCadastralCart` + `useCartDiscounts` arment `skipNextPush` au mount et sur changement `userId` (anti-écrasement distant + anti-fuite cross-comptes)
- Purge post-paiement : snapshot **après** la requête `cadastral_service_access` (pas avant) pour ne pas évincer des parcelles ajoutées entre-temps
- Re-validation des codes promo mémorisés à chaque ouverture du drawer (auto-clear + toast si invalide)
- Bundle "Compléter le dossier" du drawer ne propose QUE les services sans `required_data_fields` (évite ajout aveugle de services grisés)
- Devise dynamique (`useCurrencyConfig`) dans le drawer, plus de `$` hardcodé
- Bouton "Payer cette parcelle" émet `cadastralCartFocusBilling` → `CadastralBillingPanel` scrollIntoView via ref
- Bouton flottant : `bottom-16` mobile / `sm:bottom-3` desktop pour ne pas masquer les contrôles Leaflet
- Analytics : `cadastral_cart_remove_service`, `cadastral_cart_clear_parcel`, `cadastral_cart_promo_removed`, `cadastral_cart_promo_auto_cleared`, `cadastral_cart_focus_billing`

## Layout mobile (audit dédié)
- `<main>` en `h-[100dvh]` + `overflow-hidden` (plus de `100vh` qui saute avec l'URL bar iOS / clavier).
- Position de `.leaflet-control-zoom` pilotée par variable CSS `--map-zoom-offset` (plus de `<style>` recalculé via `viewportHeight` JS).
- Search overlay : **toujours en haut** sur mobile (`top-3 left-3 right-3`), plus jamais collée au bas du viewport ; cibles tactiles ≥ 40 px (`h-10`) pour tous les boutons (search clear, settings, land title) — fin du mode "compact h-8" quand parcelle sélectionnée.
- Geolocate : top-droite sous la barre de recherche (`top-[4.5rem]`) au lieu de 40 % du viewport.
- Légende mobile : top-droite (`top-[8rem]`), popover side="left" — plus de position dynamique calculée en bas.
- Panneau parcelle sélectionnée : **bottom-sheet plein largeur** (`inset-x-0 bottom-0 rounded-t-3xl`) avec `pb-[env(safe-area-inset-bottom)]` ; supprimé `max-w-[340px] mx-auto` qui créait une bande étroite. Boutons d'action `h-10` (Données / Actions / WhatsApp), favori et fermeture `h-9 w-9`.
- ParcelActionsDropdown : `max-h-[55dvh]` mobile + `overscroll-contain` ; chaque bouton `min-h-11` pour cible tactile.
- CadastralCartButton : ancré en `bottom-[calc(env(safe-area-inset-bottom)+5rem)] sm:bottom-3` ; SheetContent reçoit `pb-[env(safe-area-inset-bottom)]`.
