# Aligner la recherche cadastrale sur le formulaire CCC

## Écarts constatés

1. **Filtre « Type parcelle »** propose « Terrain nu / Terrain bâti », mais il compare ces valeurs au champ où le CCC enregistre « SU / SR ». Résultat : choisir l'une de ces options ne renvoie jamais aucune parcelle. Ce filtre fait aussi doublon avec le choix « SU - Urbaine / SR - Rurale ».
2. **« Avec arriérés fiscaux »** cherche le statut « overdue », alors que le CCC enregistre « Impayé » ou « En retard » (ainsi que « Payé » et « Payé partiellement »). Ce filtre ne trouve donc jamais rien.
3. **Avenue** : le filtre interroge une colonne absente de la liste publique des parcelles, ce qui peut faire échouer la recherche quand il est rempli.
4. **Type de titre** : la liste reprend bien celle du CCC (à part « Autre », exclu volontairement). Aucun changement.

## Corrections

- Retirer le filtre « Type parcelle » (Terrain nu / bâti), puisque la zone SU/SR le remplace déjà. Il n'y a pas d'autre catégorie de bien dans la liste publique, et la règle est de n'ajouter aucune donnée publique sans demande.
- « Avec arriérés fiscaux » : compter comme arriéré une taxe au statut « Impayé » ou « En retard », comme dans le CCC (avec une liste de statuts partagée).
- Avenue : la recherche ne l'envoie plus au serveur. Le champ est masqué s'il n'est pas utilisable.
- Vérifier la recherche simple par numéro (format SU/SR, préfixes), en reprenant les règles de validation du numéro de parcelle du CCC.

## Détails techniques

- `src/components/cadastral/AdvancedSearchFilters.tsx` : retirer le Select `parcelType` et le champ avenue.
- `src/hooks/useAdvancedCadastralSearch.tsx` : supprimer `parcelType` et `avenue` de `SearchFilters` et de `buildQuery` ; remplacer `.eq('payment_status','overdue')` par `.in('payment_status', TAX_ARREARS_STATUSES)`.
- Constante `TAX_ARREARS_STATUSES = ['Impayé','En retard']`, définie près des options de l'onglet Obligations et réutilisée par ce filtre.
- `useCadastralSearch.tsx` / `CadastralSearchBar.tsx` : contrôler le format du numéro par rapport à `parcel-number-validation`.
- Ajouter des tests unitaires pour le filtre d'arriérés et la construction de la requête.
