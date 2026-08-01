# Audit du formulaire CCC — bugs détectés et correctifs

Audit complet des onglets (Infos, Localisation, Passé, Obligations, Valeur marchande, Récapitulatif), des hooks d'état, de validation, de persistance et du mapping base de données, après le déplacement du bloc « Construction » vers l'onglet Localisation.

**Bonne nouvelle** : le déplacement lui-même est propre — toutes les règles de validation construction/location sont bien rattachées à l'onglet Localisation, et l'onglet Infos ne conserve aucun état ni effet orphelin. La ré-indexation des références lors de la suppression d'une construction est également complète et correcte.

Quatre anomalies réelles ont été confirmées.

## 1. Perte de données locatives à la réédition (critique)

Quand un utilisateur rouvre une contribution existante pour la corriger, la configuration locative des constructions **secondaires** (un seul local / plusieurs locaux, nombre de locaux, loyers, détail de chaque local) n'est pas rechargée, alors qu'elle est bien enregistrée en base. Résultat : les champs apparaissent vides, l'onglet se re-signale comme incomplet, et un nouvel enregistrement écrase les données d'origine.

Correctif : restaurer ces champs au chargement depuis la base.

## 2. Brouillon local non sauvegardé pour certains blocs (important)

La sauvegarde automatique du brouillon ne se déclenche pas si l'utilisateur ne modifie **que** : le mode « plusieurs constructions », les constructions additionnelles, les tracés de bâtiments du croquis, la servitude, le nom de titre personnalisé, l'environnement sonore ou les données de litige. Un rafraîchissement de page peut alors perdre ces saisies.

Correctif : ajouter ces états au déclencheur de sauvegarde automatique.

## 3. Bloc Construction masqué tant que la Province n'est pas choisie (important)

Le bloc Construction n'apparaît que si une province est renseignée, alors qu'il n'a aucun lien fonctionnel avec elle. Si la localisation est réinitialisée, tout le bloc disparaît de l'écran (les données restent en mémoire mais deviennent invisibles).

Correctif : afficher le bloc Construction sans condition sur la province.

## 4. Libellé d'onglet manquant dans le message d'erreur (mineur)

Si la soumission est bloquée par un champ manquant de l'onglet « Valeur marchande », le message affiche `market-value` au lieu du libellé lisible.

Correctif : ajouter le libellé manquant à la table de correspondance.

## Détails techniques

- `src/hooks/useCCCFormState.ts` (~l.1189) : ajouter `rentalConfiguration`, `rentalUnitsCount`, `monthlyRentUsd`, `rentalUnits` au mapping de restauration de `additional_constructions`.
- `src/hooks/useCCCFormState.ts` (l.868) : ajouter `'market-value': 'Valeur marchande'` à `tabNames`.
- `src/hooks/ccc/useFormPersistence.ts` (l.238) : compléter le tableau de dépendances de l'effet d'autosave avec `constructionMode`, `additionalConstructions`, `buildingShapes`, `servitude`, `customTitleName`, `soundEnvironment`, `nearbySoundSources`, `disputeFormData`.
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` (l.238) : retirer la condition `formData.province &&` devant `<ConstructionSection />`.

Aucune migration SQL, aucune modification de RLS, d'edge function ou de logique métier : uniquement des correctifs de restauration, de persistance et d'affichage.

## Points signalés mais non modifiés

- `TAB_ORDER` / `TAB_LABELS` sont dupliqués entre `CadastralContributionDialog.tsx` et `useFormValidation.ts` (actuellement synchronisés, risque de dérive future).
- Les cascades de `useConstructionCascade.ts` désactivent volontairement la règle de dépendances ESLint pour éviter des boucles ; comportement correct aujourd'hui, à ne pas « corriger » naïvement.
