

# Rogner l'image de la carte BIC

## Approche

Plutôt que de re-traiter le fichier image (impossible en mode lecture seule), on utilise CSS pour masquer la partie gauche et haute de l'image via `object-fit: cover` combiné avec `object-position`.

## Modification

### `src/pages/PitchPartenaires.tsx` — Ligne 142

Ajouter `object-position` pour décaler l'image vers le bas-droite, ce qui "rogne" visuellement le haut et la gauche :

```tsx
// Avant
<img src={mapViz} alt="Carte interactive BIC" className="w-full h-full object-cover" />

// Après
<img src={mapViz} alt="Carte interactive BIC" className="w-full h-full object-cover object-right-bottom" />
```

Cela utilise `object-position: right bottom` avec `object-cover` pour ne montrer que la partie droite-basse de l'image, masquant ainsi le bord gauche et le haut.

| Fichier | Modification |
|---|---|
| `src/pages/PitchPartenaires.tsx` | Ligne 142 : ajouter `object-right-bottom` |

