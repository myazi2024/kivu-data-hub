# Expertise immobilière — type d'expertise, valeurs à déterminer et sélection sur la carte

## Ce que l'utilisateur pourra faire

Dans l'onglet Général de la demande d'expertise, deux nouveaux choix apparaissent en tête de formulaire :

1. **Type d'expertise** : partielle ou totale.
2. **Valeur(s) à déterminer** : valeur marchande, valeur locative, ou les deux (cases à cocher, au moins une obligatoire).

Le bloc « Construction concernée par l'expertise » devient une **carte de la parcelle** montrant le contour du terrain et les constructions connues, **sans aucune mesure affichée** (pas de longueurs de côtés, pas de surfaces, pas de coordonnées — ces données restent payantes). Sous la carte, la liste des constructions reste disponible en secours si la parcelle n'a pas de tracé.

Modes de sélection proposés, l'utilisateur choisit celui qui lui convient :
- **Toute la parcelle** (expertise totale) — le contour entier est mis en évidence.
- **Une construction** — clic sur un bâtiment de la carte.
- **Plusieurs constructions** — sélection multiple.
- **Zone dessinée** — l'utilisateur trace lui-même une zone sur la parcelle.

Le choix « toute la parcelle » bascule automatiquement le type sur « totale » ; toute autre sélection bascule sur « partielle » (l'utilisateur peut corriger). Un résumé lisible s'affiche : « Expertise partielle — Bâtiment principal + Annexe 1 — valeur marchande et locative ».

## Tarification

Les nouveaux choix influencent le montant, avec des paramètres gérés dans la configuration Admin des frais d'expertise :
- un supplément par valeur demandée (marchande / locative),
- un coefficient réduit pour une expertise partielle.

Le total reste **calculé côté serveur** : le client n'impose jamais son montant. Le récapitulatif de paiement affiche le détail ligne par ligne.

## Détails techniques

### Base de données
- `expertise_fees_config` : ajout de `applies_to_market_value`, `applies_to_rental_value`, `partial_multiplier` (défaut 1.0) pour paramétrer les frais existants et en créer de nouveaux.
- `real_estate_expertise_requests` : nouvelles colonnes `expertise_scope` (`partial` | `total`), `valuation_targets` (text[] : `market`, `rental`), `target_building_refs` (text[]), `target_area_geojson` (jsonb, zone dessinée), `computed_fee_items` (jsonb) et `total_amount_usd`.
- Fonction `calculate_expertise_fees(p_scope, p_valuations text[])` renvoyant `{fee_items, total_amount_usd}`.
- Trigger d'insertion : force le montant et les frais depuis la fonction serveur, refuse un `valuation_targets` vide et un `expertise_scope` incohérent avec la sélection.
- RPC `get_parcel_expertise_prefill` étendue pour renvoyer `gps_coordinates`, `building_shapes`, `parcel_sides` — mais **sans les longueurs ni surfaces** (les côtés sont renvoyés dépouillés de `length`, les formes sans `areaSqm`/`perimeterM`), afin que la carte reste gratuite.

### Frontend
- `src/hooks/useParcelExpertisePrefill.ts` : types étendus pour la géométrie.
- Nouveau `src/components/cadastral/expertise/ExpertiseScopeSelector.tsx` : type d'expertise + valeurs à déterminer.
- Nouveau `src/components/cadastral/expertise/ExpertiseTargetMap.tsx` : rendu SVG dérivé de `ParcelSketchSVG` en mode « sans mesures » (nouveau prop `hideMeasurements`), bâtiments cliquables, surbrillance, sélection multiple et outil de tracé de zone libre.
- `BuildingTargetSelector.tsx` : passe en sélection multiple, sert de repli/liste synchronisée avec la carte.
- `RealEstateExpertiseRequestDialog.tsx` : nouvel état (`expertiseScope`, `valuationTargets`, `selectedBuildingRefs`, `drawnArea`), validation dans la liste des champs manquants, payload et récapitulatif mis à jour.
- `AdminExpertiseFeesConfig.tsx` : édition des nouveaux paramètres tarifaires.
- Admin (`ExpertiseDetailsDialog`) et PDF certificat : affichage du périmètre expertisé et des valeurs demandées.

### Revue de cohérence (après implémentation)
- Supprimer les champs collectés mais jamais enregistrés ni affichés dans le dialogue.
- Aligner `src/types/expertise.ts` sur les colonnes réelles de la table.
- Vérifier que le montant affiché à l'utilisateur provient bien du serveur (plus d'estimation locale divergente).
- Uniformiser la terminologie et les statuts (enum EN en base, libellés FR à l'écran).
- Poursuivre la modularisation du dialogue (3 519 lignes) en extrayant les blocs Général / Matériaux / Environnement / Documents.
