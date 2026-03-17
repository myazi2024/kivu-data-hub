

## Diagnostic architectural : propagation des indicateurs CCC

### Probleme identifie

L'architecture actuelle souffre d'un **couplage par valeurs hardcodees** : plusieurs composants referencent directement des libelles d'indicateurs (types de titres, types de construction, usages) au lieu de s'appuyer sur la source unique de verite (`PropertyTitleTypeSelect.tsx` et `useCCCFormPicklists.tsx`).

### Composants desalignes trouves

| # | Fichier | Probleme | Severite |
|---|---------|----------|----------|
| 1 | `AdvancedSearchFilters.tsx` (l.426-431) | Filtre "Type titre" hardcode avec **anciennes valeurs** ("Titre foncier", "Concession") au lieu des 3 types actuels + Autre | **Critique** |
| 2 | `taxSharedUtils.ts` (l.18-34) | `detectUsageType` et `detectConstructionType` utilisent des switch/case avec des valeurs en dur ("Commercial", "En dur", "Terrain nu") au lieu de reference centralisee | Moyen |
| 3 | `IRLQuestionsStep.tsx` (l.52) | Compare `construction_type === 'Terrain nu'` en dur | Faible |
| 4 | `taxFormConstants.ts` | Listes USAGE_OPTIONS, CONSTRUCTION_OPTIONS definies en dur — systeme de taxe independant du CCC, acceptable mais non synchronise | Faible |

> **Note** : Les fichiers `landTitleDeduction.ts`, `LandTitleRequestDialog.tsx`, `useLandTitleDynamicFees.tsx` utilisent volontairement des types detailles (Concession ordinaire, Bail emphyteotique...) car ils appartiennent au systeme de **recommandation de titre foncier**, un domaine metier different du formulaire CCC.

### Plan de correction

#### 1. Corriger le filtre AdvancedSearchFilters (critique)
- Remplacer les 3 `SelectItem` hardcodes par un import dynamique de `PROPERTY_TITLE_TYPES` depuis `PropertyTitleTypeSelect.tsx`
- Generer les options du filtre par `.map()` sur ce tableau
- Inclure aussi les anciennes valeurs via `normalizeTitleType` pour que la recherche fonctionne sur les donnees legacy

#### 2. Centraliser les constantes de mapping taxSharedUtils
- Ajouter un commentaire de reference vers `useCCCFormPicklists` pour les valeurs CCC utilisees dans les switch/case
- Ces valeurs proviennent de la DB (via la parcelle) donc le mapping est correct tant que les valeurs DB correspondent aux picklists CCC — pas de changement de code necessaire ici, mais ajouter une reference documentaire

#### 3. Principe architectural a appliquer
- Tout composant qui affiche un **filtre ou dropdown** basé sur les indicateurs CCC doit importer `PROPERTY_TITLE_TYPES` ou utiliser `useCCCFormPicklists` — jamais de valeurs en dur
- Les composants d'**analytics** utilisent deja `normalizeTitleType` pour regrouper les donnees legacy — c'est correct
- Les composants de **calcul/deduction** (taxe, titre) ont leur propre domaine et peuvent garder leurs constantes propres

### Fichiers a modifier

1. **`src/components/cadastral/AdvancedSearchFilters.tsx`** — Importer `PROPERTY_TITLE_TYPES` et generer dynamiquement les options du filtre "Type titre"

