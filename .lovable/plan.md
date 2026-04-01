

# Gestion de la Légende depuis l'espace Admin

## Objectif

Rendre le bloc "Légende" de la carte cadastrale configurable depuis l'admin, en ajoutant une section dédiée dans les paramètres de carte existants (`map_preview_settings`).

## Ce qui sera configurable

- **Afficher/masquer la légende** (switch global)
- **Éléments individuels** : activer/désactiver chaque entrée de la légende (Bornage GPS, Sans bornage, Limites parcellaires, Dimensions côtés, Données incomplètes, Parcelle favorite)
- **Labels personnalisables** : modifier le texte affiché pour chaque élément

## Plan technique

### 1. Étendre le type `MapConfig` (`src/hooks/useMapConfig.tsx`)

Ajouter un champ `legend` au type `MapConfig` :

```ts
legend?: {
  enabled: boolean;
  items: Array<{
    key: string;
    label: string;
    mobileLabel: string;
    enabled: boolean;
  }>;
};
```

Ajouter les valeurs par défaut correspondantes dans `DEFAULT_MAP_CONFIG`.

### 2. Ajouter la section admin "Légende" (`src/components/admin/AdminContributionConfig.tsx`)

Dans l'onglet "Carte" des paramètres, ajouter un bloc après les paramètres de dimensions (avant le bouton Enregistrer, ~ligne 1375) :

- Switch global "Afficher la légende"
- Liste des éléments avec pour chacun : switch activé/désactivé + champ texte pour le label
- Bouton de réordonnancement optionnel

### 3. Rendre la légende dynamique dans `CadastralMap.tsx`

Remplacer les éléments de légende codés en dur (lignes 1437-1502) par un rendu conditionnel basé sur `mapConfig.legend` :

- Si `legend.enabled === false`, masquer le bloc entier
- Filtrer les items où `enabled === true`
- Utiliser les labels configurés au lieu des textes en dur
- Conserver les icônes associées à chaque `key` via un mapping local

### 4. Valeurs par défaut dans le reset

Ajouter la config légende dans le bloc de réinitialisation (~ligne 1394) de `AdminContributionConfig.tsx`.

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/hooks/useMapConfig.tsx` | Ajouter `legend` au type + valeurs par défaut |
| `src/components/admin/AdminContributionConfig.tsx` | Ajouter section UI de gestion de la légende dans l'onglet Carte |
| `src/pages/CadastralMap.tsx` | Rendre la légende dynamique depuis la config |

