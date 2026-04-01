

# Rendre la configuration de la Légende trouvable dans l'admin

## Problème

La configuration de la légende de la carte cadastrale est cachée à l'intérieur de "Config Contributions" (onglet Carte), ce qui la rend introuvable via la sidebar ou une recherche intuitive.

## Solution

Ajouter une entrée dédiée dans la sidebar admin sous la catégorie "Cadastre & Services" qui pointe directement vers la section légende.

## Modifications

### `src/components/admin/AdminSidebar.tsx`

Ajouter une entrée dans la catégorie "Cadastre & Services" :
```
{ icon: LayoutList, label: 'Légende Carte', value: 'map-legend', badge: null }
```

### `src/pages/Admin.tsx`

Ajouter un case `'map-legend'` qui rend `AdminContributionConfig` avec une prop ou qui redirige directement vers l'onglet Carte avec la section Légende pré-ouverte. L'approche la plus simple : faire pointer `map-legend` vers le même composant `AdminContributionConfig` en passant un prop `initialTab="carte"` et un scroll automatique vers la section Légende.

### `src/components/admin/AdminContributionConfig.tsx`

- Accepter une prop optionnelle `initialTab?: string` pour ouvrir directement sur l'onglet Carte
- Ajouter un `id="legend-section"` sur le div de la section Légende pour permettre un scroll automatique via `scrollIntoView` au montage quand on arrive depuis `map-legend`

| Fichier | Modification |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Ajouter entrée "Légende Carte" |
| `src/pages/Admin.tsx` | Ajouter case `map-legend` → AdminContributionConfig avec initialTab |
| `src/components/admin/AdminContributionConfig.tsx` | Accepter `initialTab`, ajouter `id` sur section légende, scroll auto |

