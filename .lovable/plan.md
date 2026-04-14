

# Enrichir le module Apparence — Gestion du contenu Accueil (Hero)

## Probleme

Le module Apparence ne gere que l'identite visuelle (logo, favicon, couleurs, typographie). L'image principale du Hero et ses textes (titre, boutons) sont **hardcodes** dans `HeroSection.tsx` via un import statique (`hero-skyline.webp`). Il n'existe aucun moyen de les modifier depuis l'admin.

## Solution

Ajouter une nouvelle section **"Page d'accueil"** dans le module Apparence pour gerer dynamiquement :
- L'image de fond du Hero (upload ou URL)
- Le titre principal
- Le sous-titre (animation typewriter)
- L'opacite/couleur de l'overlay

### Nouvelles cles `app_appearance_config`

| config_key | Valeur par defaut |
|---|---|
| `hero_image_url` | (asset statique actuel) |
| `hero_title` | "Consultez les informations cadastrales des parcelles depuis chez vous." |
| `hero_overlay_opacity` | 80 |

### Fichiers modifies

**`src/components/admin/AdminAppearance.tsx`** :
- Ajouter une section "Page d'accueil" avec :
  - Upload d'image Hero (meme pattern que logo/favicon)
  - Champ texte pour le titre
  - Slider pour l'opacite de l'overlay
- Sauvegarder ces 3 nouvelles cles dans `handleSave`
- Les charger dans `useEffect` existant

**`src/hooks/useAppAppearance.ts`** :
- Etendre `AppearanceConfig` avec `hero_image_url`, `hero_title`, `hero_overlay_opacity`
- Pas besoin de les appliquer au DOM (pas des variables CSS)

**`src/components/HeroSection.tsx`** :
- Importer `useAppAppearance` pour lire la config
- Utiliser `config.hero_image_url` comme `src` de l'image (fallback sur l'import statique)
- Utiliser `config.hero_title` comme contenu du `<h1>` (fallback sur le texte actuel)
- Appliquer `config.hero_overlay_opacity` sur l'overlay gradient

### Volume
- 3 fichiers modifies, 0 nouveau fichier, 0 migration (utilise la table existante `app_appearance_config`)

