# Distinguer le bouton « Calquer sur la parcelle » du bouton « Tracer une construction »

## Contexte actuel (vérifié dans le code)

Dans `src/components/cadastral/ParcelMapPreview.tsx`, le bouton « Tracer une construction » (icône `Building2`) et le bouton « Calquer sur la parcelle » (icône `Copy`) sont rendus **dans la même colonne** d'icônes en haut à droite (`absolute top-2 right-2 z-[1000] flex flex-col gap-1.5`, lignes 2548–2660).

En mode tracé (`isDrawingBuilding = true`) :
- Le bouton `Building2` devient rouge et sert d'« Annuler le tracé » (lignes 2567–2604).
- Le bouton « Calquer » (icône `Copy`, lignes 2607–2625) apparaît juste en dessous, en `h-8 w-8`, contour blanc, `rounded-xl`, `shadow-md` — **identique visuellement** au style des autres icônes de la pile, avec un seul écart `gap-1.5` (~6 px).

Résultat : les deux boutons se confondent en une même pile d'icônes carrées blanches ; l'utilisateur ne distingue pas le bouton « Calquer » du contrôle de tracé, d'où l'impression de superposition.

## Changement

Rendre le bouton « Calquer sur la parcelle » **visuellement distinct et séparé** du bouton « Tracer une construction » :

1. **Sortir le bouton « Calquer » de la pile d'icônes** de droite. Le placer dans une zone dédiée, sous la pile d'icônes (ex. un nouveau bloc `absolute top-2 right-2` décalé vers le bas, ou un container séparé avec `mt`), de façon à ne plus être accolé au bouton `Building2`.
2. **Le transformer en bouton libellé** (icône `Copy` + texte « Calquer sur la parcelle »), au lieu d'un bouton icône 8×8, pour qu'il soit immédiatement identifiable comme une action nommée.
3. **Couleur d'accent distincte** (par ex. `primary`/indigo) pour le démarquer des boutons blancs de la pile d'icônes.
4. **Conserver l'infobulle** descriptive (« Calquer sur la parcelle : trace automatiquement la construction avec les mêmes dimensions et la même forme que la parcelle. »).
5. **Garder la condition d'affichage** existante : visible uniquement en mode tracé (`isDrawingBuilding`) et quand la parcelle a ≥ 3 sommets valides ; `onClick` appelle toujours `traceBuildingFromParcel`.
6. Aucune modification de la logique `traceBuildingFromParcel` ni du bouton « Tracer une construction » lui-même.

## Détails techniques

- Fichier concerné : `src/components/cadastral/ParcelMapPreview.tsx` (lignes ~2606–2625).
- Déplacer le bloc `Calquer` hors du container `flex flex-col gap-1.5` (lignes 2548–2660) dans un container séparé positionné juste en dessous (ex. `absolute top-[calc(2rem+...) right-2` ou un wrapper `flex flex-col gap-2 mt-2`), afin qu'il y ait un vrai espace entre la pile d'icônes et le bouton libellé.
- Bouton : `size="sm"`, classe type `gap-1.5 px-3 h-8 rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90`, avec `<Copy className="h-4 w-4" />` + texte « Calquer sur la parcelle ».
- Aucune dépendance, aucun changement de schéma, aucun impact validation.

## Non concerné

- La logique de `traceBuildingFromParcel` (copie des sommets de la parcelle, calcul côtés/superficie/périmètre, rattachement `linkedIndex`) reste inchangée.
- Le bouton « Tracer une construction » et son comportement reste inchangé.
