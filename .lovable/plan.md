
Constat rapide

- Ce n’est vraisemblablement pas un problème de z-index pur.
- Le dropdown du `SuggestivePicklist` est déjà rendu avec `zIndex: 10001`, au-dessus du `DialogContent` CCC (`z-[9999]` / overlay partagé).
- Le vrai point faible est surtout son rendu via `createPortal(..., document.body)` dans un `Dialog` Radix modal : le menu reste visible, mais peut devenir non interactif à cause de la gestion Radix des interactions/pointer-events hors de la layer du dialog.
- Le contournement actuel `data-suggestive-dropdown` + `onInteractOutside` est déjà en place, donc le blocage restant vient probablement de cette architecture du dropdown, pas d’un simple empilement visuel.

Plan de correction

1. Refactorer `SuggestivePicklist` pour supprimer le portal manuel vers `document.body`
- Remplacer le dropdown custom par un composant Radix compatible dialog (`Popover` / `PopoverContent`) déjà utilisé dans le projet.
- Utiliser l’input comme ancre et laisser Radix gérer positionnement, focus et interactions.

2. Sécuriser la sélection des options
- Déclencher l’ajout/sélection sur un événement plus fiable en contexte modal/mobile (`onPointerDown` ou logique équivalente), afin d’éviter qu’un blur/close n’empêche le choix.
- Conserver le comportement “ajouter une valeur personnalisée” quand aucune correspondance n’existe.

3. Simplifier la logique devenue fragile
- Retirer la gestion manuelle de `dropdownPos`, `createPortal`, et le listener global `mousedown` si le Popover remplace entièrement le dropdown actuel.
- Nettoyer ensuite le bypass `data-suggestive-dropdown` dans `CadastralContributionDialog.tsx` s’il devient inutile.

4. Vérification transversale
- Tester dans CCC > Localisation > “Sources de bruit à proximité”
- Tester aussi tous les autres usages du composant partagé :
  - CCC > Général / Passé
  - Demande d’expertise > “Commodités à proximité”
- Vérifier sur mobile :
  - sélection d’une suggestion
  - ajout d’une valeur personnalisée
  - fermeture au clic extérieur
  - scroll dans le dialog sans casser le menu

Fichiers concernés

- `src/components/cadastral/SuggestivePicklist.tsx`
- `src/components/cadastral/CadastralContributionDialog.tsx` (nettoyage éventuel)
- éventuellement `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` si un ajustement mineur d’intégration est nécessaire

Choix technique recommandé

- Ne pas continuer à “patcher” le z-index.
- Corriger la cause structurelle en basculant le picklist sur un overlay Radix natif, car c’est l’approche la plus fiable dans un dialog modal et la plus cohérente avec le reste du projet.
