# Carte : retirer les boutons « Réinitialiser » et « Info » en bas à droite

## Ce qui est affiché aujourd'hui dans le bloc carte

Le petit groupe de boutons ronds en bas à droite contient 4 boutons :

1. **Réinitialiser** (icône flèche circulaire) — n'apparaît que quand un mode visuel est actif ; il ramène la carte à la vue par défaut.
2. **Partager** — conserve.
3. **Plein écran** — conserve.
4. **Info** (icône « i ») — ouvre une petite fiche avec trois lignes : « Données calculées depuis Supabase — table … », « Couleur = … », « Paliers calculés par quartiles ».

Deux constats qui confirment votre demande :

- **Réinitialiser est devenu inutile** : depuis la suppression du bandeau, la carte des circonscriptions est la vue par défaut et le retour en arrière existe déjà (bouton de retour dans la carte, « Retirer de la carte », retrait du filtre). Ce bouton ne faisait que sortir d'un mode visuel.
- **Info répète la légende** : la légende en haut à droite affiche déjà le nom de l'indicateur affiché et les couleurs avec leurs paliers. La fiche n'apportait qu'une mention technique (nom de la table en base) et une précision sur le calcul des paliers.

## Corrections proposées

- Supprimer le bouton **Réinitialiser** et le bouton **Info** (et sa fiche déroulante).
- Conserver **Partager** (toujours réglable côté administration) et **Plein écran** (raccourci clavier F conservé).
- Le groupe de boutons ne contient plus que deux boutons, toujours en bas à droite, mêmes tailles (44 px sur mobile).
- Sans sélection ni mode visuel, rien d'autre ne change dans le bloc carte.

## Détails techniques

- `src/components/DRCInteractiveMap.tsx`
  - Retrait du bouton réinitialiser et du bloc `Popover` d'information dans le groupe `absolute bottom-5 right-2` (≈ lignes 645-706).
  - Nettoyage du code devenu sans usage : `resetToDefaultMap` (≈ ligne 316) et l'état `forcedTab` / `setForcedTab` / `handleForcedTabApplied` (ligne 77, 322) qui n'avaient d'autre consommateur que ce bouton.
  - Importations devenues inutiles retirées : `Popover, PopoverContent, PopoverTrigger`, et les icônes `Info`, `RotateCcw`, `MapPin` (utilisées uniquement dans ces deux blocs). L'icône `Database`, déjà sans usage nulle part, est retirée au passage. `BarChart3`, `Clock`, `Loader2`, `Maximize`, `Minimize` restent utilisés.
  - Les props `forcedTab` / `onForcedTabApplied` passées au panneau de graphiques sont retirées.
- `src/components/visualizations/ProvinceDataVisualization.tsx`
  - Retrait des props `forcedTab` / `onForcedTabApplied` (≈ lignes 82-85) et de l'effet qui les appliquait (≈ lignes 96-106) : ce composant n'est utilisé que par la carte, et l'effet était explicitement prévu « pour le bouton Reset ». Le commentaire qui le précise est retiré avec lui.
- Aucun changement de base de données, de réglages d'administration ni du réglage « Bouton copier image ».

## Vérification

- Suite de tests `bun run test`, contrôle de compilation `tsgo --noEmit -p tsconfig.app.json`, build.
- Vérification visuelle à faire de votre côté (page réservée à certains rôles) : en bas à droite il ne reste que « Partager » et « Plein écran » ; le mode visuel d'un graphique s'arrête par « Retirer de la carte » ou le bouton de retour ; la légende en haut à droite continue d'expliquer les couleurs.
