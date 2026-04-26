## Audit — Onglet "Lots" (StepLotDesigner) du formulaire de demande de lotissement

Périmètre audité : `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (1 495 lignes), `LotCanvas.tsx`, `types.ts`, `utils/geometry.ts` (validateSubdivision), `useZoningCompliance`, `hooks/useCanvasDrag.ts`.

Cet audit ne touche à aucun fichier ; il liste constats + propositions. Aucune action n'est exécutée tant que vous ne validez pas les correctifs souhaités.

---

### 1) Ce qui ne va pas (bugs / incohérences)

**B1 — Conversion lot ➜ voie/espace : utilise `Math.sqrt(parentAreaSqm)` au lieu du metricFrame**
`handleConvertSelectedZone` (ligne 290) calcule `sideLengthM = √(parentAreaSqm)`, hypothèse "parcelle carrée isotrope". Or le designer dispose déjà d'un `metricFrame` GPS précis (ligne 150). Conséquence : largeur de voie déformée si la parcelle est allongée ou orientée. Mêmes approximations dans `handleFinishRoadDraw` (l. 541, 615), `handleConvertEdgeToRoad` (l. 674) et `handleUpdateRoad` (l. 751).

**B2 — Bouton "Lot" du sélecteur "Type de zone" est inerte mais affiché comme actif**
Lignes 1048-1057 : `onClick={() => { /* déjà un lot */ }}`. C'est un piège visuel : l'utilisateur clique et rien ne se passe, sans feedback.

**B3 — `handleSplitLot` casse les polygones non convexes**
Ligne 318 : on coupe en joignant les milieux de l'arête la plus longue et de l'arête "opposée" (`(idx + n/2) % n`). Pour un polygone en L ou très irrégulier, le segment passe à l'extérieur du polygone et produit deux lots qui se chevauchent ou aux surfaces aberrantes.

**B4 — `handleMergeLots` utilise une enveloppe convexe (convex hull)**
Ligne 414 : `convexHull(allPoints)` sur l'union des sommets. Si deux lots adjacents ne sont pas convexes ensemble, le résultat **englobe une zone qui n'appartenait à aucun des deux lots** (peut "manger" une voie ou un espace commun voisin). Il faudrait une vraie union polygonale (ex. clipper / polygon-clipping).

**B5 — `validateSubdivision` est trop laxiste sur la couverture**
`utils/geometry.ts` ligne 499 : tolérance de **10 %** au-dessus de la parcelle mère acceptée sans erreur. Un lotissement peut donc dépasser légalement la parcelle. La règle métier devrait au plus tolérer 1 à 2 % (erreurs d'arrondi).

**B6 — Pas de vérification "lots dans la parcelle mère"**
La validation détecte les chevauchements entre lots mais **pas** les lots qui sortent du polygone parent. Combiné avec les drags qui clampent à `[0,1]` (`useCanvasDrag.ts` l. 89), un lot peut déborder de la forme officielle si celle-ci n'est pas un rectangle 0-1.

**B7 — Numérotation des lots fragile**
`maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0)` (l. 219, 260, 374…). Si l'utilisateur renomme un lot en "A1" ou "Lot-12", `parseInt` renvoie `NaN` ou `12` et la séquence se brise. Aucune unicité forcée à la saisie (le doublon n'est repéré qu'au moment de la validation finale).

**B8 — `selectedLotIds` réinitialisé à chaque clic mono-sélection mais l'inverse n'est pas vrai**
`setSelectedLotId` ne vide pas `selectedLotIds` (l. 131). Inversement `handleToggleLotSelection` met `selectedLotId` à `null` (l. 403). État incohérent possible : un lot sélectionné en single + plusieurs en multi.

**B9 — Annotations "clipart" obsolètes mais toujours dans le type**
`types.ts` l. 3-11 : `LotAnnotation` est marquée "deprecated" mais reste référencée par `updateLotAnnotations` et passée au canvas. Code mort qui complique la maintenance.

**B10 — Surface du lot non recalculée après `updateSelectedLot`**
`updateSelectedLot` (l. 244) modifie n'importe quel champ y compris (théoriquement) `vertices` sans recalcul d'aire/périmètre — heureusement ce chemin n'est utilisé que pour des champs métier, mais il n'y a aucun garde-fou.

---

### 2) Ce qui est absent (fonctionnalités attendues manquantes)

**M1 — Aucune édition numérique d'un lot**
Impossible de saisir directement la **surface cible** (ex. "200 m²"), la **largeur**, la **profondeur** ou les **coordonnées GPS** d'un sommet. Tout passe par drag à la souris, ce qui rend la précision millimétrique impossible — bloquant pour un dossier admin.

**M2 — Pas d'auto-découpage en N lots équivalents**
Cas d'usage très courant : "diviser en 6 lots de 250 m² alignés le long de la voie". Aucun outil "grille auto" / "lots équivalents N×M" n'existe.

**M3 — Pas de contrainte d'accès à la voie publique**
Aucune validation ne vérifie que **chaque lot touche au moins une voie**. Un lot enclavé est accepté sans alerte — anomalie réglementaire majeure en RDC.

**M4 — Pas de contrôle des dimensions règlementaires par usage**
Le standard RDC impose des seuils (ex. résidentiel ≥ 200 m², façade min, recul). Le hook `useZoningCompliance` existe mais ne semble pas alimenter les warnings du panneau Lots.

**M5 — Pas de copier-coller de propriétés**
Impossible d'appliquer en un clic l'usage / propriétaire / clôture d'un lot à plusieurs autres ; chaque lot doit être édité individuellement.

**M6 — Pas de renommage en masse / numérotation auto**
Aucun bouton "renuméroter 1…N" après une suite d'opérations split/merge qui crée des trous (Lot 3, 5, 7, 12…).

**M7 — Pas d'undo/redo granulaire visible**
Les boutons existent mais aucune indication de l'action qui sera annulée ; pas d'historique listé.

**M8 — Pas de verrou par lot**
Une fois un lot finalisé, impossible de le "verrouiller" pour éviter qu'il ne soit déplacé accidentellement par un drag ultérieur. Seul `isParentBoundary` est verrouillable.

**M9 — Pas de calcul de "lots vendables" / synthèse fiscale**
La barre d'état affiche `% couvert` mais pas : nb de lots résidentiels, surface vendable nette (lots − voies − espaces communs), ratio de servitude.

**M10 — Pas de validation "minimum 15 % d'espaces communs"**
Règle de lotissement courante : aucun warning si la part d'espaces communs / voirie est trop faible.

**M11 — Aucune gestion d'orientation / façade par lot**
Pas de champ "façade principale", "orientation cardinale", "n° de borne" — pourtant utiles pour le titre futur de chaque sous-parcelle.

**M12 — Pas d'export du tableau des lots**
Impossible d'exporter en CSV la liste des lots avec surfaces/usages/propriétaires depuis cet onglet (sans passer par le récapitulatif final).

---

### 3) Ce qui est à optimiser (qualité / UX / architecture)

**O1 — Le composant fait 1 495 lignes (monolithe)**
Mélange : géométrie (convex hull, intersections), state UI, panneau de droite, listes voies/espaces/servitudes. À éclater par responsabilité (cf. `mem://architecture/complex-dialog-modularization-strategy-fr` qui impose ce pattern au-delà de 1000 l.) :
- `LotDesignerToolbar` (zones outils/actions/état)
- `LotDetailsPanel`, `RoadDetailsPanel`, `LotsList`, `RoadsList`, `CommonSpacesList`, `ServitudesList`, `ValidationPanel`
- Helpers géométriques (`convexHull`, `lineSegmentIntersection`, `segmentSegmentIntersection`) → `utils/geometry.ts`
- Logique métier (`handleSplitLot`, `handleMergeLots`, `handleCutLot`, `handleConvertSelectedZone`, `handleFinishRoadDraw`, `handleConvertEdgeToRoad`, `handleUpdateRoad`) → hook dédié `useLotOperations`.

