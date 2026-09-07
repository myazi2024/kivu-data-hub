# Expertise immobilière — carte du périmètre, dépendances et finitions

## Ce qui est constaté (vérifié)

- La parcelle SU/123456 possède bien son tracé (4 bornes) mais **aucune construction** enregistrée dans la fiche parcellaire, alors que la contribution CCC approuvée de cette même parcelle contient bien 1 construction dessinée. Le tracé des constructions n'a donc jamais été recopié vers la fiche parcellaire lors de l'approbation (la recopie existe aujourd'hui, mais l'approbation est antérieure). Résultat dans l'expertise : la carte s'affiche vide de constructions et le mode « Construction(s) » n'a rien à sélectionner.
- Le formulaire d'expertise ne lit la géométrie que depuis le service sécurisé ; si celui-ci ne renvoie rien, aucun repli n'est tenté avec les données déjà chargées par la carte cadastrale, d'où un aperçu vide.
- Les boutons « Construction(s) » et « Zone tracée » restent cliquables même quand « Expertise totale » est choisi (cliquer bascule silencieusement en partielle).
- Les informations nouvelles de la demande (type d'expertise, valeurs demandées, constructions ciblées, zone tracée, détail des frais serveur) ne sont affichées nulle part côté Admin.
- La configuration Admin des frais d'expertise ne permet pas d'éditer les nouveaux réglages tarifaires (frais lié à la valeur marchande, à la valeur locative, coefficient d'expertise partielle) — ils existent en base mais restent inaccessibles.

## Corrections prévues

### 1. La parcelle et ses constructions s'affichent
- Recopier, pour les parcelles déjà approuvées, le tracé des constructions et le tracé du terrain depuis les contributions CCC correspondantes lorsqu'ils manquent (opération de rattrapage unique).
- Le service de pré-remplissage sécurisé prend le relais sur la contribution approuvée quand la fiche parcellaire n'a pas de géométrie — toujours sans longueurs, surfaces ni mesures (données payantes).
- Le formulaire utilise en dernier recours le contour déjà connu de la carte cadastrale.
- Message clair quand aucune construction n'est connue : invitation à tracer une zone plutôt qu'un cadre vide.

### 2. Dépendances en cascade
- « Expertise totale » verrouille (grise, non cliquables) « Construction(s) » et « Zone tracée », vide la sélection de constructions et la zone tracée.
- « Expertise partielle » débloque les deux modes ; sélectionner « Toute la parcelle » repasse en totale.
- La sélection d'une construction sur la carte ou dans la liste reste synchronisée avec le mode et le type.
- La zone tracée est effacée dès qu'on quitte le mode « Zone tracée » ; le bouton de tracé ne reste pas actif après un changement de mode.
- Le récapitulatif et le contrôle avant paiement suivent exactement ces règles (aucune demande partielle sans cible).

### 3. Design demandé
- « Expertise totale » et « Expertise partielle » côte à côte sur une ligne (deux colonnes).
- « Valeur marchande » et « Valeur locative » côte à côte sur une ligne (deux colonnes).
- Textes d'aide raccourcis pour tenir dans les cartes côte à côte sur mobile.

### 4. Fonctionnalités orphelines
- Fiche Admin d'une demande : nouveau bloc « Périmètre expertisé » (type d'expertise, valeurs demandées, constructions ciblées ou zone tracée) et détail des frais calculés côté serveur.
- Configuration Admin des frais d'expertise : édition des réglages « s'applique à la valeur marchande », « s'applique à la valeur locative » et « coefficient expertise partielle ».
- Alignement du fichier de types de l'expertise sur les colonnes réelles.

## Détails techniques

- Migration : rattrapage `UPDATE cadastral_parcels ... FROM cadastral_contributions` sur `building_shapes`/`gps_coordinates`/`parcel_sides` manquants (contributions `approved`, même `parcel_number`).
- `get_parcel_expertise_prefill` : repli sur la dernière contribution approuvée si la parcelle n'a pas de géométrie, en conservant le filtrage des mesures (`areaSqm`, `perimeterM`, `length`, `sides`).
- `RealEstateExpertiseRequestDialog.tsx` : `parcelVertices`/`mapBuildings` dérivés de `cadastreSource` (prefill + `parcelData`), `handleScopeChange`/`handleSelectionModeChange` durcis, boutons de mode `disabled` quand `expertiseScope === 'total'`.
- `ExpertiseTargetMap.tsx` : reset de l'état `drawing` sur changement de `mode`, état vide explicite.
- `ExpertiseScopeSelector.tsx` : `grid grid-cols-2` pour les deux groupes.
- `ExpertiseDetailsDialog.tsx` : lecture de `expertise_scope`, `valuation_targets`, `target_building_refs`, `target_area_geojson`, `computed_fee_items`, `total_amount_usd`.
- `AdminExpertiseFeesConfig.tsx` : champs `applies_to_market_value`, `applies_to_rental_value`, `partial_multiplier`.
- Vérification finale : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
