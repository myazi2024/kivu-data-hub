# Revue du service « Expertise immobilière » — bugs et dépendances en cascade

## Ce qui a été vérifié

Lecture du formulaire de demande, des composants et hooks d'expertise, de l'espace Admin, et interrogation directe de la base (colonnes, règles d'accès, déclencheurs).

## Problèmes constatés

### 1. Faille de paiement sur la table des paiements d'expertise (critique, vérifié en base)
La table des paiements d'expertise contient une colonne « statut », et la règle d'accès autorise l'utilisateur à modifier librement **toutes** les colonnes de sa propre ligne. Aucun déclencheur de protection n'existe sur cette table (contrairement à la demande d'expertise elle-même, qui est bien protégée). Un utilisateur peut donc déclarer son paiement « payé » sans avoir payé, ou créer directement une ligne « payé ».

### 2. Terrain nu : champs de construction réclamés à tort
La vérification de complétude compare la catégorie du bien à une valeur qui n'existe jamais (`terrain_nu` au lieu de « Terrain nu »). Conséquence : pour une parcelle sans construction, le récapitulatif réclame année de construction, surface bâtie et photos de construction, alors que ces blocs sont masqués à l'écran. Incohérence directe entre l'affichage et le blocage avant paiement.

### 3. Perte de saisie au changement de périmètre (multi-constructions)
Quand l'utilisateur modifie le périmètre (type d'expertise, constructions cochées), la fiche en cours de saisie est remplacée automatiquement par une autre **sans être enregistrée**. Les caractéristiques déjà renseignées pour cette construction sont perdues, puis écrasées par le pré-remplissage cadastral.

### 4. Récapitulatif trompeur en multi-constructions
Le compteur de complétion « Construction x/6 » ne reflète que la fiche affichée. L'utilisateur peut voir 6/6 alors que d'autres constructions du périmètre sont vides. Aucun signalement des fiches incomplètes.

### 5. Données de la demande faussées en multi-constructions
Les champs « résumé » enregistrés en tête de demande (catégorie, type, année, surface…) reprennent la dernière fiche consultée, et non la construction principale. L'écran Admin peut donc présenter les caractéristiques d'une construction secondaire comme étant celles de la demande.

### 6. Typage relâché
Les champs récemment ajoutés (périmètre, valeurs à déterminer, fiches par construction, indicateurs cadastraux) ne sont pas déclarés dans le type de création de demande, et le champ des fiches est typé `| any` — plus aucune erreur ne serait détectée en cas de renommage.

## Corrections prévues

### Back-end
- Migration de sécurité sur les paiements d'expertise : remplacer la règle de modification trop large par une règle limitée aux lignes en attente, et ajouter un déclencheur interdisant toute écriture de `status`, `paid_at`, `transaction_id`, `total_amount_usd` et `receipt_url` hors rôle de service. Forcer `status = 'pending'` à l'insertion côté client.

### Front-end
- Corriger la détection « Terrain nu » dans la validation de complétude (deux emplacements) pour l'aligner sur l'affichage.
- Enregistrer la fiche courante avant tout basculement automatique de construction, comme le fait déjà le changement manuel d'onglet.
- Rendre le compteur de complétion sensible à toutes les fiches du périmètre et lister nommément les constructions incomplètes dans les champs manquants avant paiement.
- Alimenter les champs « résumé » de la demande depuis la première construction du périmètre (et non la fiche active).
- Déclarer les nouveaux champs dans les types et retirer le `| any` du champ des fiches.

## Détails techniques

- Migration : `DROP POLICY "Users can update their own expertise payments"` → nouvelle policy `USING (auth.uid() = user_id AND status = 'pending')` ; fonction `prevent_client_expertise_payment_fields()` (`SECURITY DEFINER`, `SET search_path = public`) en `BEFORE UPDATE`, et `BEFORE INSERT` forçant `status='pending'`, `paid_at=NULL`, sur le modèle de `prevent_client_expertise_payment_status` déjà en place sur `real_estate_expertise_requests`. Les edge functions (service role) restent autorisées.
- `RealEstateExpertiseRequestDialog.tsx` : lignes ~2889 et ~2897 `constructionType !== 'terrain_nu'` → `!isTerrainNu` ; effet lignes ~547-552 → `collectFiche()` + `setBuildingFiches` avant `setActiveFicheRef` (extraire un `switchFiche(ref)` partagé avec `handleSelectFiche` ligne ~667) ; badge ligne ~3120 calculé sur `buildAllBuildingDetails()` ; `getMissingFields` parcourt les fiches et préfixe le libellé par le nom de la construction ; payload lignes ~1213-1249 : colonnes plates issues de `buildAllBuildingDetails()[0]`.
- `src/types/expertise.ts` : compléter `CreateExpertiseRequestData` (`expertise_scope`, `valuation_targets`, `target_building_refs`, `target_area_geojson`, `building_details`, `target_building_ref`, `target_building_label`, `cadastre_discrepancies`, `building_height_m`, `is_rented`, `monthly_rent_usd`, `hosting_capacity`, `occupant_count`, `parcel_sound_environment`) et retirer `| any` ligne ~111.
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` puis `npx vitest run`.
