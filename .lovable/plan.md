

## Problème
Le `CadastralCartButton` flottant (bottom-left) est trop volumineux : `h-14`, badge prix toujours visible, occupe une zone importante en mobile/tablette (875×454).

## Solution — Bouton compact + Sheet arrondie

### 1. Bouton flottant compact (`CadastralCartButton.tsx`)
- Réduire à `h-11 w-11` rond (icône seule), badge compteur seul en overlay.
- Supprimer l'affichage permanent du prix (`$X.XX`) — visible uniquement à l'ouverture.
- Conserver position `fixed bottom-3 left-3 z-[1000]`, ajouter `rounded-full shadow-lg`.
- Ajouter un tooltip natif (`title`) avec total + nb services pour rester informatif sans encombrer.

### 2. Sheet arrondie et moins envahissante
- Largeur réduite : passer de `sm:max-w-md` à `sm:max-w-sm` (≈384px).
- Ajouter coins arrondis côté contenu : `rounded-r-2xl` (puisque side="left").
- Gérer le cas mobile (<640px) où le Sheet prend `w-3/4` par défaut → ajouter `max-w-[85vw]` pour ne jamais dépasser.

### 3. Détails visuels
- Ombre plus douce : `shadow-lg` au lieu de `shadow-xl`.
- Badge compteur : conserver positionnement `-top-1 -right-1`, taille `h-4 min-w-4 text-[10px]`.

### Fichier touché
- `src/components/cadastral/CadastralCartButton.tsx` uniquement (bouton + props SheetContent).

Aucun changement à la logique panier, aux analytics, au paiement.

