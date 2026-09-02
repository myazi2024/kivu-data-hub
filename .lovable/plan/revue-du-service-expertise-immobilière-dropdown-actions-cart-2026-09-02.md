# Revue du service « Expertise immobilière » (dropdown actions, carte cadastrale)

Premier service de la revue des services dépendants du formulaire CCC. Constats vérifiés dans le code et la base, puis correctifs proposés.

## Constats vérifiés

**1. Le pré-remplissage depuis le cadastre ne fonctionne jamais (fonctionnalité orpheline)**
La carte ne charge que 15 colonnes de `cadastral_parcels` (`useCadastralMapData.tsx` ligne 32 : id, parcel_number, gps, area, province, ville, commune, quartier, lat/lng, is_subdivided, title_reference_number, property_title_type). Or le dialogue d'expertise construit sa liste de bâtiments à partir de `construction_type`, `construction_nature`, `construction_materials`, `construction_year`, `declared_usage`, `property_category`, `floor_number`, `additional_constructions` — aucune de ces colonnes n'est transmise. Résultat : le sélecteur « Construction concernée par l'expertise » (`BuildingTargetSelector`) ne s'affiche jamais, le verrouillage « données du cadastre » est vide, et l'utilisateur ressaisit tout à la main.

**2. Indicateurs CCC récents absents de l'expertise**
La table `cadastral_parcels` possède désormais `building_height`, `hosting_capacity`, `occupant_count`, `is_rented`, `monthly_rent_usd`, `rental_configuration`, `rental_units`, `rental_units_count`, `rental_start_date`, `is_occupied`, `standing`, `apartment_height/width/length/orientation`, `sound_environment`. Aucun de ces indicateurs n'arrive dans la demande d'expertise, alors qu'ils sont déterminants pour une valorisation (hauteur, revenu locatif, standing, environnement sonore).

**3. Champs saisis puis perdus à l'enregistrement**
Le formulaire collecte `propertyCategory`, `constructionType`, `constructionNature`, `declaredUsage`, `hasDirectStreetAccess`, `distanceFromRoad` mais le payload envoyé (`handleProceedToPayment`) ne les inclut pas, et la table `real_estate_expertise_requests` n'a pas ces colonnes. L'expert reçoit donc une demande amputée de la nomenclature cadastrale saisie par le demandeur.

**4. Faille de paiement : le client se déclare « payé »**
Après un paiement mobile money, le client exécute directement `update({ payment_status: 'paid' })` sur `real_estate_expertise_requests`, autorisé par la policy `Users can update payment_status on own requests` (with_check `auth.uid() = user_id`). N'importe quel utilisateur peut donc passer sa demande en payée sans payer. Contraire à la règle projet : seules les edge functions (service role) valident un paiement.

**5. Policies incohérentes**
`expertise_payments` : la policy admin lit `profiles.role` (modèle legacy) au lieu de `has_role()`; la policy UPDATE utilisateur n'a pas de `with_check`. `real_estate_expertise_requests` : doublons de policies SELECT (`public` + `authenticated`).

**6. Dette structurelle**
`RealEstateExpertiseRequestDialog.tsx` fait 3 466 lignes (règle projet : modulariser au-delà de 1 000).

## Correctifs prévus

### Backend
- Migration : ajouter à `real_estate_expertise_requests` les colonnes `property_category`, `construction_type`, `construction_nature`, `construction_materials_declared`, `declared_usage`, `building_height_m`, `has_direct_street_access`, `distance_from_road_m`, `is_rented`, `monthly_rent_usd`, `hosting_capacity`, `occupant_count`, `parcel_sound_environment` (toutes nullables).
- Migration sécurité : supprimer la policy permettant à l'utilisateur de modifier `payment_status`; la remplacer par un trigger/policy interdisant toute écriture de `payment_status` hors service role. Aligner la policy admin de `expertise_payments` sur `has_role(auth.uid(),'admin')`, ajouter le `with_check` manquant, dédupliquer les policies SELECT.
- Confirmation du paiement mobile money déplacée côté edge function (`process-mobile-money-payment` / `update-payment-status`) qui met à jour `expertise_payments` et `payment_status` avec le service role.

### Frontend
- Étendre le `select` de `useCadastralMapData.tsx` aux colonnes de construction et aux nouveaux indicateurs CCC, et typer `parcelData` en conséquence.
- Rendre le sélecteur de bâtiment opérationnel : liste des constructions (principale + additionnelles), pré-remplissage catégorie/type/nature/matériaux/année/étages/surface/usage/standing/hauteur, badges « donnée cadastre » et champ d'écart déjà présent.
- Nouveau bloc en lecture seule « Contexte cadastral » (hauteur déclarée, standing, environnement sonore, statut locatif et loyer, capacité/occupants) affiché à l'expert et transmis dans la demande.
- Inclure dans le payload les champs aujourd'hui perdus, et retirer le passage à `paid` côté client (statut lu depuis le serveur après confirmation).
- Modularisation du dialogue en sous-composants (`src/components/cadastral/expertise/`) : onglets Général / Construction / Équipements / Environnement / Documents, plus `useExpertiseFormState`, sans changement fonctionnel.

## Suite
Une fois ce service validé, la même revue sera appliquée aux autres services du dropdown (mutation, autorisation de bâtir, lotissement, fiscalité, litiges, titre foncier, fiche parcellaire).
