# Audit front-end du formulaire CCC — anomalies restantes

Revue onglet par onglet du code du formulaire. Les constats ci-dessous ont été vérifiés par lecture directe du code.

## Constats vérifiés

### Bloquant

1. **Passage « Plusieurs constructions » → « Construction unique » laisse des données orphelines.**
   `ConstructionSection.tsx:630` vide directement `additionalConstructions` (`setAdditionalConstructions([])`) au lieu de passer par `removeAdditionalConstruction`, qui seul remappe/purge les références `additional:<idx>` portées par les enregistrements IRL (`taxRecords`) et les annonces (`formData.marketListings`). Conséquence : des IRL et annonces pointent vers des constructions inexistantes, ce qui déclenche plus tard un blocage sur l'onglet Obligations (règle `irlOrphan_*`, `useFormValidation.ts:365-368`) sans rapport visible avec l'action réalisée dans Localisation.

2. **Perte silencieuse de données au ré-clic sur le mode locatif déjà sélectionné.**
   `RentalConfigurationFields.tsx:86-119` (`selectMode`) n'a aucun garde-fou « même mode ». Recliquer sur « Un seul local » alors qu'il est déjà actif remet à `undefined` `isOccupied`, `hostingCapacity` et `occupantCount` déjà saisis. Même effet côté constructions additionnelles (composant partagé).

### Bugs

3. **Réduction du nombre de locaux sans avertissement.**
   `resizeUnits` (`RentalConfigurationFields.tsx:63-67`) tronque le tableau (`slice(0, count)`) : passer de 5 à 2 locaux supprime définitivement les loyers, dates, capacités et étages des locaux #3 à #5, sans confirmation ni possibilité d'annuler.

4. **Listes géographiques périmées au changement Urbaine/Rurale.**
   `useCCCFormState.ts:252-261` réinitialise seulement `availableQuartiers` et `availableAvenues`. `availableVilles`, `availableCommunes`, `availableTerritoires`, `availableCollectivites` conservent leurs anciennes options, et les effets de `useGeographicCascade.ts` ne se rejouent pas (ils dépendent de `province`/`ville`/…, pas de `sectionType`). Des options obsolètes peuvent rester affichées.

5. **Doublon de taxe signalé de façon asymétrique.**
   `useFormValidation.ts:330-337` ne marque que la seconde occurrence (`otherIdx < idx`) : l'utilisateur voit une erreur sur une ligne et rien sur la ligne jumelle, ce qui rend la correction confuse.

### Accessibilité

6. **Choix binaires Oui/Non non annoncés aux lecteurs d'écran.**
   `ObligationsTab.tsx:470-471` et `586-587` (hypothèque, litige) et `RentalConfigurationFields.tsx:329-352` (occupation) utilisent des boutons dont l'état sélectionné n'est porté que par la couleur, sans `aria-pressed`.

7. **Boutons icône sans libellé accessible** (`Trash2`, `X`, `Plus`) dans `AdditionalConstructionBlock.tsx` et `RentalConfigurationFields.tsx`.

## Correctifs proposés

### A. Intégrité des données (priorité 1)
- Dans `ConstructionSection.tsx`, remplacer la purge brute par un retrait passant par la logique de remappage existante (suppression des constructions additionnelles une à une via `removeAdditionalConstruction`, du dernier index au premier), afin que IRL et annonces soient nettoyés en même temps.
- Ajouter dans `selectMode` une sortie immédiate si le mode demandé est déjà actif (`if (mode === state.rentalConfiguration) return;`).
- À la réduction du nombre de locaux, demander une confirmation (AlertDialog) lorsque les locaux supprimés contiennent des données saisies, en précisant lesquels seront perdus.

### B. Cohérence des listes et des messages
- Réinitialiser toutes les listes géographiques dépendantes dans `handleSectionTypeChange` et laisser la cascade les repeupler (ajouter `sectionType` aux dépendances des effets concernés).
- Marquer les deux lignes d'un doublon de taxe, pas seulement la seconde.

### C. Accessibilité
- Ajouter `aria-pressed` (ou un `role="radiogroup"` avec `aria-checked`) sur les paires Oui/Non des onglets Obligations et sur le sélecteur d'occupation, plus `aria-label` sur les boutons icône.

## Détails techniques

Fichiers concernés : `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`, `src/components/cadastral/RentalConfigurationFields.tsx`, `src/components/cadastral/AdditionalConstructionBlock.tsx`, `src/components/cadastral/ccc-tabs/ObligationsTab.tsx`, `src/hooks/useCCCFormState.ts`, `src/hooks/ccc/useGeographicCascade.ts`, `src/hooks/ccc/useFormValidation.ts`.

Aucun changement de base de données ni de schéma. Ordre suggéré : A → B → C, chaque bloc étant livrable indépendamment.

## Point non tranché

Les onglets Obligations (626 l.) et Valeur (1068 l.) n'ont été inspectés que par recherche ciblée. Une relecture ligne à ligne de ces deux fichiers peut être ajoutée au lot A si vous souhaitez une couverture exhaustive.
