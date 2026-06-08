## Objectif

Onglet **Valeur marchande** (`src/components/cadastral/ccc-tabs/MarketValueTab.tsx`) :
1. Ajouter une **infobulle intelligente** sur le champ « prix de revente » (Oui → Montant).
2. Enrichir chaque carte de local vacant avec **Année de construction**, **Environnement sonore**, et un **uploader d'images de couverture** (1 à 10 photos, ≤ 5 Mo chacune, JPG/PNG/WebP, **au moins 1 obligatoire** pour publier).

## Détails fonctionnels

### 1. Infobulle prix de revente
- Composant existant `InputWithPopover` (`src/components/cadastral/InputWithPopover.tsx`) — déjà conçu pour ce cas (auto-déclenche au focus, se ferme dès saisie). On remplace l'`<Input>` du champ « Montant » (visible quand `wouldSell === true`) par `<InputWithPopover>`.
- Titre : « Comment estimer la valeur marchande ? »
- Texte (≈ 320 car.) : « Pour estimer un prix réaliste, comparez votre parcelle (vide ou bâtie) aux **3 biens voisins** les plus similaires (emplacement, mise en valeur, dimensions) **récemment vendus**, puis calculez la **moyenne** de leurs prix. Cette moyenne vous donne la valeur marchande minimale à laquelle vous pouvez raisonnablement vendre. »
- Déclenchement immédiat (focus) au lieu du délai de 5 s par défaut → ajout d'une prop optionnelle `triggerImmediately` à `InputWithPopover` (rétrocompatible, défaut conservé à 5 s).

### 2. Carte de local vacant enrichie
Dans `buildVacantTargets` (fonction interne du tab), on enrichit chaque `Target` avec :
- `constructionYear?: number` — lu dans `formData.constructionYear` (main) ou `c.constructionYear` (additionnelle).
- `soundEnvironment?: string` — toujours `formData.soundEnvironment` (donnée de la parcelle, partagée par tous les locaux ; mémoire `sound-environment-centralization-fr`).

Affichage dans la ligne « meta » de chaque local (à côté de Type/Nature/Matériaux/Standing) :
- « Année : 2018 »
- « Environnement sonore : Calme »

### 3. Images de couverture par local
- Extension du type `MarketListingEntry` : `coverImageUrls?: string[]` (max 10).
- Nouveau sous-composant inline ou réutilisation : `StorageFileUpload` accepte un seul fichier. On crée donc un mini-gestionnaire local (liste + bouton « Ajouter une image » + suppression individuelle) qui appelle `StorageFileUpload` en boucle ou en mode « ajout ». Approche retenue : afficher la grille de vignettes des URLs existantes + un `StorageFileUpload` réinitialisé à chaque upload pour ajouter une image supplémentaire (désactivé quand 10 atteintes).
- Bucket : `cadastral-documents` (public, déjà utilisé pour `appraisal-reports`), prefix `market-listings/`.
- Contraintes : `accept="image/jpeg,image/png,image/webp"`, `maxSizeMB={5}`, `isPublic={true}`.
- **Au moins 1 image obligatoire** quand `listForRent === true` : ring rouge + message d'erreur sous l'uploader si vide et `highlightRequiredFields=true`. La validation effective de blocage de soumission est portée dans `useFormValidation.ts` (règle additionnelle : pour chaque listing `listForRent`, `coverImageUrls.length >= 1`).
- Bouton « Suivant » du tab : on ajoute un garde local — si une carte cochée n'a pas d'image, scroll vers la carte + toast « Ajoutez au moins une image de couverture pour chaque local proposé. »

### 4. Validation (`src/hooks/ccc/useFormValidation.ts`)
- Ajouter une règle dans la section market-value : pour chaque entrée de `marketListings` avec `listForRent === true`, exiger `coverImageUrls.length >= 1`. Message : « Au moins une image de couverture est requise pour chaque local proposé à la location. »

## Fichiers à modifier

- `src/components/cadastral/InputWithPopover.tsx` — prop `triggerImmediately?: boolean` (sans casser l'existant).
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` — infobulle + enrichissement targets + uploader d'images.
- `src/hooks/ccc/useFormValidation.ts` — règle « au moins 1 image par listing ».

## Hors-périmètre

- Pas de migration DB : `coverImageUrls` est sérialisé dans la colonne JSONB `market_listings` (existante via `useCadastralContribution.tsx`). Vérifier que le payload builder propage bien le tableau (pas de stripping). Si nécessaire, ajustement mineur dans `useCadastralContribution.tsx`.
- Pas de changement de bucket Storage.
- Pas de modification du backend ni des admin views.

## Étapes

1. Étendre `InputWithPopover` (prop optionnelle).
2. Étendre `MarketListingEntry` (type) + builder de payload si besoin.
3. Mettre à jour `MarketValueTab.tsx` (infobulle, meta enrichie, uploader multi-images, garde nav).
4. Ajouter la règle de validation dans `useFormValidation.ts`.
5. Test manuel : Oui/Non revente, focus du champ montant, ajout/suppression de 3 images, blocage sans image.
