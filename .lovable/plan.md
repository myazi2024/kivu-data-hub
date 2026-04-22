

## Audit — Bloc « Identité du demandeur » (lotissement)

### Conclusion globale

L'intégration est **structurellement saine**. Aucune régression bloquante détectée :
- ✅ Types `RequesterInfo` cohérents partout (form, summary, admin, edge function)
- ✅ Validation `isStepValid('parcel')` couvre tous les cas (physique / morale / État)
- ✅ Edge function `subdivision-request` reçoit et persiste tous les nouveaux champs
- ✅ Migration BD ajoute les colonnes nullable → rétrocompatible avec les anciennes demandes
- ✅ Affichage admin (`AdminSubdivisionRequests`) et récap (`StepSummary`) gèrent les 3 statuts juridiques
- ✅ `DRAFT_KEY_PREFIX = 'subdivision-draft-v2-'` invalide proprement les anciens drafts
- ✅ Réutilisation de `useCCCFormPicklists` (mêmes picklists que CCC, fallbacks DB → hardcoded OK)
- ✅ Aucun autre composant ne consomme `RequesterInfo` hors du module subdivision (pas d'effet de bord)

### 2 bugs mineurs à corriger

#### Bug #1 — Hint « champs manquants » obsolète (impact UX)

Fichier : `src/components/cadastral/SubdivisionRequestDialog.tsx` (lignes 117-124)

Le tooltip qui aide l'utilisateur lorsque le bouton « Suivant » est désactivé liste encore uniquement `prénom / nom / téléphone / motif`. Si l'utilisateur sélectionne « Personne morale » sans renseigner RCCM ou Type d'entité, le bouton est bloqué (validation OK) mais l'utilisateur ne sait pas pourquoi.

**Fix** : enrichir `missingFields` avec `legalStatus`, `nationality`, `gender` (si physique), `entityType` + `rccmNumber` (si morale), `rightType` + `stateExploitedBy` (si État).

#### Bug #2 — `firstName` écrasé par RCCM (effet secondaire indésirable)

Fichier : `RequesterIdentityBlock.tsx` ligne 291

```tsx
onChange={(e) => update({ rccmNumber: e.target.value, firstName: e.target.value })}
```

Le RCCM est dupliqué dans `firstName` à chaque saisie. Côté CCC, c'est intentionnel (compat affichage), mais ici l'edge function persiste `requester_first_name = RCCM` → données incohérentes en BD pour les personnes morales (le récap admin affiche déjà correctement « Dénomination », donc cette duplication n'apporte rien et pollue la colonne).

**Fix** : retirer `firstName: e.target.value` ; pour les personnes morales, `firstName` reste vide et `lastName` porte la dénomination (déjà géré dans `StepSummary` et admin).

Idem pour le bloc État ligne 345 : `firstName: 'État'` peut être laissé (sentinelle utile à l'affichage), mais à documenter.

### Vérifications

1. Ouvrir le dialog lotissement, choisir « Personne morale » sans remplir RCCM → vérifier que le tooltip mentionne « RCCM ».
2. Saisir un RCCM → vérifier en BD (`requester_first_name`) qu'il reste vide (et non = RCCM).
3. Soumettre une demande complète pour les 3 statuts → vérifier l'affichage admin.

### Fichiers à modifier

- `src/components/cadastral/SubdivisionRequestDialog.tsx` (enrichir `missingFields`)
- `src/components/cadastral/subdivision/RequesterIdentityBlock.tsx` (retirer la duplication `firstName ← rccmNumber`)

Aucune migration BD nécessaire.

