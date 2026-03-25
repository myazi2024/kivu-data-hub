

# Audit "Configuration graphiques" — Divergences, redondances et améliorations

## Problèmes identifiés

### 1. DOUBLON display_order dans `parcels-titled`

Dans le registre `useAnalyticsChartsConfig.ts`, l'onglet `parcels-titled` a **deux entrées avec `display_order: 16`** :
- `geo` (Géographie) — display_order: 16
- `taxes-amount` (Montants taxes/an) — display_order: 16

Cela peut causer un ordre d'affichage imprévisible.

**Correction** : Renuméroter séquentiellement les display_order de `parcels-titled` (0 à 21 sans trou ni doublon).

### 2. GAP display_order dans `parcels-titled`

`display_order: 12` est absent (saut de 11 à 13). Pas de donnée manquante, mais l'ordre est incohérent.

**Correction** : Renuméroter séquentiellement.

### 3. GAP display_order dans `title-requests`

`display_order: 11` est absent (saut de 10 à 12). Même problème esthétique.

**Correction** : Renuméroter séquentiellement.

### 4. Redondance watermark : `map-watermark` vs `global-watermark`

Deux configurations distinctes gèrent le même texte de watermark :
- `_global > global-watermark` : utilisé dans les graphiques Analytics (via `WatermarkContext`)
- `rdc-map > map-watermark` : utilisé dans la Carte RDC

Si l'admin modifie l'un sans l'autre, le watermark sera incohérent entre Carte RDC et Analytics.

**Correction** : Faire en sorte que `map-watermark` hérite de `global-watermark` par défaut, avec possibilité de surcharge. Dans `DRCInteractiveMap.tsx`, utiliser `global-watermark` en fallback si `map-watermark` n'est pas surchargé.

### 5. Section `_global` invisible dans l'admin UI

Le `_global` est filtré (`filter(([key]) => key !== '_global')`) dans le sélecteur d'onglets de l'admin. Le watermark global n'est **éditable nulle part** dans l'interface admin.

**Correction** : Afficher `_global` dans la liste des onglets (avec un label "Paramètres globaux") ou l'intégrer comme section en haut de la vue Graphiques.

### 6. Onglet `rdc-map` absent du sélecteur d'onglets

Comme `_global`, l'onglet `rdc-map` est bien enregistré dans le registre mais son apparition dans le sélecteur dépend du filtre `key !== '_global'`. Il est visible, mais pourrait ne pas apparaître dans la gestion des onglets (vue "Onglets"), ce qui empêche de le masquer/renommer dans la section TabManager.

**Correction** : Vérifier que `rdc-map` apparaît dans TabManager. Actuellement, la vue Onglets montre tous les registres sauf `_global`, donc `rdc-map` est bien affiché — mais il ne correspond pas à un onglet analytics réel (c'est un composant séparé). Ajouter un badge "Carte" pour le distinguer.

### 7. Pas de prévisualisation des couleurs de palier

Les couleurs des `map-tier-*` utilisent des valeurs HSL (`hsl(210, 20%, 82%)`), mais le `<input type="color">` HTML ne supporte que le format hex. Les couleurs HSL par défaut ne s'afficheront pas correctement dans le color picker.

**Correction** : Convertir les couleurs HSL en hex pour les valeurs par défaut du registre, ou ajouter une fonction de conversion HSL → hex dans l'admin UI.

### 8. "Service émetteur" — indicateur non fictif mais potentiellement vide

Le graphique `permit-service` dans `parcels-titled` consomme `issuing_service` des permis de construire. Ce champ est bien collecté dans le formulaire permis, mais rarement rempli (formulaire peu utilisé). Le graphique sera souvent vide.

**Pas de suppression nécessaire** — le `hidden` flag s'active déjà quand les données sont vides. L'admin peut le masquer via la config.

### 9. Sauvegarde partielle : `handleSave` ne sauvegarde qu'un onglet

Le bouton "Sauvegarder" dans la vue Graphiques ne sauvegarde que l'onglet actif (`localItems[activeTab]`). Si l'admin modifie plusieurs onglets avant de sauvegarder, seul le dernier actif est sauvegardé. Les modifications non sauvegardées des autres onglets sont perdues silencieusement.

**Correction** : Ajouter un indicateur visuel par onglet (badge "modifié") ET une confirmation si l'admin change d'onglet avec des modifications non sauvegardées.

## Plan d'implémentation

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/hooks/useAnalyticsChartsConfig.ts` | Renuméroter display_order (title-requests, parcels-titled) ; convertir couleurs HSL en hex ; faire fallback map-watermark → global-watermark |
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | Afficher section _global ; badge "modifié" par onglet ; confirmation changement onglet ; badge "Carte" sur rdc-map |
| `src/components/DRCInteractiveMap.tsx` | Fallback watermark vers global-watermark |

3 fichiers modifiés.

