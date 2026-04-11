

# Nouveau module Admin : Apparence de l'application

## Constat

Aucun module n'existe actuellement dans l'espace admin pour configurer l'apparence globale de l'application (logo, favicon, thème, couleurs). Cette configuration est uniquement codée en dur dans le CSS et les fichiers statiques.

## Plan d'implémentation

### 1. Créer le composant `AdminAppearance.tsx`

Nouveau fichier `src/components/admin/AdminAppearance.tsx` avec 4 sections :

- **Logo & Favicon** : Upload d'image pour le logo (navbar/footer) et le favicon, avec preview. Stockage dans Supabase Storage (bucket `app-assets`), URL sauvegardée dans une table de config.
- **Couleurs du thème** : Éditeur pour les couleurs sémantiques principales (`primary`, `secondary`, `accent`, `destructive`, `muted`) avec color pickers et preview live.
- **Mode sombre/clair** : Toggle pour définir le mode par défaut de l'application.
- **Typographie** : Sélection de la police principale parmi un jeu prédéfini (Inter, Poppins, Roboto, etc.).

### 2. Table Supabase `app_appearance_config`

Migration pour créer une table clé-valeur :
```sql
create table public.app_appearance_config (
  id uuid primary key default gen_random_uuid(),
  config_key text unique not null,
  config_value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
```

Clés prévues : `logo_url`, `favicon_url`, `theme_colors`, `default_theme_mode`, `font_family`.

### 3. Hook `useAppAppearance`

Hook React qui charge la config depuis `app_appearance_config` et applique les valeurs CSS au `document.documentElement` au démarrage. Appelé dans `App.tsx`.

### 4. Intégration dans la sidebar admin

Ajouter l'entrée dans la catégorie **Système** de `AdminSidebar.tsx` :
```
{ icon: Paintbrush, label: 'Apparence', value: 'appearance', badge: null }
```

Ajouter le lazy import dans `Admin.tsx` :
```
'appearance': lazy(() => import('@/components/admin/AdminAppearance'))
```

### 5. Bucket Supabase Storage

Créer le bucket `app-assets` (public) pour stocker logo et favicon uploadés.

### Section technique

**Fichiers créés** :
- `src/components/admin/AdminAppearance.tsx`
- `src/hooks/useAppAppearance.ts`
- Migration SQL pour `app_appearance_config` + bucket + RLS

**Fichiers modifiés** :
- `src/components/admin/AdminSidebar.tsx` — ajout entrée menu
- `src/pages/Admin.tsx` — ajout lazy import
- `src/App.tsx` — intégration du hook `useAppAppearance`

