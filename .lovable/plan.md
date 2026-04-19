
## Remplacement de l'explication contextuelle sous le picklist du type de titre

### Cible
`src/components/cadastral/PropertyTitleTypeSelect.tsx`, lignes 165-169.

### Constat
Le bloc affiche actuellement `selectedType?.description`, qui change selon le titre choisi (ex: « Document administratif prouvant l'enregistrement d'un droit foncier » pour le certificat). L'utilisateur veut une consigne **générique et stable**.

Les `description` propres à chaque type restent utiles dans le popover d'info détaillé (ligne 148) — on ne les supprime pas, on cesse simplement de les afficher sous le select.

### Modification
Remplacer le rendu conditionnel actuel par une phrase unique, toujours visible (sauf quand « Autre » est choisi, car un champ dédié apparaît à la place) :

> « Sélectionnez dans la liste le document administratif ou le titre foncier attestant l'enregistrement d'un droit sur cette parcelle, qu'il soit établi au nom du propriétaire actuel ou non. »

Reformulation pro : verbe à l'impératif soutenu, « attestant » plus juridique que « prouvant », tournure « au nom du propriétaire actuel ou non » plus fluide.

### Affichage
- Visible en permanence sous le picklist (avant et après sélection) pour guider l'utilisateur dès l'ouverture.
- Masquée uniquement quand `value === 'Autre'`, car le bloc « Nom du titre de propriété » prend déjà en charge le cas particulier.

### Hors scope
- Aucun changement aux popovers d'info par titre (ils gardent `description` + `details`).
- Aucun changement aux types, aux helpers, ni aux autres composants consommateurs.
