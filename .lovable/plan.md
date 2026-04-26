## Problèmes identifiés sur mobile (viewport ~360 px)

Audit du formulaire `SubdivisionRequestDialog` et de ses 6 étapes :

1. **Dialogue trop étroit** — `max-w-3xl` + `rounded-2xl` mais aucune adaptation full-screen mobile. Les marges latérales par défaut du `DialogContent` rognent fortement la surface utile.
2. **Navigation des étapes (stepper)** — Sur mobile les libellés (`shortLabel`) sont masqués (`hidden sm:inline`), il ne reste que des icônes sans contexte. La barre déborde quand 6 étapes + connecteurs sont alignés.
3. **Footer de navigation** — `Précédent`, dots de progression et `Suivant`/`Payer` sont sur la même ligne avec `justify-between` : sur 360 px le bouton « Payer & soumettre (xxx$) » se chevauche/déborde, et le hint « Renseignez : … » à droite est tronqué.
4. **Étape « Conception des lots » (StepLotDesigner)** — la plus impactée :
   - Toolbar `flex flex-wrap` empile mal (séparateurs verticaux `h-8`, badges) → désordre visuel.
   - Layout `grid lg:grid-cols-3` → en mobile le canvas SVG (600×400, `min-h: 280`) prend toute la largeur, puis le panneau « détails du lot » descend en bas — l'utilisateur doit beaucoup scroller pour passer du canvas aux contrôles.
   - Le canvas SVG accepte uniquement les events `onMouseDown/Move/Up` → **aucun support tactile** (touch/pointer events) → la sélection, le glisser, la coupe et le pan/zoom sont quasi-inutilisables au doigt.
   - Hint « Ctrl+clic / ⌘+clic » non pertinent sur mobile.
5. **StepParentParcel** — `grid-cols-2` pour les infos parcelle reste lisible mais peut être passé en `grid-cols-1` sur très petits écrans.
6. **StepSummary** — plusieurs tableaux dans `overflow-x-auto` (OK) ; vérifier que le bandeau de succès `max-w-sm` reste centré.
7. **Banner « brouillon restauré »** — `flex justify-between` peut se serrer sur mobile, à passer en `flex-col` < `sm`.
8. **WhatsAppFloatingButton** — vérifier qu'il ne masque pas le footer du dialogue sur mobile.

## Plan d'optimisation

### 1. `SubdivisionRequestDialog.tsx`
- `DialogContent` : ajouter classes responsives `w-[100vw] h-[100dvh] max-w-none rounded-none sm:w-auto sm:h-auto sm:max-w-3xl sm:max-h-[92vh] sm:rounded-2xl` pour passer en full-screen sous `sm`.
- Stepper : passer en scroll horizontal contrôlé (`overflow-x-auto -mx-4 px-4 snap-x`), garder le `shortLabel` visible sur mobile (retirer `hidden sm:inline`) avec une taille `text-[10px]`. Réduire les connecteurs `w-4` à `w-2` < `sm`.
- Footer : passer en `flex-col sm:flex-row` ; mettre les dots de progression au-dessus et la rangée boutons en `justify-between` ; déplacer le hint « Renseignez : … » sur sa propre ligne au-dessus du bouton Suivant ; rendre le bouton « Payer & soumettre » full-width sur mobile et remonter le montant sur une ligne dédiée.
- Banner brouillon : `flex-col sm:flex-row sm:items-center` pour éviter le chevauchement.
- Ajuster `maxHeight: calc(100dvh - 200px)` mobile vs `calc(92vh - 180px)` desktop pour la zone scrollable.

### 2. `StepLotDesigner.tsx`
- Toolbar : passer le bloc Outils + Actions + État en disposition empilée mobile avec scroll horizontal des boutons (`flex overflow-x-auto`), retirer les séparateurs verticaux sous `sm`, garder badges en bas.
- Layout principal : conserver `lg:grid-cols-3` mais sur mobile rendre le **panneau de détails du lot sticky** au-dessus ou en bas (sticky drawer / collapsible) pour éviter le scroll inutile entre canvas et contrôles. Solution simple : utiliser un `Sheet` (Radix dialog côté droit/bottom) pour afficher le détail du lot sélectionné sur mobile, et garder le panneau inline sur ≥ `lg`.
- Hint « Ctrl+clic » : masquer sous `sm` ou remplacer par « Maintenez appuyé pour multi-sélection ».
- Augmenter `min-h` du canvas mobile à 320–360 px pour rester utilisable, ajouter padding bottom safe.

### 3. `LotCanvas.tsx` — support tactile
- Ajouter handlers `onPointerDown / onPointerMove / onPointerUp` (ou `onTouchStart/Move/End`) en miroir des handlers souris déjà présents, en utilisant `pointerType` pour normaliser. Appeler `e.preventDefault()` dans `touchmove` pour éviter le scroll page pendant le glisser.
- Ajouter `style={{ touchAction: 'none' }}` sur le SVG pour permettre pan/zoom custom sans interférence du scroll natif.
- Adapter le « road width drag » (handles 7×7 px) : augmenter à 12×12 sur écran tactile (détecter via `matchMedia('(pointer: coarse)')` ou simplement toujours plus grand sur mobile).
- Pinch-to-zoom basique : détecter 2 pointers actifs et adapter `viewport.zoom`.

### 4. `StepParentParcel.tsx`
- `grid grid-cols-2 gap-3` → `grid grid-cols-1 sm:grid-cols-2`.
- Bandeau d'éligibilité : OK (déjà `flex items-start`).

### 5. `StepSummary.tsx`
- Vérifier que les `grid-cols-2` restent lisibles ; passer en `grid-cols-1 xs:grid-cols-2` au besoin et confirmer que les tableaux gardent leur scroll horizontal.

### 6. Assurance qualité
- Tester chaque étape en 360×800 et 414×896 (preview mobile).
- Vérifier que les toggles `ELEMENT_TOGGLES` de `StepPlanView` restent accessibles (déjà `lg:col-span-3` + side panel — passer le panneau en collapsible sur mobile).
- Vérifier que le `WhatsAppFloatingButton` ne recouvre pas le footer (lui ajouter `bottom-20 sm:bottom-4` si nécessaire).

## Fichiers impactés

- `src/components/cadastral/SubdivisionRequestDialog.tsx`
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx`
- `src/components/cadastral/subdivision/steps/StepParentParcel.tsx`
- `src/components/cadastral/subdivision/steps/StepPlanView.tsx`
- `src/components/cadastral/subdivision/steps/StepSummary.tsx` (ajustements mineurs)
- `src/components/cadastral/subdivision/LotCanvas.tsx` (support pointer/touch + handles plus larges)

## Hors-scope (à confirmer avant implémentation si souhaité)

- Refonte complète du canvas en `react-konva` ou `react-pixi` : non — on ajoute simplement le support tactile au moteur SVG existant.
- Modification de la logique de validation/soumission : aucune.
- Modification des étapes Documents/Infrastructures (déjà raisonnablement responsives) : seulement vérification visuelle.

Une fois le plan approuvé, je passerai en mode build pour appliquer les changements.