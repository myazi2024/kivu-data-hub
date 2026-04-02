

# Rediriger le bouton "Media" de l'accueil vers Articles

## Problème

Le bouton "Media" dans la section hero de la page d'accueil pointe vers `/publications` au lieu de `/articles`.

## Modification

### `src/components/HeroSection.tsx` — ligne 51

Changer le lien de `/publications` à `/articles` :

```tsx
// Avant
<Link to="/publications" className="w-full sm:flex-1">

// Après
<Link to="/articles" className="w-full sm:flex-1">
```

| Fichier | Modification |
|---|---|
| `src/components/HeroSection.tsx` | Changer `to="/publications"` → `to="/articles"` (ligne 51) |

