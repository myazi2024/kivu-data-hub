# Recherche avancée épurée + déblocage « Terrain nu » dans le formulaire CCC

## 1. Recherche avancée (carte cadastrale) — bloc « Critères »

Retirer deux filtres :

- **Propriétaire** (champ texte « Nom du propriétaire ») — non pertinent et contraire au modèle économique (les données nominatives sont payantes/protégées).
- **Numéro du titre** — redondant avec la recherche standard, qui propose déjà le mode « N° de titre de propriété ».

Le bloc conserve : Surface min/max, Type parcelle, Type titre.

Nettoyage associé : suppression des clés `ownerName` et `titleReferenceNumber` du type de filtres, des clauses SQL correspondantes, du compteur de filtres actifs et de la réinitialisation.

## 2. Formulaire CCC — catégorie « Terrain nu »

Comportement attendu quand « Catégorie de bien » = Terrain nu :

- **Matériaux utilisés** : le champ ne s'affiche pas et n'est jamais exigé (il n'entre pas dans les champs manquants bloquant le passage à l'onglet suivant).
- **Nature** : reste auto-renseignée « Non bâti » (champ en lecture seule, affiché « Construction non bâtie »).
- **Usage** : déverrouillé (plus de « Type et nature d'abord ») et sélectionnable, avec les valeurs : **Parking**, **Espace d'entreposage**, **Aucun**.
- Aucun de ces champs ne déclenche le marquage rouge « champ obligatoire » ni le blocage du bouton Suivant.

La même règle s'applique au bloc des constructions secondaires, qui reproduit la même cascade.

## Détail technique

- `src/components/cadastral/AdvancedSearchFilters.tsx` : suppression du champ Propriétaire et du champ Numéro du titre.
- `src/hooks/useAdvancedCadastralSearch.tsx` : retrait de `ownerName` / `titleReferenceNumber` de l'interface de filtres, des `ilike` sur `current_owner_name` et `title_reference_number`, et du décompte des filtres actifs.
- `src/hooks/useCCCFormPicklists.tsx` : `picklist_declared_usage` → clé `Terrain nu_Non bâti` = `['Parking', "Espace d'entreposage", 'Aucun']` (fallback ; la valeur DB reste prioritaire si configurée en admin).
- `src/hooks/ccc/useConstructionCascade.ts` : garantir que la nature `Non bâti` est posée et conservée pour Terrain nu afin que la liste d'usages se calcule (déverrouillage du Select Usage).
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` : le Select Usage n'est plus `disabled` lorsque la nature est `Non bâti` ; bloc Matériaux déjà masqué quand aucune liste n'existe — vérifier qu'il l'est bien pour Terrain nu.
- `src/components/cadastral/AdditionalConstructionBlock.tsx` : même déverrouillage.
- `src/hooks/ccc/useFormValidation.ts` : confirmer l'exemption Matériaux et Usage pour Terrain nu / nature `Non bâti`.

Aucun changement de schéma de base de données. Les enregistrements existants portant un usage « Terrain vacant » ou « Agriculture » sur un terrain nu restent valides à l'affichage.
