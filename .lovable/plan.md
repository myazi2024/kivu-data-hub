
# Audit du composant Croquis Parcelle (ParcelMapPreview)

Après analyse complète des 2527 lignes du composant `ParcelMapPreview.tsx`, voici les constats classés par catégorie.

---

## 1. Bugs et erreurs de logique

### 1.1 — Caractères parasites dans le code (ligne 530)
Ligne 530 contient `9   // Nettoyer les ancie9s marqueurs` — des caractères `9` parasites dans un commentaire et une indentation. Bug cosmétique mais symptôme potentiel de corruption de fichier.

### 1.2 — `mapBearing` / `setBearing` : fonctionnalité fictive
Le composant maintient un état `mapBearing` et appelle `mapInstanceRef.current.setBearing?.(newBearing)` (lignes 2057, 2078, 2097). **Leaflet standard n'a pas de méthode `setBearing`**. La carte ne tourne jamais visuellement. Seule la boussole SVG pivote et les orientations cardinales des côtés changent, mais la tuile reste fixe. L'utilisateur peut croire qu'il oriente la carte alors que seuls les labels changent.

### 1.3 — Rotation de parcelle : dérive cumulée
`rotateParcel` (ligne 1631) applique des rotations incrémentielles de 1° sur les coordonnées courantes. Chaque rotation accumule des erreurs d'arrondi à `.toFixed(6)`. Après 360 rotations de 1°, la parcelle ne revient pas à sa position initiale. La mémoire d'architecture recommande de stocker les sommets originaux et de calculer la rotation cumulée, mais ce n'est pas implémenté ici.

