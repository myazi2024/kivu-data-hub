# Audit du formulaire CCC — constats vérifiés et correctifs

Audit front-end (composants, hooks, validation) et back-end (payload, colonnes, triggers, règles d'accès). Chaque constat ci-dessous a été vérifié par lecture de code ou requête directe en base.

## Constats vérifiés

### Bloquants

1. **Un utilisateur ne peut pas modifier sa propre contribution.**
  La base n'a aucune règle d'accès autorisant un utilisateur à mettre à jour ses contributions (seuls les administrateurs en ont une — vérifié en base). Or le formulaire propose l'édition d'un brouillon en attente ou retourné (`useCadastralContribution.tsx:903-928`) : la mise à jour ne touche aucune ligne et l'utilisateur voit systématiquement « Cette contribution ne peut plus être modifiée ». La fonction d'édition est donc entièrement inopérante.
2. **Faille d'insertion : statut et score de fraude non protégés.**
  La règle d'insertion vérifie uniquement que la ligne appartient à l'auteur ; rien n'empêche un appel direct à l'API d'insérer une contribution avec `status = 'approved'`, `fraud_score = 0`, `is_suspicious = false`, contournant l'anti-abus et la revue. Le déclencheur de synchronisation ne s'exécutant qu'à la mise à jour (vérifié : `sync_contribution_to_parcel_trigger`, AFTER UPDATE), aucune parcelle n'est créée, mais la contribution apparaît approuvée dans les listes et échappe au contrôle.
3. **Champs saisis puis perdus à l'approbation.**
  Six champs sont bien enregistrés sur la contribution mais n'existent pas (ou ne sont pas recopiés) sur la parcelle : `actual_usage`, `actual_usage_other`, `operational_capacity`, `operational_capacity_unit`, `lease_contract_url` (aucune colonne sur `cadastral_parcels`) et `previous_permit_number` (colonne présente, absente du déclencheur — vérifié dans le corps de la fonction). L'usage réel du locataire et le contrat de location disparaissent donc du dossier parcellaire définitif.

### Bugs

4. **Dialogue « modifications non enregistrées » déclenché à tort.**
  `useCCCFormState.ts:1130-1134` teste `Object.keys(formData).length > 1`. Les cascades géographiques ajoutent des clés à `undefined` sans saisie utilisateur, ce qui suffit à déclencher la confirmation de sortie sur un formulaire vide.
5. **Course au chargement en mode édition.**
  `useCCCFormState.ts:1314-1316` remet `isLoadingFromDbRef` à `false` via un `setTimeout(500)` sans annulation. Rouvrir le formulaire pendant ce délai laisse les cascades écraser les données fraîchement chargées.
6. **Catégorie de bien silencieusement perdue au chargement.**
  `useCCCFormState.ts:1201-1206` : si plusieurs catégories partagent le même type de construction, la déduction échoue et la catégorie reste vide, sans message — l'utilisateur découvre le problème par la réinitialisation des champs dépendants.
7. **Animation de succès non nettoyée.**
  `useCCCFormState.ts:899-912` : intervalle de confettis de 3 s sans nettoyage au démontage.
8. **Deux validations divergentes.**
  Le contrôle des coordonnées GPS (≥ 3 points) n'existe que dans `useCadastralContribution.tsx:522-537` et est ignoré si le tableau est vide ; `useFormValidation.ts` ne l'impose pas. Un formulaire « valide » côté onglets peut échouer tardivement par une alerte sans indication d'onglet.
9. **Échecs silencieux sur le croquis.**
  `ParcelMapPreview.tsx:751,758` et `useCCCFormState.ts:640` journalisent l'erreur sans aucun retour utilisateur : le panneau de conflits de voisinage reste figé sans possibilité de réessayer.

### Code orphelin

10. `create_parcel_from_approved_contribution` n'est rattachée à aucun déclencheur (vérifié : la liste des déclencheurs de `cadastral_contributions` ne la contient pas) et n'est appelée nulle part — fonction morte maintenue à tort.
11. `isTerrainNuCategory` existe en double : source de vérité `cccPredicates.ts:31` et copie locale de signature différente dans `RentalConfigurationFields.tsx:77`.
12. Trois fonctions exportées sans consommateur externe : `countMissingLeaseContracts` (`leaseContractNotice.ts:13`), `isUnbuiltOnlyUsage` (`actualUsage.ts:23`), `isGenericBorneName` (`parcelSideNumbering.ts:15`).

### Performance

13. **Chargement admin non filtré.** `AdminCCCContributions.tsx:93-122` charge toute la table avec toutes les colonnes JSON (coordonnées, formes, annonces), puis filtre côté navigateur, alors que des index par statut existent.
14. **Approbation en lot séquentielle.** `AdminCCCContributions.tsx:427-469` enchaîne validation + mise à jour + journal par dossier, soit 4 allers-retours par ligne.
15. **Aucune mémoïsation sur les onglets** (`LocationTab`, `ObligationsTab`, `MarketValueTab`, `ReviewTab`, 600 à 1 000 lignes chacun) : chaque frappe re-rend l'onglet entier, les fonctions de mise à jour (`useCCCFormState.ts:547-643`) changeant d'identité à chaque rendu.

### Accessibilité

16. Boutons à appui long du croquis (`ParcelMapPreview.tsx:2113-2130`) sans équivalent clavier ; bascule du mode impression (`ReviewTab.tsx:107-126`) sans annonce aux lecteurs d'écran.

## Correctifs proposés

### Étape A — Sécurité et intégrité (priorité 1)

- Migration : règle de mise à jour utilisateur sur `cadastral_contributions` limitée aux statuts `pending`/`returned` et à ses propres lignes.
- Migration : contraindre l'insertion (statut forcé à `pending`, `fraud_score`/`is_suspicious`/`reviewed_by`/`verified_by`/`original_parcel_id` non renseignables par le client) via règle `WITH CHECK` renforcée et déclencheur de normalisation avant insertion.
- Migration : ajouter les colonnes manquantes sur `cadastral_parcels` (`actual_usage`, `actual_usage_other`, `operational_capacity`, `operational_capacity_unit`, `lease_contract_url`) et compléter `sync_approved_contribution_to_parcel` pour recopier ces champs plus `previous_permit_number`, dans les deux branches (création et mise à jour).
- Migration : supprimer la fonction morte `create_parcel_from_approved_contribution`.

### Étape B — Bugs front-end

- Remplacer le test de « données saisies » par un contrôle de valeurs réellement renseignées.
- Annuler le `setTimeout` de fin de chargement au démontage et le remplacer par un compteur de chargement.
- Avertir l'utilisateur lorsque la catégorie de bien n'a pas pu être déduite.
- Nettoyer l'intervalle de confettis au démontage.
- Aligner la règle GPS (≥ 3 points) dans `useFormValidation.ts` pour un blocage inline au bon onglet.
- Ajouter un retour utilisateur (alerte + réessai) sur les échecs de calcul du croquis et des voisins.

### Étape C — Nettoyage

- Supprimer le doublon `isTerrainNuCategory` de `RentalConfigurationFields.tsx`.
- Rendre internes les trois fonctions exportées sans consommateur.

### Étape D — Performance

- Filtrage et pagination côté serveur dans la liste admin, avec projection des colonnes utiles seulement (les blocs JSON restent chargés au détail).
- Approbation en lot parallélisée par petits lots et journal d'audit inséré en une seule requête.
- `React.memo` sur les quatre onglets et `useCallback` sur les fonctions de mise à jour partagées.

### Étape E — Accessibilité

- Équivalents clavier pour les boutons à appui long, annonce du mode impression.

## Détails techniques

Migrations SQL : règles d'accès `cadastral_contributions` (INSERT/UPDATE), déclencheur de normalisation avant insertion, colonnes `actual_usage*`, `operational_capacity*`, `lease_contract_url` sur `cadastral_parcels`, mise à jour de `sync_approved_contribution_to_parcel`, suppression de `create_parcel_from_approved_contribution`.

Fichiers front : `src/hooks/useCCCFormState.ts`, `src/hooks/useCadastralContribution.tsx`, `src/hooks/ccc/useFormValidation.ts`, `src/components/cadastral/ParcelMapPreview.tsx`, `src/components/cadastral/RentalConfigurationFields.tsx`, `src/components/cadastral/ccc-tabs/*`, `src/components/admin/AdminCCCContributions.tsx`, `src/utils/{actualUsage,leaseContractNotice,parcelSideNumbering}.ts`.

Ordre : A → B → C → D → E, chaque étape livrable indépendamment. Vérification par typecheck et suite de tests existante après chaque étape.

## Point non tranché

`useFormValidation.ts` (653 l.) et les internes de `ParcelSidesDimensionsPanel`/`RoadBorderingSidesPanel` n'ont été inspectés que partiellement. Une relecture exhaustive peut être ajoutée à l'étape B si vous la souhaitez.