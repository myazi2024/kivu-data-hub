

## Plan — Auto-charger la parcelle mère comme lot par défaut (onglet Lots)

### Objectif

Supprimer l'action manuelle « **+ Lot = parcelle entière** » et créer automatiquement un lot couvrant toute la parcelle mère dès l'arrivée de l'utilisateur dans l'onglet **Lots**, lorsque aucun lot n'existe encore.

### Constat

- L'utilisateur a déjà sélectionné/validé sa parcelle mère à l'étape précédente (onglet **Parcelle**).
- À l'arrivée dans l'onglet **Lots**, il fait face à un canvas vide + une alerte « Commencez par créer le lot parcelle entière… » + un bouton dédié.
- Cette étape est purement mécanique : il n'existe aucun cas réaliste où l'utilisateur ne voudrait *pas* partir de la parcelle entière comme base. C'est une friction sans valeur ajoutée.
- La fonction `createInitialLot` dans `useSubdivisionForm.ts` est déjà robuste (vérifie `parentParcel`, `parentVertices`, n'écrase pas un lot existant).

### Livrables

#### 1. Auto-création à l'entrée de l'onglet (`useSubdivisionForm.ts`)

Ajouter un `useEffect` qui appelle `createInitialLot()` automatiquement dès que :
- `parentParcel` est défini
- `parentVertices.length >= 3`
- `lots.length === 0`
- aucun draft existant n'a déjà restauré des lots (sinon on respecte la reprise de brouillon)

Ce hook s'exécute une seule fois (gardé par `lots.length === 0`), donc invisible pour l'utilisateur qui revient sur l'onglet après avoir découpé.

#### 2. Nettoyage UI — `StepLotDesigner.tsx`

- Retirer le bouton conditionnel **« + Lot = parcelle entière »** (lignes 862-877) ainsi que la prop `onCreateInitialLot` (devenue inutile en UI).
- Garder uniquement le bouton **« Ajouter un lot »** comme action permanente dans la zone Actions.
- Mettre à jour l'alerte pédagogique (lignes 933-943) : remplacer « Commencez par créer le lot parcelle entière… » par « Votre parcelle est chargée comme lot unique. Utilisez **Diviser un lot** pour la découper. »
- Mettre à jour le placeholder du panneau latéral (ligne 1230) : remplacer « Cliquez sur "Lot parcelle entière" puis tracez… » par « Tracez une ligne entre deux bords pour diviser le lot. »

#### 3. Nettoyage de l'API parent (`SubdivisionRequestDialog.tsx`)

- Retirer la prop `onCreateInitialLot={form.handleAutoSubdivide}` (ligne 240) — devenue interne.

#### 4. Conserver `createInitialLot` dans le hook

- La fonction reste exportée comme `handleAutoSubdivide` au cas où d'autres flux (ex. reset, bouton « Repartir de zéro » futur) en auraient besoin, mais elle n'est plus exposée côté UI.

### Détails techniques

- **Reprise de brouillon** : le brouillon (`subdivision-draft-v2-…`) restaure d'abord les lots existants ; le `useEffect` d'auto-création ne se déclenche que si `lots.length === 0` *après* hydratation, donc pas de double création.
- **Historique undo/redo** : la création initiale passe par `pushHistory`, donc l'utilisateur peut « Annuler » s'il veut revenir à un canvas vide (cohérent avec le comportement actuel du bouton).
- **Pas d'effet sur l'admin / edge function** : la modification est purement front, aucune migration BD.

### Vérification

1. Compléter l'onglet Parcelle, passer à l'onglet Lots → un lot vert couvrant toute la parcelle est déjà présent.
2. L'alerte indique « Utilisez Diviser un lot pour la découper ».
3. Le bouton « Lot = parcelle entière » a disparu ; seul « Ajouter un lot » reste.
4. Découper le lot → toujours fonctionnel.
5. Recharger la page (brouillon) → les lots persistés sont restaurés sans duplication.
6. Annuler après l'auto-création → canvas vide, possibilité de redo.

### Fichiers modifiés

- `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` (ajout `useEffect`)
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (suppression bouton + textes)
- `src/components/cadastral/SubdivisionRequestDialog.tsx` (suppression prop)

