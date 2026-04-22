

## Plan — Refonte du designer de lots pour un utilisateur grand public

### Constat

Le designer actuel (`StepLotDesigner` 1246 LOC + `LotCanvas` 1711 LOC) expose **7 modes** (Sélection, Tracer ligne, Tracer voie, Cliparts, Sélection edge, +rotation drag, +snap) avec des concepts d'éditeur SIG : edges, hull, fusion convexe, intersections, rotation par poignée, palette clipart. Hors de portée d'un propriétaire qui veut juste « diviser ma parcelle en 4 lots avec une voie devant ».

### Objectif UX

Réduire à **3 actions intelligibles** + assistants automatiques :

1. **Diviser** (en cliquant deux points sur le bord de la parcelle → trait de coupe)
2. **Ajouter une voie** (en cliquant deux points → bande automatique avec largeur)
3. **Ajuster un lot** (numéro, usage, surface en saisissant la valeur)

Tout le reste devient **assisté** : auto-numérotation, auto-couleur par usage, alertes visuelles si trop petit, voie pré-dimensionnée selon mesures de la parcelle mère.

---

### Refonte du canvas (`LotCanvas` allégé)

| Mode actuel | Décision | Remplacement |
|---|---|---|
| `select` (déplacer/redimensionner) | **Garder** simplifié : drag polygone uniquement (pas vertex/edge en mode user) | Cliquer = sélectionner, glisser = déplacer le lot entier |
| `drawLine` (cut) | **Renommer « Diviser un lot »** + tutoriel inline 2 étapes (clic A → clic B) | Aperçu live de la ligne de coupe |
| `drawRoad` | **Renommer « Tracer une voie »** | Largeur pré-remplie = recommandation officielle (6 m urbain, 8 m rural) |
| `selectEdge` (convertir bord en route) | **Supprimer** (doublon de drawRoad, concept trop technique) | — |
| `clipart` | **Supprimer** (palette de stickers, hors-sujet pour création de lots) | Déplacer en "Plan" si vraiment utile (étape suivante) |
| Rotation par poignée | **Supprimer** côté user | Garder uniquement raccourci R clavier (admin) |
| Édition vertex/edge individuel | **Désactiver par défaut** | Disponible via toggle « Mode avancé » repliable |
| Snap toggle | **Toujours activé**, masquer le bouton | — |

**Nouvelles fonctions clés** :

