# Alignement visuel — Dropdown Actions Parcelle ↔ Catalogue Services

## Objectif
Dans `ParcelActionsDropdown.tsx` (menu déroulant "Actions" sur la carte cadastrale), chaque service doit s'afficher en **bloc isolé** (carte avec bordure, ombre et coins arrondis) avec la **même typographie** que dans le catalogue (`ServiceListItem.tsx`), au lieu de la liste actuelle de boutons compacts collés les uns aux autres.

## Périmètre — uniquement présentation
Aucun changement de logique, d'auth, de dialogues, de tracking ou de structure de données. Seuls le markup et les classes Tailwind de l'item changent.

## Référence visuelle (catalogue)
Chaque item du catalogue est un bloc :
- `rounded-2xl border-2 shadow-md hover:shadow-lg` (état "disponible")
- Icône dans un conteneur `p-2 rounded-xl bg-primary/10 text-primary` (4×4)
- Titre `text-sm font-medium text-foreground`
- Description `text-sm text-muted-foreground` (au lieu de `text-[10px]`)
- Espacement interne `p-3`, gap `space-y-2` entre les cartes

## Changements dans `ParcelActionsDropdown.tsx`

### 1. Container de la liste
- Remplacer `space-y-0.5` par `space-y-2` pour isoler visuellement chaque carte
- Conserver `overflow-y-auto`, `max-h-[55dvh] sm:max-h-[260px]`, `px-2.5 pb-2`

### 2. Item (`<button>`)
Remplacer les classes actuelles par un style carte aligné catalogue :
- Conteneur : `w-full rounded-2xl border-2 shadow-md hover:shadow-lg p-3 flex items-center gap-3 text-left transition-all duration-200`
- États :
  - actif : `border-primary/40 bg-background hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]`
  - inactif : `opacity-40 cursor-not-allowed border-border/50 bg-muted/20`
- Cible tactile minimale conservée (`min-h-12`)

### 3. Icône
- Wrapper : `shrink-0 p-2 rounded-xl bg-primary/10 text-primary` (état actif), `bg-muted text-muted-foreground/50` (inactif)
- `ActionIcon` : passer `className="h-4 w-4"` (au lieu de `h-4 w-4 text-muted-foreground` directement sur l'icône) ; ajuster la signature pour accepter une classe parent

### 4. Texte
- Titre : `text-sm font-medium text-foreground truncate` (au lieu de `text-[13px]`)
- Description : `text-xs text-muted-foreground mt-0.5 line-clamp-2` (au lieu de `text-[10px] truncate`) → plus lisible, jusqu'à 2 lignes
- `ActionBadge` inchangé (déjà cohérent)

### 5. Séparateur de catégorie
Les `<Separator />` deviennent visuellement redondants avec les cartes isolées. Option retenue : **les supprimer** et garder uniquement le `space-y-2` (les catégories restent regroupées par tri `displayOrder`). Si l'utilisateur préfère conserver des intertitres, on peut remplacer par un petit label `text-[10px] uppercase tracking-wider text-muted-foreground/60` entre groupes — mais par défaut on simplifie.

### 6. En-tête "Services disponibles"
Inchangé (déjà cohérent visuellement).

## Vérification post-implémentation
- Viewport mobile 360px : chaque service occupe une carte distincte avec ombre, titre `text-sm`, badge visible
- Scroll vertical fonctionnel si > 4–5 services
- États actif / désactivé / focus / hover visuellement distincts
- Comparaison côte-à-côte avec un item du catalogue : même taille de police titre, même radius, même padding

## Fichier modifié
- `src/components/cadastral/ParcelActionsDropdown.tsx` (uniquement la section JSX du panneau `expanded` + composant `ActionIcon` pour la classe)
