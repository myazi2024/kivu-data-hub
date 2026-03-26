

# Audit et correction des divergences entre les données de test et les formulaires

## Divergences identifiées

En comparant les valeurs insérées par `testDataGenerators.ts` avec les options standardisées des formulaires (CCC, Litige, Titre foncier), voici les incohérences qui polluent les graphiques Analytics :

### 1. Litiges — `dispute_type` (3 valeurs)
- **Test** : `'limite'`, `'propriete'`, `'occupation'`
- **Formulaires** : `'report'` (signalement) ou `'lifting'` (levée)
- **Impact** : Le graphique "Par type" affiche des catégories inexistantes au lieu de "Signalement / Levée"

### 2. Litiges — `dispute_nature` (3 valeurs)
- **Test** : Texte libre (`'Contestation de limite parcellaire'`, `'Double attribution de titre foncier'`, `'Occupation illégale signalée'`)
- **Formulaires** : Valeurs enum (`'delimitation'`, `'double_vente'`, `'occupation_illegale'`) — source de vérité : `DISPUTE_NATURES` dans `disputeSharedTypes.ts`
- **Impact** : Le graphique "Par nature" affiche du texte libre au lieu des catégories normalisées

### 3. Litiges — `resolution_level` (1 valeur)
- **Test** : `'amiable'`
- **Formulaires** : `'conciliation_amiable'` — source de vérité : `RESOLUTION_LEVELS` dans `disputeSharedTypes.ts`
- **Impact** : Le graphique "Par niveau de résolution" affiche une catégorie fantôme

### 4. Litiges — `lifting_reason` (1 valeur)
- **Test** : `'Accord trouvé entre les parties après médiation'` (texte libre)
- **Formulaires** : `'conciliation_reussie'` — source de vérité : `LIFTING_REASONS` dans `disputeSharedTypes.ts`
- **Impact** : Le graphique "Par motif de levée" affiche du texte libre

### 5. Demandes de titres — `declared_usage` (3 valeurs)
- **Test** : `'habitation'`, `'agriculture'`, `'commerce'` (minuscules)
- **Formulaires** : `'Habitation'`, `'Agriculture'`, `'Commerce'` (majuscules)
- **Impact** : Le normaliseur `declaredUsageNormalizer` ne reconnaît pas les minuscules → doublon dans le graphique "Par usage déclaré"

### 6. Demandes de titres — `construction_nature` (2 valeurs)
- **Test** : `'maison'`, `'immeuble'`
- **Formulaires** : `'Durable'`, `'Semi-durable'`, `'Précaire'`, `'Non bâti'`
- **Impact** : Le normaliseur `constructionNatureNormalizer` ne reconnaît pas `'maison'`/`'immeuble'` → catégories fantômes dans le graphique "Par nature construction"

### 7. Fraude — `fraud_type` (2 valeurs)
- **Test** : `'duplication'`, `'document_falsifie'`
- **Formulaires/Code** : Le code réel utilise `'suspicious_contribution'` (dans `useCadastralContribution.tsx`)
- **Impact** : Faible (pas de référentiel strict, mais les valeurs de test sont cohérentes avec un usage raisonnable — à conserver telles quelles car la fraude est détectée automatiquement avec des types variés)

## Corrections proposées

Un seul fichier à modifier : `src/components/admin/test-mode/testDataGenerators.ts`

### Litiges (generateDisputes, L446-495)

| Champ | Ancien | Nouveau |
|-------|--------|---------|
| `dispute_type` (×3) | `'limite'`, `'propriete'`, `'occupation'` | `'report'`, `'report'`, `'report'` (le 3e avec lifting sera aussi `'report'` avec `current_status: 'demande_levee'`) |
| `dispute_nature` (×3) | Texte libre | `'delimitation'`, `'double_vente'`, `'occupation_illegale'` |
| `resolution_level` | `'amiable'` | `'conciliation_amiable'` |
| `lifting_reason` | Texte libre | `'conciliation_reussie'` |

### Demandes de titres (generateTitleRequests, L265-321)

| Champ | Ancien | Nouveau |
|-------|--------|---------|
| `declared_usage` (×3) | `'habitation'`, `'agriculture'`, `'commerce'` | `'Habitation'`, `'Agriculture'`, `'Commerce'` |
| `construction_nature` (×2) | `'maison'`, `'immeuble'` | `'Durable'`, `'Durable'` |

## Fichier impacté

| Fichier | Action |
|---------|--------|
| `src/components/admin/test-mode/testDataGenerators.ts` | Corriger ~12 valeurs dans `generateDisputes` et `generateTitleRequests` |

1 fichier modifié.

