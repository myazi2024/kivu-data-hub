## Objectif

Ajouter, **au tout début** du formulaire de demande de lotissement, un onglet **conditionnel** « Normes de zonage » qui :

1. N'apparaît **que si** une règle `subdivision_zoning_rules` (active) correspond à l'emplacement de la parcelle-mère (cascade géo déjà implémentée dans `useZoningCompliance` → `rule !== null`).
2. Informe l'utilisateur — de façon professionnelle — sur le rôle des normes cadastrales et l'obligation de les respecter pour que la demande puisse être validée et soumise.
3. Détaille **chacune des règles applicables** issues de la base (surface min/max par lot, largeur de voirie min/recommandée, % d'espaces communs, façade min sur route, nombre max de lots, notes admin) avec une explication claire de **ce que signifie** chaque norme et **comment elle sera évaluée** sur le plan.
4. Rappelle qu'à chaque modification du plan, la conformité est recalculée en direct et qu'aucune soumission ne sera possible tant que des erreurs subsistent.

## Implémentation

### 1. Nouveau step `'zoning'`
- Ajouter `'zoning'` en tête de l'union `SubdivisionStep` (`src/components/cadastral/subdivision/types.ts`).
- Dans `useSubdivisionForm.ts` :
  - Construire `steps` dynamiquement : `['zoning', 'parcel', 'designer', 'plan', 'infrastructures', 'documents', 'summary']` **uniquement si** `zoningCompliance.rule` est non nul ET `!zoningCompliance.loading`. Sinon `steps` commence à `'parcel'` (comportement actuel).
  - `isStepValid('zoning')` → toujours `true` (page d'information, pas de saisie).
  - Initialiser `currentStep` à `'zoning'` quand l'onglet est présent et que c'est le premier rendu (sinon garder `'parcel'`). Si la règle arrive après le chargement de la parcelle, glisser sur `'zoning'` une seule fois (flag `zoningSeenRef`).

### 2. Nouveau composant `StepZoningRules.tsx`
Chemin : `src/components/cadastral/subdivision/steps/StepZoningRules.tsx`.

Contenu :
- En-tête : icône `ShieldCheck`, titre « Normes cadastrales applicables », sous-titre indiquant la zone matchée (`zoningCompliance.matchedLocation` + `sectionType` traduit en « urbain »/« rural »).
- Bloc d'introduction (Alert) :
  > « Les services cadastraux ont défini, pour la zone de votre parcelle, un ensemble de normes de zonage destinées à garantir la cohérence du plan cadastral, la viabilité des voiries, la salubrité des lots et la qualité des espaces communs. Avant de concevoir votre lotissement, prenez connaissance de ces normes : chaque découpage que vous proposerez sera automatiquement comparé à ces règles, et votre demande ne pourra être soumise pour traitement que si l'ensemble du plan les respecte intégralement. »
- Liste détaillée (Cards) générée à partir de `rule` — afficher uniquement les règles dont la valeur est significative (`> 0` ou `!== null`) :
  - **Surface minimale par lot** — `min_lot_area_sqm` m². « Aucun lot ne pourra être inférieur à cette surface. Les lots trop petits seront marqués en erreur sur l'onglet Conception. »
  - **Surface maximale par lot** — `max_lot_area_sqm` m² (avertissement, pas blocant).
  - **Largeur minimale de voirie** — `min_road_width_m` m (recommandé : `recommended_road_width_m` m). Explication accès véhicules / sécurité.
  - **Façade minimale sur route** — `min_front_road_m` m. Pourquoi : accès direct, valeur foncière.
  - **Pourcentage minimal d'espaces communs** — `min_common_space_pct` %. Espaces verts / drainage / parkings, calculé sur la surface totale de la parcelle-mère.
  - **Nombre maximal de lots** — `max_lots_per_request` (s'il est défini).
  - **Notes complémentaires** — `notes` brut (Markdown-like simple) si présent.
- Encadré « Ce qui est vérifié automatiquement » (liste à puces : surface lots, voiries, façade, espaces communs, nombre de lots) avec mention du recalcul live.
- Encadré final (Alert info) :
  > « En cliquant sur "Suivant", vous attestez avoir pris connaissance de ces normes et vous engagez à concevoir un plan qui les respecte. Le système refusera toute soumission tant qu'une erreur de conformité subsistera. »

### 3. Câblage `SubdivisionRequestDialog.tsx`
- Étendre `STEP_CONFIG` avec une entrée optionnelle `{ key: 'zoning', label: 'Normes de zonage', shortLabel: 'Normes', icon: <ShieldCheck/> }` placée en tête.
- Construire `effectiveSteps = form.steps` (déjà conditionnel) et n'afficher que les entrées de `STEP_CONFIG` dont la `key` est dans `effectiveSteps`.
- Brancher le rendu : `{form.currentStep === 'zoning' && <StepZoningRules compliance={form.zoningCompliance} />}`.
- `currentStepIndex` calculé sur la liste filtrée (déjà le cas via `form.steps.indexOf`).

### 4. Mémoire projet
- Mettre à jour `.lovable/memory/admin/subdivision-admin-audit-fr.md` (section « Lot E » → ajouter « Lot F : Onglet conditionnel Normes de zonage en tête de formulaire (rendu si rule matchée) »).

### 5. Test de fonctionnement (post-implémentation)
- Lancer le préview, ouvrir une parcelle dont la zone a une règle (ex. ville par défaut `*`) → vérifier :
  - L'onglet « Normes » apparaît en premier et est sélectionné par défaut.
  - Toutes les règles sont listées avec leurs valeurs réelles.
  - « Suivant » mène à `parcel` sans erreur console.
  - Les autres steps fonctionnent (parcel → designer → plan → infrastructures → documents → summary).
- Tester un cas sans règle (en désactivant temporairement via mock console ou en utilisant une parcelle sans match) → vérifier que l'onglet est masqué et que `parcel` est l'étape initiale.
- Vérifier `code--read_console_logs` et `code--read_runtime_errors` après navigation.

## Détail technique

```text
SubdivisionStep = 'zoning' | 'parcel' | 'designer' | 'plan' | 'infrastructures' | 'documents' | 'summary'

steps (dans useSubdivisionForm) :
  rule ? ['zoning', ...rest] : [...rest]
```

Aucun changement DB. Aucun changement edge function. Aucune migration. Lecture seule des `subdivision_zoning_rules` déjà fait par `useZoningCompliance`.
