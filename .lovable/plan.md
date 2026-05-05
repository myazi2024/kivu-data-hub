# Optimisation mobile — Carte cadastrale (`/cadastral-map`)

## Audit synthétique

La page `src/pages/CadastralMap.tsx` (788 LOC) empile **7 couches flottantes absolues** sur la carte (search overlay, geolocate, légende, panneau parcelle, panier, WhatsApp via dropdown, contrôles zoom Leaflet). Sur mobile (≤ 768px, viewport observé 360×601), ces couches sont positionnées via du `style={{ bottom: viewport * 0.xx }}` calculé au JS, ce qui :

- recrée un `<style>` inline à chaque render (CSS pour `.leaflet-control-zoom`),
- dépend de `window.innerHeight` mis à jour avec un debounce 150 ms (jank au changement d'orientation / clavier virtuel),
- ne tient pas compte des **safe-area** iOS (notch / home indicator),
- provoque chevauchements : geolocate à 40 % du viewport, search bar à `viewport-180px`, panier `bottom-16`, panneau parcelle `bottom-2`, légende mobile entre 25 % et 55 %.

Autres frictions UX mobiles relevées :
- Cibles tactiles **< 44 px** quand une parcelle est sélectionnée (`h-8 w-8` pour search, settings, X, favori, fermeture).
- Le land title button affiche **Tooltip + Popover imbriqués** sur mobile (focus capture, double overlay).
- L'overlay recherche en haut + les filtres avancés `max-h-500` peuvent dépasser le viewport et sont scrollables uniquement à l'intérieur du conteneur.
- 3 boutons d'action (`Données`, `Actions`, `WhatsApp`) compressés dans un panneau `max-w-[340px]` — labels tronqués.
- Pas de `min-h-0` ni `overflow` strict sur `<main>` → la carte peut sauter quand le clavier mobile s'ouvre (search input).
- Le bouton flottant du panier recouvre encore les contrôles Leaflet sur viewport très court (601 px).
- Le suivi `viewportHeight` via `window.innerHeight` est instable iOS (URL bar) — préférer `100dvh` et CSS variables.

## Objectif

Réduire le nombre de positions calculées en JS, fiabiliser les zones cliquables, respecter les safe-areas et éviter les chevauchements entre overlays sur mobile, sans régression desktop.

## Changements proposés

### 1. `src/pages/CadastralMap.tsx` — refonte du layering mobile

- Remplacer le bloc `<style>` inline qui pilote `.leaflet-control-zoom` par une **variable CSS** `--map-zoom-offset` posée sur le conteneur ; calculée une seule fois par état (selectedParcel, actionsExpanded, isMobile) sans dépendre de `viewportHeight` JS.
- Remplacer tous les `Math.min(viewportHeight * X, Y)` par des classes Tailwind et **safe-area** :
  - `pb-[env(safe-area-inset-bottom)]` sur les overlays bas,
  - `top-3` au lieu de `viewport - 180px` (search bar n'est plus poussée tout en bas quand inactive — pattern moderne : barre toujours en haut sur mobile, full-width).
- Search bar mobile : **toujours fixée en haut** (`top-2 left-2 right-2`) avec `h-10` (cible tactile 40 px conforme) ; supprimer le mode "compact" `h-8` quand parcelle sélectionnée.
- Panneau parcelle sélectionnée : passer en **bottom-sheet plein largeur** (`left-0 right-0 rounded-t-3xl`) avec `pb-[env(safe-area-inset-bottom)]`, hauteur auto, drag-handle visuel ; supprimer `max-w-[340px] mx-auto` qui crée une bande étroite.
- Boutons action (`Données`, `Actions`, WhatsApp) : redimensionner en `h-10 min-w-10` ; sur < 380 px, basculer le bouton WhatsApp dans le menu Actions pour libérer l'espace.
- Land title button mobile : supprimer le `Tooltip` redondant (garder uniquement le `Popover` de notification) ; déplacer le bouton dans une rangée secondaire si la barre dépasse 360 px.
- Geolocate floating : déplacer en haut-droite sous la barre de recherche (`top: 4rem` mobile) au lieu de 40 % du viewport, pour libérer toute la zone basse pour le panneau parcelle.
- Légende mobile : ancrer en `top-3 right-3` (sous geolocate) avec popover `side="bottom"` au lieu de la position dynamique en bas.
- `<main>` : utiliser `h-[100dvh]` au lieu de `calc(100vh - 4rem)` + `overflow-hidden`, et `Navigation` en `flex-shrink-0` ; évite le saut iOS quand le clavier s'ouvre.

### 2. `src/components/cadastral/CadastralCartButton.tsx`

- Bouton flottant mobile : ancrer en `bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3` ; déjà `bottom-16` mais on enlève l'offset arbitraire et on s'aligne sur safe-area.
- Quand un panneau parcelle est ouvert sur mobile, écouter `cadastralParcelOpen` (nouvel évènement) et **masquer** ou réduire le bouton du panier (transformé en pastille discrète) pour éviter le recouvrement du bottom-sheet.
- `SheetContent` : sur mobile, passer en `side="bottom"` au lieu de `right` (déjà géré ?) — vérifier et forcer ; ajouter `max-h-[85dvh]` et `pb-[env(safe-area-inset-bottom)]`.

### 3. `src/components/cadastral/ParcelActionsDropdown.tsx`

- Dropdown développé : remplacer la liste verticale dense par une **grille 2 colonnes** sur mobile (`grid grid-cols-2 gap-2`) avec touches `h-12` ; meilleure scannabilité sur 360 px.
- Ajouter `max-h-[55dvh] overflow-y-auto overscroll-contain` pour éviter qu'il ne déborde quand 8+ actions sont affichées.

### 4. `src/components/cadastral/AdvancedSearchFilters.tsx`

- Mode compact : passer les `Select` côte à côte (`grid grid-cols-2 gap-2`) en `grid-cols-1` < 380 px ; éviter les labels tronqués des provinces longues ("Kasaï-Oriental").
- Boutons "Rechercher / Effacer" en `sticky bottom-0` du panneau pour rester accessibles quand la liste de filtres scrolle.

### 5. `src/components/cadastral/CadastralResultsDialog.tsx`

- Vérifier que le dialog passe en plein écran mobile (`max-h-[95dvh] sm:max-h-[80vh]`, `rounded-none sm:rounded-2xl`).

### 6. Mémoire

Mettre à jour `mem://features/cadastral-map-architecture-fr.md` :
- Section "Mobile layout standard" : safe-area, `100dvh`, search bar fixée top, panneau parcelle en bottom-sheet, geolocate top-droite.
- Cibles tactiles ≥ 40 px obligatoires.

## Détails techniques

```text
Avant (mobile 360×601)            Après
┌──────────────────┐              ┌──────────────────┐
│ Nav 64           │              │ Nav 64           │
│                  │              │ ─── search bar ─ │  ← top-2, h-10
│  geo (40% h)    ●│              │ ───── geo ──── ●│  ← top sous search
│                  │              │                  │
│                  │              │      MAP         │
│ ─── search bar ─ │              │                  │
│ ─── panel ───── │              │ ═══ parcel sheet ═│  ← bottom-sheet
│ cart●  legend ●  │              │ ═════════════════ │     pb-safe
└──────────────────┘              └──────────────────┘
```

Composants JS supprimés :
- `<style>` inline pour `.leaflet-control-zoom` → remplacé par `style={{ '--map-zoom-offset': ... }}` + CSS dans `index.css`.
- 3 callsites `Math.min(viewportHeight * X, Y)` retirés.

Pas de modification BD, pas de nouveaux endpoints.

## QA

Après implémentation :
- Naviguer en preview à 360×640, 390×844, 414×896 et 768×1024.
- Vérifier : recherche, suggestions, sélection parcelle (carte), expansion actions (8+ items), ouverture du panier (sheet bottom), légende, geolocate, ouverture clavier sur input, paysage.
- Vérifier desktop (≥ 1024 px) : aucune régression visuelle (search overlay gauche 24 rem, panneau parcelle bas-droite, légende top-droite).
- Lancer `bunx vitest run src/hooks/__tests__/useCadastralCart.purge.test.tsx` pour confirmer non-régression du panier.
