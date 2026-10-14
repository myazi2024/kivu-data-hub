# Bouton « Acheter d'autres visuels » rétractable et déplaçable

## Objectif
Dans le menu Données foncières, après l'achat d'au moins un visuel, le bouton fixe « Acheter d'autres visuels » en haut à gauche encombre l'écran. Il devient rétractable : une fois réduit, seule une petite icône ronde reste visible, et cette icône peut être déplacée n'importe où sur l'écran.

## Comportement prévu
1. **État déplié (défaut)** : la pilule actuelle (icône panier + libellé « Acheter d'autres visuels ») reste au même endroit la première fois, avec un petit chevron de réduction.
2. **État réduit** : la pilule se replie en une petite icône ronde (panier). Un clic sur l'icône ouvre le catalogue des données, comme aujourd'hui.
3. **Réduction / réouverture** : un chevron dédié bascule entre les deux états ; la réduction ne déclenche pas l'ouverture du catalogue.
4. **Déplacement** : la pilule et l'icône réduite sont déplaçables au doigt ou à la souris ; la position choisie est mémorisée sur l'appareil (localStorage) et conservée d'une session à l'autre, recadrée si l'écran change (rotation, redimensionnement). Par défaut, la position actuelle (haut gauche, sous la navigation) est conservée.
5. **Mobile** : la position tient compte des zones sûres (encoche, barres système) et l'élément reste toujours entièrement visible, jamais coupé en bord d'écran.
6. **Clavier et accessibilité** : la pilule et l'icône restent de vrais boutons accessibles au clavier (Entrée ouvre le catalogue), avec un état agrandi visible (focus), le nom accessible conservé et le chevron avec un nom explicite (« Réduire » / « Développer ») ; le déplacement tactile garde un seuil pour distinguer un simple tap d'une glissade.
7. **Animation discrète** : transition courte entre pilule et icône, désactivée si l'utilisateur préfère moins de mouvement (prefers-reduced-motion).

## Détails techniques
- Nouveau composant `src/components/access/FloatingAnalyticsShopButton.tsx` : gère les deux états, le déplacement par événements pointeur, la persistance (clé dédiée, ex. `bic-analytics-shop-fab`), le recadrage au viewport et le rendu de la pilule ou de l'icône ; il encapsule `AnalyticsCatalogDialog` (le dialogue reste inchangé).
- `PurchasedAccessGate` dans `src/components/access/LandDataAccessGate.tsx` remplace le bouton fixe actuel par ce composant ; aucune autre page n'est concernée.
- Pas de changement back-end : tarifs, catalogues, paiements et accès restent tels quels.
- Styles avec classes sémantiques uniquement (bg-background, text-foreground, etc.), pas de couleur codée en dur.

## Vérifications
- Test existant `LandDataAccessGate.test.tsx` : le nom accessible « Acheter d'autres visuels » reste présent à l'état déplié.
- Nouveau test : basculement réduit/déplié, ouverture du catalogue, persistance de la position, libellé accessible de l'icône réduite.
- Contrôle visuel sur 360 × 613 et ordinateur : pilule, icône réduite, déplacement, aucun chevauchement avec la navigation ; prefers-reduced-motion respecté.
