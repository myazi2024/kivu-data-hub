
## Objectif

Auditer le formulaire de contribution CCC (menu Carte cadastrale) sur les 4 axes retenus — UX mobile, dépendances inter-onglets, validation/anti-fraude, robustesse technique — puis appliquer directement les correctifs des bugs critiques détectés. Aucune refonte fonctionnelle ni changement produit.

## Périmètre audité

- `CadastralContributionDialog.tsx` (orchestrateur, 264 l.)
- `useCCCFormState.ts` (1452 l.) et sous-hooks `ccc/useFormValidation.ts`, `useFormPersistence.ts`, `useConstructionCascade.ts`, `useGeographicCascade.ts`
- 6 onglets : `GeneralTab`, `LocationTab`, `HistoryTab`, `ObligationsTab`, `MarketValueTab`, `ReviewTab`
- Composants dépendants : `RentalConfigurationFields`, `AdditionalConstructionBlock`, `InputWithPopover`
- Hook de soumission `useCadastralContribution.tsx` (860 l.)

## Zones à haut risque déjà repérées (à confirmer par lecture ciblée)

1. **Gating séquentiel des onglets** — `isTabAccessible` itère toute la liste des champs manquants pour chaque onglet précédent. Un seul champ manquant dans « Passé » verrouille totalement `market-value` et `review`, sans indicateur clair de la cause.
2. **`handleTabChange` non mémoïsé** — provoque la recréation de `handleNextTab` à chaque render et re-renders en cascade des 6 onglets (perf mobile).
3. **Devise et prix `resalePriceUsd`** — champ persisté distinct de `resalePriceAmount`/`resalePriceCurrency`. Risque de désynchro si l'utilisateur change de devise après saisie (valeur stockée obsolète).
4. **Config locative multi-locaux vs capacité globale** — `hostingCapacity` global peut rester renseigné après passage en `multi`, doublons de calcul dans `ObligationsTab` (IRL).
5. **Validation IRL** — la référence `additional:<idx>` reste attachée après suppression d'une construction additionnelle (IRL orphelin non nettoyé côté state).
6. **`MarketValueTab.buildVacantTargets`** — héritage `constructionYear` typé string vs number selon la source (`additionalConstructions` vs `formData`).
7. **Uploads** — `market-listings` et `appraisal-reports` : pas de rollback si soumission échoue (fichiers orphelins dans le bucket).
8. **Validation "next tab"** — le clic « Suivant » utilise `getMissingFieldsForTab(current)` mais l'utilisateur peut naviguer manuellement dans le `TabsTrigger` sans passer par la validation ; `isTabAccessible` doit gérer proprement les états intermédiaires.
9. **`InputWithPopover triggerImmediately`** — vérifier qu'il ne se déclenche pas sur re-render et n'accroche pas le focus mobile.
10. **Rate-limit récemment posé** — vérifier que les uploads d'images (Storage) ne saturent pas les quotas anonymes (formulaire pré-auth possible via QuickAuth).

## Livraison en 3 phases

### Phase 1 — Audit approfondi (lecture, aucune modif)

Lecture ciblée (≈ 15 fichiers) pour lister les défauts par sévérité :
- **Critique** : crash, blocage utilisateur, perte de données, faille validation.
- **Important** : incohérence UX, dépendance manquante, perf perceptible.
- **Mineur** : libellés, harmonisation.

Rendu : liste priorisée en chat avant toute modification.

### Phase 2 — Correctifs critiques (build)

Application immédiate des correctifs **Critique** uniquement, sans toucher au produit :
- Mémoïsation `handleTabChange` (élimine re-renders des 6 onglets).
- Nettoyage IRL orphelins lors de la suppression d'une construction additionnelle.
- Reset `hostingCapacity`/`isOccupied` globaux lors du passage en `rentalConfiguration='multi'` (et inversement).
- Normalisation numérique de `constructionYear` dans `buildVacantTargets`.
- Recalcul systématique de `resalePriceUsd` quand devise ou montant change.
- Rollback des uploads Storage si la soumission finale échoue (réutiliser le tracker existant de `useFormPersistence`).
- Guard `isTabAccessible` : signal explicite (toast) quand l'utilisateur tente d'ouvrir un onglet verrouillé, avec renvoi vers le premier onglet incomplet.

### Phase 3 — Recommandations (chat, sans code)

Points **Important/Mineur** listés pour arbitrage ultérieur (modularisation `GeneralTab` 1427 l. et `MarketValueTab` 1152 l., extraction de sous-composants, alignement libellés, télémétrie manquante).

## Contraintes respectées

- Aucun changement de schéma DB, RLS, ni logique métier serveur.
- Aucune modification du produit (pas de nouveaux champs, pas de renommage utilisateur).
- Aucune modif des edge functions ni du système de rate-limiting.
- Semantic tokens Tailwind, ESM only, cohérent avec les règles mémoire (`Autorisation`, `crypto.randomUUID`, statuts EN).

## Détails techniques (Phase 2)

- `useCCCFormState.ts` : `handleTabChange = useCallback(...)` ; dépendances de `handleNextTab` mises à jour.
- Suppression construction : callback `removeAdditionalConstruction` purge `taxRecords` dont `constructionRef === 'additional:<idx>'` et réindexe les refs `additional:<n>` pour n > idx.
- `RentalConfigurationFields`/`AdditionalConstructionBlock` : dans le patch `selectMode('multi')`, ajouter `isOccupied: undefined, hostingCapacity: undefined, occupantCount: undefined` sur le parent.
- `MarketValueTab.buildVacantTargets` : `Number(construction.constructionYear) || undefined` avant assignation.
- `useCadastralContribution` : lors de l'assignation `resalePriceUsd`, calcul déterministe via `useCurrencyConfig().toUsd(amount, currency)`; recalculé côté `MarketValueTab` sur `onChange` des deux champs.
- `useFormPersistence.rollbackUploadedFiles` : appelé dans le `catch` de `handleSubmit` (déjà exposé, à câbler si manquant).
- `handleAttemptClose` : toast informatif si des uploads sont trackés et non soumis.

## Hors périmètre

- Refonte de la navigation par onglets.
- Nouveaux indicateurs métier.
- Modification de la table `cadastral_contributions`.
- Optimisation SEO/PDF.