**O2 — `setLots`/`setRoads` non atomiques**
Plusieurs handlers font deux `set*` consécutifs (ex. l. 306-313, 666-668, 736-738). Un re-render intermédiaire peut afficher un état incohérent (lot supprimé sans la voie créée). À regrouper dans un `useReducer` ou un setter atomique unique du state plan.

**O3 — `Date.now()` pour générer des IDs**
Risque de collision si deux opérations dans la même ms (rare mais possible). Utiliser `crypto.randomUUID()` (déjà standard côté CCC, cf. `mem://security/file-storage-naming-standard-fr`).

**O4 — Calculs métriques redondants**
`computeArea` / `computePerim` recréés via `useCallback`, mais `useCanvasDrag` recompute aussi (l. 31-37 du hook). Centraliser dans un service partagé ou via le contexte du metricFrame.

**O5 — Tooltips sans `aria-label` / accessibilité**
Les boutons icônes (Trash, Plus, Undo, Redo, Annotations, +Voie l. 1271-1287) n'ont pas tous d'`aria-label`; les `title` HTML sont incomplets. À harmoniser avec le standard accessibilité du projet.

**O6 — Performance : `lots.find` / `lots.reduce` répétés à chaque render**
Aucune mémoisation (`useMemo`) sur `selectedLot`, `editingRoad`, `totalArea`, `coveragePercent`, `maxLotNum`. Sur 50 lots ce reste léger, mais multiplié par les drags 60fps cela compte.

