# Ajouter « Circonscription foncière » dans l'onglet Localisation

Nouveau champ obligatoire placé juste après « Province », dont la liste dépend de la province choisie, alimentée par la nomenclature officielle du Ministère des Affaires Foncières (143 circonscriptions, 26 provinces).

## Comportement attendu

- Champ « Circonscription foncière * » affiché sous Province, désactivé tant qu'aucune province n'est choisie (message « Province d'abord »).
- La liste ne propose que les circonscriptions de la province sélectionnée.
- Si la province change, la circonscription est purgée automatiquement (même logique de cascade que Ville/Territoire).
- Repli de saisie manuelle si aucune circonscription n'est connue pour la province, comme pour les autres niveaux géographiques.
- Champ requis à la soumission : signalé dans la liste des champs manquants du récapitulatif avec navigation vers Localisation.
- Affiché dans le récapitulatif, la fiche cadastrale de la parcelle et la fiche admin de la contribution.

## Référentiel (source officielle)

Kinshasa (16), Kongo-Central (11), Haut-Katanga (8), Lualaba (5), Tanganyika (5), Haut-Lomami (2), Haut-Uele (4), Bas-Uele (3), Équateur (7), Mongala (2), Tshuapa (2), Sud-Ubangi (2), Nord-Ubangi (2), Nord-Kivu (13), Sud-Kivu (14), Lomami (2), Ituri (6), Tshopo (4), Maniema (8), Kasaï (3), Kasaï-Central (3), Kasaï-Oriental (4), Sankuru (3), Maï-Ndombe (4), Kwango (3), Kwilu (7).

Le référentiel sera intégré tel quel (noms exacts : « Lubumbashi-Plateau », « Kasenga/M'Pweto », « Beni-Ville », « Kalehe-Sud/Kalonge », etc.), avec correspondance tolérante des noms de province (accents, tirets) via l'utilitaire de normalisation existant.

## Détails techniques

- `src/lib/geographicData.ts` : ajout de `landDistrictsData: Record<province, string[]>` et de `getLandDistrictsForProvince(province)`, avec normalisation via `normalizeProvinceName` pour absorber les variantes d'écriture.
- `src/hooks/ccc/useGeographicCascade.ts` : dans l'effet Province, purge de `circonscriptionFonciere` et alimentation de `availableCirconscriptions` (même garde `isLoadingFromDbRef`).
- `src/hooks/useCCCFormState.ts` : nouveau champ d'état, restauration en mode édition, purge dans `resetLocationBlock`.
- `src/hooks/useCadastralContribution.tsx` + `src/utils/contributionFormMapping.ts` : sérialisation/désérialisation du champ.
- `src/hooks/ccc/useFormValidation.ts` : règle obligatoire (urbain et rural).
- UI : `LocationTab.tsx` (Select après Province + repli saisie manuelle), `ccc-tabs/ReviewTab.tsx`, `cadastral-document/sections/LocationSection.tsx`, `CCCDetailsDialog` admin.
- Migration : colonne `land_district text` sur `cadastral_contributions` et `cadastral_parcels`, puis extension de `sync_contribution_extra_fields_to_parcel()` / branche INSERT de `sync_approved_contribution_to_parcel()` pour la propager à l'approbation (aucune RLS ni grant nouveau : colonnes sur tables existantes).
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
