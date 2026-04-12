

# Optimisation mobile — Config Graphiques

## Problemes identifies (viewport 360px)

1. **Barre de modes** (5 boutons horizontaux "Onglets/KPIs/Graphiques/Filtres/Croisements") : deborde horizontalement, les labels sont tronques
2. **Boutons d'action header** ("Voir dans Analytics" + "Sauvegarder tout" + badge) : s'empilent mal, texte coupe
3. **Grille sidebar + contenu** (`lg:grid-cols-4`) : sur mobile, la sidebar prend 100% de largeur avec une hauteur fixe de 500px — l'admin doit scroller enormement avant d'atteindre le contenu
4. **ItemEditor** : ligne horizontale avec 7 elements (grip, fleches, switch, input, select, couleur, badge) — tout est ecrase sur 360px
5. **Groupes de boutons** dans les en-tetes de section ("Tout afficher"/"Tout masquer"/"Sauvegarder") : debordent

## Corrections prevues

### 1. Barre de modes responsive
- Sur mobile : afficher uniquement les icones (sans labels texte), dans un conteneur `overflow-x-auto`
- Sur desktop : garder icone + label

### 2. Header actions empilees
- Wrapper les actions dans un `flex-col` sur mobile au lieu de `flex-row`
- Masquer le texte "Voir dans Analytics" sur mobile (garder l'icone seule)
- "Sauvegarder tout" en pleine largeur sur mobile

### 3. Sidebar collapsible sur mobile
- Remplacer la sidebar permanente par un selecteur `<Select>` dropdown sur mobile (liste des onglets)
- Garder la sidebar classique sur `lg:` et au-dessus
- Supprimer le `h-[500px]` fixe sur mobile

### 4. ItemEditor empile sur mobile
- Sur mobile : passer en layout vertical (2 lignes) :
  - Ligne 1 : switch + titre (input)
  - Ligne 2 : fleches + type chart + couleur + badge
- Sur desktop : garder la ligne horizontale actuelle

### 5. Boutons de section compacts
- Sur mobile : icones seules pour "Tout afficher"/"Tout masquer"
- Bouton "Sauvegarder" en largeur adaptee

## Fichiers modifies

- `src/components/admin/AdminAnalyticsChartsConfig.tsx` — header, barre de modes, grilles sidebar/contenu, boutons
- `src/components/admin/analytics-config/ItemEditor.tsx` — layout responsive vertical/horizontal

## Section technique

- Utilisation du hook `useIsMobile()` existant pour conditionner les layouts
- Remplacement des sidebars par `<Select>` sur mobile (pattern deja utilise ailleurs dans le projet)
- Aucune dependance ajoutee, aucun changement base de donnees