**O7 — `as any` dispersés**
Lignes 1182, 1291, 1300, 1316 (`(editingRoad as any).isExisting`), `(road as any).isExisting`. Le champ existe sur le type — à typer correctement (cf. `mem://admin/as-any-reduction-untyped-helpers`).

**O8 — Pas d'analytics sur les actions critiques**
Aucun événement `subdivision_lot_*` (split, merge, convert, cut). Les autres modules admin tracent ces gestes (cf. `mem://admin/admin-analytics-tracking-fr`).

**O9 — Validation déclenchée à chaque render mais affichée uniquement si erreurs**
Le panneau de validation (l. 1470) ne montre rien tant qu'il y a 0 erreur/warning. Or l'utilisateur veut un retour positif "✅ Plan conforme" pour avancer en confiance.

**O10 — Hint contextuel (`modeHint`) n'est pas internationalisé**
Trois textes en dur dans le composant. Le reste du projet est en français mais sans i18n centralisée — à isoler au minimum dans un dictionnaire local.

**O11 — Slider largeur voie : valeurs flottantes sans formatage**
`step=0.5` + saisie Input number : on peut entrer 6.499999. À arrondir (`toFixed(1)`).

**O12 — Conversion d'edge ↔ voie fait perdre les annotations**
`handleConvertSelectedZone` ne tente pas de migrer les annotations / propriétaire ; elles disparaissent silencieusement.

---

### Priorisation suggérée

Je vous propose ce groupement pour la suite :

- **P0 (bloquants/justice métier)** : B1, B5, B6, M3, B3, B4
- **P1 (UX et fiabilité du plan)** : B2, B7, B8, M1, M2, M4, M9, M10, O1 (modularisation), O2 (atomicité), O8 (analytics)
- **P2 (qualité code/finition)** : B9, M5, M6, M8, M11, M12, O3-O7, O9-O12

### Question

Souhaitez-vous :
1. **Tout** (P0+P1+P2) en plusieurs passes,
2. **P0+P1 seulement** (cible utile rapide),
3. ou **uniquement les bugs (P0)** dans un premier temps ?

Je présenterai un plan d'implémentation détaillé après votre choix.
