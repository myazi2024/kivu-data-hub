

# Double-clic sur borne pour editer les coordonnees GPS

## Objectif

Permettre a l'utilisateur de double-cliquer sur une borne du croquis parcelle pour afficher et modifier ses coordonnees GPS (latitude, longitude). La validation se fait au blur (clic en dehors). La borne se repositionne instantanement et les dimensions des cotes se recalculent.

## Approche

### 1. Nouvel etat pour l'edition de borne

Ajouter un state `editingBorneIndex` (number | null) et `editingBorneCoords` ({ lat: string, lng: string }) dans le composant `ParcelMapPreview`.

### 2. Handler double-clic sur les marqueurs de bornes

Dans la boucle de creation des marqueurs (ligne ~885, apres les handlers existants `dragend`, `mousedown`, etc.), ajouter un listener `dblclick` sur chaque marqueur de borne :

```typescript
marker.on('dblclick', (e: any) => {
  e.originalEvent?.stopPropagation();
  e.originalEvent?.preventDefault();
  const idx = coordinates.findIndex(c => c.borne === coord.borne);
  if (idx !== -1) {
    setEditingBorneIndex(idx);
    setEditingBorneCoords({ lat: coord.lat, lng: coord.lng });
  }
});
```

### 3. Overlay d'edition des coordonnees GPS

Ajouter un overlay (meme pattern que l'overlay `editingSideIndex` aux lignes 1787-1830) qui affiche :
- Le numero de la borne
- Deux champs input (Latitude, Longitude) avec `type="number"` et `step="0.000001"`
- Validation au `onBlur` de chaque input ET bouton "Appliquer"
- Annulation avec Escape

Au blur/validation :
1. Mettre a jour `coordinates[editingBorneIndex]` avec les nouvelles valeurs
2. Appeler `onCoordinatesUpdate(updatedCoords)`
3. Appeler `updateParcelSidesFromCoordinates(updatedCoords)` pour recalculer les dimensions
4. Fermer l'overlay

### 4. Mise a jour de la notification info

Remplacer le texte generique (ligne 2350-2356) par un message contextuel enrichi incluant l'instruction sur le double-clic et la recommandation d'equipement GPS de precision :

- Mode normal : "Placez les bornes sur la carte. Double-cliquez sur une borne pour modifier ses coordonnees GPS. Pour reduire les marges d'erreur, prelevez les coordonnees avec un equipement professionnel (ex: Garmin GPS) puis entrez-les manuellement."
- Mode dessin : texte actuel
- Mode construction : texte actuel

### Fichier modifie
- `src/components/cadastral/ParcelMapPreview.tsx`
  - +2 states (`editingBorneIndex`, `editingBorneCoords`)
  - +1 handler `dblclick` sur les marqueurs de bornes (~5 lignes)
  - +1 fonction `confirmBorneEdit` (~15 lignes)
  - +1 overlay UI (~30 lignes, meme pattern que l'overlay dimension)
  - Mise a jour du texte de notification (~8 lignes)

