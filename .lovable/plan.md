

# Ajouter le logo dans le menu Media

## Problème

Le mega-menu "Media" (dropdown dans la navigation) affiche uniquement une grille de liens sans aucun élément de branding. Le logo de l'application n'y apparaît pas.

## Modification

### `src/components/ui/navigation.tsx` — Mega-menu Media

Ajouter une section de branding dans le mega-menu, dans la partie gauche ou en en-tête du dropdown :

- Afficher le logo dynamique (`logoSrc` déjà disponible dans le composant) avec le nom de l'app et le tagline
- Placer cette section comme un bandeau en haut du dropdown ou comme une colonne supplémentaire à gauche
- Style : fond léger (`bg-muted/50`), logo petit (`h-8`), texte `app_name` + `app_tagline`

Concrètement, transformer la grille du mega-menu de `grid-cols-3` en une structure avec un bandeau branding en haut suivi de la grille 3 colonnes :

```
┌──────────────────────────────────┐
│  [Logo]  Nom App                 │
│          Tagline                 │
├──────────┬──────────┬────────────┤
│ Actualités│ Ressources│ À propos  │
│ ...      │ ...      │ ...        │
└──────────┴──────────┴────────────┘
```

Les variables `logoSrc`, `displayName` et `displayTagline` sont déjà définies dans le composant — aucun import supplémentaire requis.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/ui/navigation.tsx` | Bandeau branding dans le mega-menu Media (lignes 99-129) |

