

# Audit detaille — Module Apparence : fonctionnalites manquantes

## Constat actuel

Le module actuel gere 5 parametres basiques : logo, favicon, 5 couleurs, police, mode clair/sombre. C'est un squelette minimal. Voici les lacunes identifiees apres audit du codebase.

---

## Fonctionnalites absentes a ajouter

### 1. Nom et slogan de l'application (app_name, app_tagline)

**Probleme** : Le nom "BIC" et les textes de marque sont codes en dur dans `Footer.tsx`, `navigation.tsx`, `Auth.tsx`, `PitchPartenaires.tsx`. Aucun moyen admin de les modifier.

**Ajout** : Champs texte pour `app_name` et `app_tagline`, consommes via `useAppAppearance` dans les composants de layout.

### 2. Couleurs foreground manquantes

**Probleme** : Le module ne gere que 5 couleurs (`primary`, `secondary`, `accent`, `destructive`, `muted`) mais le design system dans `index.css` definit aussi `background`, `foreground`, `card`, `border`, `input`, `ring`, `popover` et leurs variantes `-foreground`. Modifier `primary` sans toucher `primary-foreground` peut rendre le texte illisible.

**Ajout** : Ajouter les paires foreground correspondantes et les couleurs structurelles (`background`, `foreground`, `card`, `border`), organisees en groupes logiques.

### 3. Preview live (apercu en temps reel)

**Probleme** : Les changements de couleurs/police ne sont visibles qu'apres sauvegarde et rechargement. Aucun apercu en temps reel dans l'editeur.

**Ajout** : Un panneau d'apercu avec des composants representatifs (bouton, carte, texte, badge) qui reagissent en temps reel aux modifications de couleurs/police/mode.

### 4. Bouton de reinitialisation (reset aux valeurs par defaut)

**Probleme** : Aucun moyen de revenir aux valeurs CSS par defaut codees dans `index.css`. Si l'admin casse le theme, il doit deviner les valeurs originales.

**Ajout** : Bouton "Reinitialiser" qui restaure les valeurs par defaut du design system.

### 5. Logo non consomme dynamiquement

**Probleme** : Le `logo_url` sauvegarde en base n'est jamais lu par `navigation.tsx`, `Footer.tsx` ou `Auth.tsx`. Ces composants importent statiquement `@/assets/bic-logo.png`. Le champ logo dans Apparence est donc inoperant.

**Ajout** : Faire consommer `useAppAppearance().config.logo_url` dans la navigation, le footer et la page auth, avec fallback sur l'image statique.

### 6. Taille de police et border-radius

**Probleme** : `--radius` (0.375rem) est code en dur dans `index.css`. Aucun controle admin sur l'arrondi global ou la taille de base du texte.

**Ajout** : Slider pour `border_radius` (0 a 1rem) et `font_size_base` (14-18px).

### 7. Couleurs custom du mode sombre

**Probleme** : Le mode sombre a ses propres valeurs CSS dans `.dark {}` mais le module ne permet de configurer que les couleurs globales. Il n'y a pas de distinction light/dark dans l'editeur.

**Ajout** : Onglets "Mode clair" / "Mode sombre" dans la section couleurs pour editer les deux palettes separement.

### 8. Suppression de logo/favicon

**Probleme** : Aucun bouton pour supprimer un logo ou favicon uploade. Il faut vider manuellement l'URL.

**Ajout** : Bouton "Supprimer" a cote de chaque preview d'image.

---

## Plan d'implementation

### Fichiers modifies

1. **`src/components/admin/AdminAppearance.tsx`** — Restructuration complete :
   - Section "Identite" : `app_name`, `app_tagline`, logo (avec bouton supprimer), favicon (avec bouton supprimer)
   - Section "Couleurs" : Onglets Light/Dark, groupes logiques (Base, Semantique, Structure), paires couleur/foreground
   - Section "Typographie" : Police + slider taille de base
   - Section "Forme" : Slider border-radius avec apercu
   - Section "Mode par defaut" : Toggle light/dark
   - Panneau "Apercu live" : Mini-composants (bouton, carte, badge, input) stylises en temps reel
   - Bouton "Reinitialiser aux valeurs par defaut"

2. **`src/hooks/useAppAppearance.ts`** — Ajouter :
   - Gestion des nouvelles cles (`app_name`, `app_tagline`, `border_radius`, `font_size_base`, `theme_colors_dark`)
   - Application du `--radius` et `font-size` au root
   - Export du config pour consommation par les composants layout

3. **`src/components/ui/navigation.tsx`** — Remplacer l'import statique `bicLogo` par `useAppAppearance().config.logo_url` avec fallback

4. **`src/components/Footer.tsx`** — Idem, consommer `logo_url` et `app_name` dynamiquement

5. **`src/pages/Auth.tsx`** — Consommer `logo_url` et `app_name` si utilises dans le header

### Nouvelles cles config (table existante `app_appearance_config`)

- `app_name` (string)
- `app_tagline` (string)
- `border_radius` (string, ex: "0.5rem")
- `font_size_base` (string, ex: "16px")
- `theme_colors_dark` (object, meme structure que `theme_colors` pour le mode sombre)

Aucune migration necessaire — la table est deja cle-valeur JSONB.

### Section technique

- ~300 lignes ajoutees dans AdminAppearance (apercu live, onglets dark, nouveaux champs)
- ~30 lignes modifiees dans useAppAppearance (nouvelles cles)
- ~10 lignes modifiees dans navigation.tsx, Footer.tsx, Auth.tsx (consommation dynamique)
- Constante `DEFAULT_THEME` extraite pour le bouton reset

