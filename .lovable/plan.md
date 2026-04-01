

# Ajouter "Service disponible pour :" avec liste de provinces administrable

## Approche

Utiliser la table existante `catalog_config` pour stocker la liste des provinces actives (clé : `available_provinces`). Afficher cette liste sous les boutons CTA du HeroSection. Ajouter un panneau admin pour gérer cette liste.

## Etapes

### 1. Migration DB — Insérer la config initiale

Insérer une ligne dans `catalog_config` avec `config_key = 'available_provinces'` et `config_value` contenant un tableau JSON des provinces activées (ex: `["Kinshasa", "Haut-Katanga"]`). Valeur par défaut vide `[]`.

### 2. HeroSection — Afficher les provinces

- Charger la config `available_provinces` via le hook existant `useCatalogConfig`
- Sous le bloc des 3 boutons CTA, ajouter un texte en petits caractères (`text-xs opacity-70`) : "Service disponible pour :" suivi des noms de provinces séparés par des virgules
- Si la liste est vide, ne rien afficher

### 3. Admin — Panneau de gestion

Ajouter une section dans l'admin (ou étendre `AdminCatalogConfig`) permettant de cocher/décocher les 26 provinces de la RDC. La liste complète des provinces sera tirée de `geographicData`. La sauvegarde met à jour la ligne `catalog_config` correspondante.

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Insert `available_provinces` dans `catalog_config` |
| `src/components/HeroSection.tsx` | Ajouter affichage provinces sous les boutons |
| `src/hooks/useCatalogConfig.tsx` | Aucun changement (hook générique existant) |
| `src/components/admin/AdminCatalogConfig.tsx` | Ajouter section checkboxes provinces |

