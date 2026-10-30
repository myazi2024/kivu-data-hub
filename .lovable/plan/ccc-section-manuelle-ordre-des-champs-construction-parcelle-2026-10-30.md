# CCC : Section manuelle, ordre des champs Construction, parcelle au bord du lac

## 1. Bloc « Localisation de la parcelle » — Section choisie à la main
Nouvel ordre : **Province → Section → Circonscription foncière** → (Ville/Commune/Quartier ou Territoire/Collectivité/Village).
- Nouvelle liste « Section * » : Section urbaine, Section rurale. Désactivée tant que la province n'est pas choisie.
- « Circonscription foncière » n'affiche que les circonscriptions de la province **et** de la section choisie. Une circonscription non classée apparaît dans les deux listes.
- Changer de section vide la circonscription et les champs géographiques en dessous (comme aujourd'hui quand la zone change), et met à jour le préfixe SU/SR du numéro de parcelle.
- La section n'est plus déduite de la circonscription. Les boutons « Zone urbaine / Zone rurale » et l'étiquette automatique disparaissent.
- Exception conservée : si le numéro vient d'une recherche cadastrale avec un préfixe SU/SR, la section est préremplie et verrouillée.
- Reprise d'une contribution existante : la section est restaurée depuis le numéro (SU/SR) enregistré.

## 2. Bloc « Construction » — nouvel ordre
Nouvel ordre : **Type de construction → Catégorie de bien → Nature de la construction → Matériaux de construction** → Usage, Standing…
- La catégorie ne propose que les catégories compatibles avec le type choisi (correspondance inverse de celle d'aujourd'hui ; ex. Industrielle → Immeuble/Bâtiment, Entrepôt/Hangar). « Terrain nu » reste un type qui fixe la catégorie.
- La nature devient une liste à choisir (au lieu d'être déduite des matériaux) et les matériaux ne proposent que ceux de la nature choisie (la liste admin est déjà organisée par nature).
- Changer un champ vide ceux qui en dépendent. Même ordre pour les constructions additionnelles.
- Libellés complets : « Nature de la construction », « Matériaux de construction ».

## 3. « Parcelle au bord du lac » (Oui / Non)
- Ajouté dans le bloc Localisation, juste après Quartier/Avenue (urbain) ou Village (rural). Obligatoire une fois la section choisie.
- Visible dans le récapitulatif et dans le détail admin d'une contribution, et recopié sur la parcelle à l'approbation.

## 4. Obligations › Taxes : « Taxe compensatoire des 10 mètres de rive »
- Ajoutée à la liste des types de taxe, uniquement si « Parcelle au bord du lac » = Oui.
- Mêmes champs que l'impôt foncier (année, montant, statut, justificatif) et même règle anti-doublon par année.
- Si on repasse à « Non », les taxes de ce type déjà saisies sont retirées après un avertissement.

## Détails techniques
- `geographicData.ts` : `getLandDistrictsForProvince(province, section?)` filtrant via `landDistrictSectionType` (non classées incluses).
- `useCCCFormState.ts` : retrait des effets de déduction depuis la circonscription ; `handleSectionTypeChange` purge `landDistrict` + niveaux géo ; nouveau champ `formData.isLakeside`. `LocationTab.tsx` : Select Section, filtre circonscription, champ lac.
- `propertyCategories.ts` : `CONSTRUCTION_TYPE_TO_CATEGORIES` dérivé de la table existante. `useConstructionCascade.ts` : cascade Type → Catégorie → Nature → Matériaux → Usage/Standing. `ConstructionSection.tsx` réordonné.
- `ObligationsTab.tsx` : option conditionnelle ; `useFormValidation` exige `isLakeside` et refuse la nouvelle taxe si non riverain.
- Migration : `cadastral_contributions.is_lakeside boolean`, `cadastral_parcels.is_lakeside boolean`, recopie dans la synchro d'approbation ; trigger refusant une taxe « rive » quand `is_lakeside` n'est pas vrai.
- Tests : filtre des circonscriptions par section, correspondance type → catégories, règle d'affichage de la taxe.