- **Bouton « Diviser en N lots égaux »** : prompt « Combien de lots ? » → découpe automatique parallèle au côté qui borde la route (détecté via `parentSides[].bordersRoad`)
- **Bouton « Lot parcelle entière »** déjà présent → mettre en avant comme premier CTA
- **Indicateur visuel surface minimum** : lots < seuil affichent badge rouge « Trop petit » + tooltip explicatif (« Surface minimum : 200 m² en zone urbaine »)
- **Aperçu mesures réelles** : afficher en permanence longueur de chaque côté en mètres (déjà calculé, juste l'exposer)
- **Côté qui borde la route** : highlight visuel orange (lecture depuis `parentSides[].bordersRoad`) pour que l'utilisateur sache immédiatement où placer ses lots

---

### Refonte de la barre d'outils

**Avant** : 6 boutons + 4 bordures + badges (visuellement chargé).

**Après** — 3 zones :

```text
[ Outils ]            [ Actions rapides ]              [ État ]
🎯 Sélection          ➕ Lot parcelle entière           4 lots
✂️  Diviser           🔢 Diviser en N lots égaux        78% couvert
🛣️  Voie              ↶ Annuler  ↷ Rétablir            ⚠ 1 lot trop petit
```

Boutons larges avec icône + libellé court, tooltips longs explicatifs.

---

### Règles cadastrales intégrées

Ajouter `src/components/cadastral/subdivision/rules.ts` :

```ts
export const MIN_LOT_AREA_SQM = { urban: 200, rural: 500 };
export const MIN_LOT_FRONTAGE_M = { urban: 8, rural: 15 }; // façade sur voie
export const RECOMMENDED_ROAD_WIDTH_M = { urban: 6, rural: 8 };
export const MIN_ROAD_WIDTH_M = 4;
```

→ Passer `sectionType` (déjà connu) au designer, dériver les seuils, afficher en bandeau d'aide :
> « Zone urbaine — surface minimum d'un lot : 200 m², façade sur voie : 8 m, voie minimum : 4 m »

→ Bloquer la validation de l'étape si : un lot < min, ou un lot n'a pas de façade sur voie (front parcelle ou route tracée).

---

### Onboarding & guidage

- **Premier accès vide** : grand bouton central « Démarrer le découpage » → crée le lot parcelle entière + ouvre un mini-tutoriel 3 étapes (overlay non bloquant)
- **Tooltip permanent du mode actif** : sous le canvas, phrase contextualisée
  - Sélection : *« Cliquez sur un lot pour le sélectionner. Glissez pour le déplacer. »*
  - Diviser : *« Cliquez sur le premier bord du lot, puis sur le second bord, pour le couper en deux. »*
  - Voie : *« Cliquez deux points pour tracer une voie. Sa largeur sera de 6 m. »*
- **Annulation toujours visible** (Annuler/Rétablir conservés en haut)
- **Suppression** : bouton corbeille sur le panneau de détail uniquement (plus de raccourci `Delete` qui surprenait les utilisateurs en train de saisir)

---

### Mode avancé (opt-in)

Un toggle « Mode avancé » en bas du canvas révèle :
- Édition vertex par vertex
- Conversion d'arête en route
- Cliparts
- Rotation par poignée
- Mode multi-sélection + fusion

→ Permet de conserver toute la puissance actuelle pour les arpenteurs/admin sans encombrer le grand public.

---

### Architecture & fichiers

| Fichier | Action |
|---|---|
| `subdivision/rules.ts` | **Nouveau** : seuils min/max + helpers |
| `subdivision/LotCanvas.tsx` (1711 LOC) | Splitter par concern : `LotCanvasCore.tsx` (rendu SVG) + `useLotCanvasInteraction.ts` (drag/cut/road) + `LotCanvasOverlays.tsx` (mesures, badges, north) |
| `subdivision/steps/StepLotDesigner.tsx` (1246 LOC) | Splitter : `LotDesignerToolbar.tsx`, `LotDesignerSidebar.tsx` (détails + liste), `LotDesignerHelp.tsx` (bandeau règles), `useDivideEqually.ts` |
| `subdivision/components/EmptyDesignerCTA.tsx` | **Nouveau** : grand CTA initial avec démarrage tutoriel |
| `subdivision/components/AdvancedModeToggle.tsx` | **Nouveau** : opt-in mode avancé |
| `subdivision/utils/divideEqually.ts` | **Nouveau** : algo découpe parallèle N lots égaux (perpendiculaire au front route) |
| `subdivision/hooks/useSubdivisionForm.ts` | Exposer `sectionType` au designer + validation min surface |

Toutes les fonctions techniques actuelles (cut, hull, edge, rotation) sont **conservées** mais cachées derrière le mode avancé — pas de régression fonctionnelle.

---

### Décisions à confirmer

1. **Seuils min lot (RDC)** — proposition : 200 m² urbain / 500 m² rural ; façade min 8 m urbain / 15 m rural ; voie min 4 m. Tu valides ces valeurs ou tu en as d'autres officielles ?
2. **Mode avancé** — l'exposer au grand public (toggle visible) ou réserver aux comptes pro/admin (rôle `cadastral_officer`) ?
3. **« Diviser en N lots égaux »** — découpe perpendiculaire au front route uniquement (recommandé, urbanisme classique) ou laisser choisir l'axe (parallèle/perpendiculaire/personnalisé) ?
4. **Cliparts** — les supprimer définitivement (jamais utilisés en demande user) ou les déplacer dans l'étape « Plan » comme finition graphique optionnelle ?

