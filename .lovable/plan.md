# Refonte de la saisie d'un côté — Limites et Entrées (onglet Localisation)

## Nouveau parcours

1. **Clic n'importe où sur un côté vierge** : le côté s'ouvre directement sur **« Limite de la parcelle \* »** (Mur / Mur mitoyen / Limite (sans mur)). Plus besoin de choisir d'abord une pastille Mur ou Route.
2. **Mur ou Limite (sans mur)** sélectionné :
   - Mur : matériau (obligatoire) et hauteur (facultative), comme aujourd'hui.
   - Puis, en dessous, la question **« Une route borde-t-elle ce côté ? »** avec deux boutons **Oui / Non** (aucun choix par défaut).
3. **Oui** : le bloc **« Informations sur la route »** s'ouvre (type, nom, largeur, revêtement, éclairage, caniveau — inchangés).
   **Non** : rien de plus ; les informations de route éventuellement saisies sont effacées.
4. **Mur mitoyen** : la question route n'est pas posée (une route ne peut pas border un mur mitoyen), les informations de route sont effacées.
5. **Bouton « Ajouter »** : exige la limite choisie, le matériau pour un mur, une réponse Oui/Non (sauf mur mitoyen) et, si Oui, les champs route obligatoires. « Annuler » vide le côté comme aujourd'hui.

## Ce qui change à l'écran

- Les pastilles **Mur / Route** de chaque côté sont retirées (remplacées par ce parcours). La case **Entrée** et le résumé du côté confirmé restent identiques ; le bouton de modification d'un côté confirmé rouvre le même parcours, pré-rempli.
- Message d'accueil reformulé : « Touchez un côté pour indiquer sa limite, puis précisez si une route le borde. »
- Les dossiers déjà enregistrés s'ouvrent sans perte : un côté avec route déclarée affiche « Oui » ; un ancien côté « route seule » sans limite demandera simplement de choisir la limite à la modification.

## Détails techniques

- Fichier principal : `src/components/cadastral/ParcelSidesDimensionsPanel.tsx`.
  - `handleStartEdit(index)` : `bordersRoad: true, hasWall: true, hasRoad: undefined`, ouvre l'édition (limite d'abord).
  - Nouveau choix Oui/Non (`RadioGroup` horizontal) affiché si `boundaryKind` est `mur` ou `limite` ; Oui → `hasRoad: true, borderType: 'route'` ; Non → `hasRoad: false, borderType: 'mur_mitoyen', ...ROAD_FIELDS_RESET`.
  - `hasRoad` reste `undefined` tant que l'utilisateur n'a pas répondu ; `canConfirm` exige `boundaryKind`, `hasRoad !== undefined` (hors mur mitoyen) et les champs route si `hasRoad`.
  - Suppression de `BorderTypeToggle` et `toggleBorderType` ; `handleBoundaryKindChange('mur_mitoyen')` conserve la purge de la route.
- Aucune migration : `road_sides` est en jsonb ; le trigger serveur existant (mur mitoyen + route refusé, matériau exigé pour les murs) reste valable. Affichages (récapitulatif, fiche cadastrale, admin, carte) inchangés car ils lisent déjà `boundaryKind` et `hasRoad`.
- Vérification : typecheck et tests existants.
