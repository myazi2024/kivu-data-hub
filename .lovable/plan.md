

# Audit detaille du formulaire CCC

## Architecture generale

| Fichier | Lignes | Role |
|---------|--------|------|
| `CadastralContributionDialog.tsx` | 249 | Orchestrateur (onglets, succes, auth) |
| `useCCCFormState.ts` | 1629 | State central, validation, soumission, persistance |
| `useCadastralContribution.tsx` | 721 | Interface donnees, payload builder, CRUD Supabase |
| `GeneralTab.tsx` | 1315 | Onglet Infos (Titre, Proprietaires, Construction, Permis) |
| `LocationTab.tsx` | 815 | Onglet Localisation (Adresse, GPS, Croquis, Son) |
| `HistoryTab.tsx` | 287 | Onglet Passe (Anciens proprietaires) |
| `ObligationsTab.tsx` | 475 | Onglet Obligations (Taxes, Hypotheques, Litiges) |
| `ReviewTab.tsx` | 682 | Onglet Recapitulatif |
| `AdditionalConstructionBlock.tsx` | 738 | Sous-composant constructions supplementaires |

## Flux de donnees

```text
GeneralTab / LocationTab / HistoryTab / ObligationsTab
       │ handleInputChange(field, value)
       ▼
  useCCCFormState.ts (formData + states annexes)
       │ localStorage (auto-save 1.5s) + DB fetch (edit mode)
       ▼
  handleSubmit → buildContributionPayload → Supabase INSERT/UPDATE
```

## Points positifs

1. **Persistance localStorage** : auto-save debounced (1.5s), restauration a la reouverture
2. **Mode edition** : chargement complet depuis DB avec mapping snake_case ↔ camelCase
3. **Validation progressive** : `getMissingFields()` bloque la navigation inter-onglets
4. **Score de completude** : calcul CCC aligne frontend/backend
5. **Upload securise** : `crypto.randomUUID()`, validation type + taille (10 MB)
6. **Anti-fraude** : verification doublon parcelle/utilisateur avant soumission
7. **Cascade construction** : Categorie → Type → Materiaux → Nature → Usage → Standing
8. **Capacite d'accueil** : implementee pour construction principale ET supplementaires
9. **DB alignee** : colonnes `is_occupied`, `occupant_count`, `hosting_capacity` presentes
10. **Constructions additionnelles** : interface, persistance, chargement edit mode OK

## Anomalies detectees

| # | Severite | Localisation | Probleme |
|---|----------|-------------|----------|
| 1 | **Critique** | `GeneralTab.tsx:1076` | **Double imbrication `<Label>`** : `<Label><Label>Votre ... ?</Label></Label>`. Genere un DOM invalide (label dans label). |
| 2 | **Majeur** | `ReviewTab.tsx:188-203` | **Capacite d'accueil absente des constructions additionnelles** dans le recapitulatif. Les champs `isOccupied`, `occupantCount`, `hostingCapacity` ne sont pas affiches. |
| 3 | **Mineur** | `AdditionalConstructionBlock.tsx:462-472` | **Incohérence de visibilite** : le champ "Capacite d'accueil (personnes)" s'affiche toujours, meme avant de repondre "Oui/Non" a "Est-il habite ?". Dans `GeneralTab.tsx:1090`, il est conditionne a `isOccupied !== undefined`. |
| 4 | **Mineur** | `GeneralTab.tsx:1076` | Le label utilise `formData.propertyCategory` (construction principale). Correct pour la construction principale, mais pourrait etre confus si la categorie est vide (fallback "bien" OK). |
| 5 | **Info** | `useCCCFormState.ts` | Le fichier fait **1629 lignes**. Au-dessus du seuil de 1000 lignes defini en memoire projet (`complex-dialog-modularization-strategy`). Candidat a la modularisation. |
| 6 | **Info** | `GeneralTab.tsx` | Le fichier fait **1315 lignes**. Meme observation. |
| 7 | **Info** | `useCadastralContribution.tsx:147-164` | L'interface `additionalConstructions` dans `CadastralContributionData` ne contient PAS les champs `isOccupied`, `occupantCount`, `hostingCapacity`. Les donnees passent quand meme via le spread `...c`, mais le typage est incomplet. |

## Plan de correction (7 actions)

### Action 1 — Corriger le double `<Label>` (critique)
**Fichier** : `GeneralTab.tsx:1076`
Remplacer `<Label><Label>...</Label></Label>` par un seul `<Label>...</Label>`.

### Action 2 — Afficher la capacite d'accueil dans le recapitulatif des constructions additionnelles
**Fichier** : `ReviewTab.tsx:188-203`
Apres la ligne `{c.permit?.permitNumber && ...}`, ajouter :
- `isOccupied` (Oui/Non)
- `occupantCount` (si habite)
- `hostingCapacity`

### Action 3 — Aligner la visibilite dans AdditionalConstructionBlock
**Fichier** : `AdditionalConstructionBlock.tsx:462-472`
Conditionner l'affichage du champ "Capacite d'accueil" a `data.isOccupied !== undefined` (comme dans GeneralTab).

### Action 4 — Completer le typage de CadastralContributionData
**Fichier** : `useCadastralContribution.tsx:147-164`
Ajouter `isOccupied?: boolean; occupantCount?: number; hostingCapacity?: number;` a l'interface `additionalConstructions`.

### Actions 5-7 — Informatif (pas d'action immediate)
La modularisation de `useCCCFormState.ts` et `GeneralTab.tsx` est recommandee mais non bloquante.

## Resume

| Categorie | Count |
|-----------|-------|
| Critique | 1 |
| Majeur | 1 |
| Mineur | 2 |
| Info/Typage | 1 |
| Info/Taille | 2 |

**4 corrections a appliquer** (Actions 1 a 4). Les actions 5-7 sont des recommandations de maintenabilite.