### 1.4 — `checkPolygonOverlap` : détection approximative
La fonction (ligne 1298) vérifie uniquement si des sommets d'un polygone sont à l'intérieur de l'autre. Elle ne détecte pas les chevauchements par intersection d'arêtes (deux polygones en "étoile" qui se croisent sans qu'aucun sommet ne soit à l'intérieur de l'autre). Faux négatifs possibles.

### 1.5 — `useEffect` avec `JSON.stringify` dans les dépendances (ligne 1092)
`JSON.stringify(validCoords)` et `JSON.stringify(roadSides)` dans le tableau de dépendances d'un `useEffect` est coûteux et crée une nouvelle chaîne à chaque render. Devrait utiliser un hook `usePrevious` ou `useMemo` pour la comparaison.

### 1.6 — Édition GPS (onBlur) : double application
L'overlay d'édition de borne (ligne 1846) applique les coordonnées sur `onBlur` de chaque input ET sur clic du bouton "Appliquer". Si l'utilisateur modifie lat, clique sur lng (blur déclenche update), puis clique "Appliquer", les coordonnées sont mises à jour 2 fois inutilement.

### 1.7 — `removeLastMarker` supprime toujours la dernière borne
Il n'y a pas de moyen de supprimer une borne spécifique (ex: borne 2 sur 4). Seule la dernière peut être retirée. L'utilisateur doit tout supprimer et recommencer pour corriger une borne intermédiaire.

---

## 2. Fonctionnalités fictives / partiellement implémentées

### 2.1 — Trapèze : génère un hexagone
Le type `'trapeze'` dans `drawBuildingShape` (ligne 1143) tombe dans le `default` et génère un polygone régulier à `sides = 4`, ce qui produit un losange/carré régulier, pas un trapèze. La forme n'a aucune asymétrie trapézoïdale.

### 2.2 — `enableConflictDetection` prop non utilisée
La prop `enableConflictDetection` (défaut `true`) est déclarée mais jamais lue dans le corps du composant. Le bouton "Voir parcelles voisines" s'affiche toujours si `isParcelComplete`, sans vérifier cette prop.

### 2.3 — Pas de redimensionnement/rotation des constructions
Les formes de construction sont ajoutées avec une taille fixe de 5m et aucune rotation. L'utilisateur ne peut pas les redimensionner, les tourner ou les déplacer après placement. Seul "Supprimer la dernière" est disponible.

### 2.4 — `showParcelControls` : état jamais activé
L'état `showParcelControls` (ligne 144) conditionne le style de bordure de la carte (ligne 1789-1790) mais **aucun bouton ne le met à `true`**. Le style `border-blue-400/60` n'est jamais visible.

---

## 3. Redondances

### 3.1 — Calcul de `parcelSides` dupliqué 3 fois
Le pattern "parcourir validCoords, calculer distances, construire `ParcelSide[]`" est implémenté dans :
- `addMarkerAtPosition` (ligne 219-245)
- `removeLastMarker` (ligne 261-288)
- `updateParcelSidesFromCoordinates` (ligne 326-362)

Les trois devraient déléguer à `updateParcelSidesFromCoordinates`.

### 3.2 — Code de sortie du mode borne dupliqué
La logique de réinitialisation (selectedBorne → null, dragging.enable, etc.) est écrite dans `exitMarkerMoveMode` (ligne 1527) ET inline dans le bouton X du panneau de déplacement précis (ligne 2361-2373). Devrait utiliser `exitMarkerMoveMode` partout.

### 3.3 — `calculateDistance` définie comme méthode de composant
Fonction pure sans dépendance d'état, pourrait être extraite hors du composant pour éviter les re-créations.

---

## 4. Optimisations à faire

### 4.1 — Fichier monolithique de 2527 lignes
Le composant mélange : initialisation Leaflet, géolocalisation, gestion des marqueurs, mode dessin, mode construction, détection de voisins, rotation/translation, édition de dimensions, édition de GPS, UI (overlays, contrôles, alertes). Devrait être découpé en hooks (`useLeafletMap`, `useParcelMarkers`, `useNeighborDetection`, `useBuildingShapes`) et sous-composants.

### 4.2 — Géolocalisation demandée systématiquement
`requestGeolocation()` est appelée à chaque montage (ligne 603). Si l'utilisateur a déjà placé des bornes, la carte se recentre sur sa position GPS au lieu des bornes existantes. Le `fitBounds` du polygone dans `updateMap` corrige ensuite, mais il y a un flash visible.

### 4.3 — Pas de debounce sur les nudge/rotation
Les boutons directionnels avec `getLongPressProps` déclenchent un `onCoordinatesUpdate` toutes les 50ms. Chaque update provoque un re-render complet avec nettoyage/recréation de tous les layers Leaflet. Un debounce ou un batch serait bénéfique.

### 4.4 — `computeStep` recalcule sur `moveend`
Le listener `moveend` (ligne 641) recalcule le pas de déplacement à chaque pan de carte, même quand c'est le nudge lui-même qui cause le `moveend`. Boucle de feedback potentielle.

---

## 5. Fonctionnalités absentes

| Fonctionnalité | Impact |
|---|---|
| Supprimer une borne spécifique (pas juste la dernière) | Élevé — oblige à tout recommencer |
| Annuler/Rétablir (undo/redo) | Moyen — pas de retour arrière possible |
| Verrouillage du croquis (lecture seule après validation) | Moyen — risque de modification accidentelle |
| Export du croquis en image (PNG/PDF) | Faible — disponible via ReviewTab/ParcelSketchSVG |
| Saisie directe du nombre de bornes puis placement | Faible — workflow alternatif |

---

## Résumé des priorités

1. **Corriger** `setBearing` fictif (supprimer ou documenter la limitation)
2. **Corriger** la dérive de rotation (stocker sommets originaux)
3. **Factoriser** le calcul de `parcelSides` en une seule fonction
4. **Supprimer** `showParcelControls` et `enableConflictDetection` inutilisés
5. **Découper** le composant en sous-modules pour maintenabilité
6. **Ajouter** la suppression d'une borne spécifique
7. **Corriger** le trapèze (forme réelle vs hexagone régulier)
