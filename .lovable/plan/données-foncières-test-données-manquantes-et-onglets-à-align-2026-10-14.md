# Données foncières (test) : données manquantes et onglets à aligner

## Ce qui a été vérifié dans la base de test
Il y a bien 3 510 parcelles de test, mais plusieurs informations attendues par le menu Données foncières n'ont jamais été générées. C'est pour cela que la carte et plusieurs onglets restent vides, même après la correction précédente.

| Constat | Effet à l'écran |
|---|---|
| Aucune parcelle ni contribution de test n'a de circonscription foncière (0 sur 3 510) | La carte des circonscriptions (vue par défaut) et le filtre « Circonscription » restent vides |
| Toutes les contributions de test sont restées « en attente » (0 validée) : une règle de sécurité remet le statut à « en attente » pour le générateur | Onglet Titre foncier : genre, nationalité, statut juridique, concordance titre/propriétaire vides |
| Aucune donnée de location, de vente ou d'expertise de valeur (loyers, prix de revente, valeur estimée, configuration locative) | Onglet Location et valeur entièrement vide |
| Aucune entrée de bornage | Onglet Bornage vide |
| Hauteur de construction, usage réel, dimensions d'appartement absents ; toutes les constructions « achevées » | Visuels Hauteur, Surface des appartements, Achevée vs En cours vides ou sur une seule valeur |
| Les parcelles rurales reçoivent des territoires du Sud-Kivu (Kabare, Uvira…) quelle que soit leur province | Territoires incohérents dans les filtres et sur la carte |

Onglets du menu Données foncières aujourd'hui : Titre foncier, Construction, Hypothèque, Lotissement, Litiges fonciers, Location et valeur, Taxes foncières, Bornage. Cinq anciens onglets (Contributions, Expertise, Historique de propriété, Certificats, Factures) sont masqués mais encore branchés dans l'écran, les réglages et le serveur.

## Ce qui va changer
1. **Générateur de test aligné sur les 8 onglets** : chaque onglet reçoit des données réalistes et cohérentes avec le formulaire CCC :
   - circonscription foncière tirée de la liste officielle de la province de la parcelle ;
   - territoires, groupements et villages ruraux propres à chaque province ;
   - contributions réparties entre validées, en attente et rejetées ;
   - location (mono/multi-locaux, dont quelques locaux vacants ou occupés par le propriétaire), prix de revente, valeur estimée récente ;
   - bornage (PV, objet, géomètre, date) ;
   - hauteur, usage réel, dimensions d'appartement, constructions achevées et en cours.
2. **Correction de la règle de statut** : le générateur (serveur, accès de service) peut fixer le statut des contributions de test ; la protection reste inchangée pour les utilisateurs et les non-admins.
3. **Retrait des 5 onglets masqués** de l'écran Analytics, des réglages admin, du catalogue d'achat et de la fonction serveur des données. Les données sources et leurs écrans hors Données foncières restent intacts.
4. **Données de test à régénérer** : après la correction, il faudra cliquer sur « Supprimer les données test » puis « Générer » dans le mode test, car les données actuelles ont été créées avec les anciens défauts.

## Vérification
- Contrôle après génération : chacun des 8 onglets et la carte des circonscriptions ont des données de test non vides (requête par onglet sur la fonction serveur).
- Test garantissant que la liste des circonscriptions du générateur reste identique à celle de l'application.
- Suite de tests et contrôle du code. L'affichage dans l'espace admin ne peut pas être vu de mon côté (double authentification).

## Détails techniques
- `supabase/functions/_shared/test-mode-generators/_shared.ts` : ajout `LAND_DISTRICTS_BY_PROVINCE` (copie de `landDistrictsData`) et territoires ruraux par province ; test Vitest de parité avec `src/lib/geographicData.ts`.
- `parcels.ts` / `contributions.ts` : `land_district`, territoires par province, champs `is_rented`, `rental_configuration`, `rental_units`, `monthly_rent_usd`, `would_sell_if_offered`, `resale_price_*`, `has_recent_appraisal`, `appraisal_date`, `appraised_value_usd`, `boundary_history`, `building_height`, `construction_status` mixte, `actual_usage`, `apartment_length/width/height/orientation`.
- Migration : `normalize_contribution_insert` et `protect_contribution_review_fields` laissent passer `auth.role() = 'service_role'` ; vérification préalable que `sync_approved_contribution_to_parcel` met à jour la parcelle de test existante sans en créer une seconde.
- Migration : `get_analytics_tab_dataset` sans les cas `contributions`, `expertise`, `ownership`, `certificates`, `invoices` ; suppression des lignes correspondantes dans `analytics_charts_config` et `analytics_visual_catalog` (aucun accès acheté actif vérifié avant).
- Front : retrait des 5 blocs de `BLOCK_MAP` (`ProvinceDataVisualization.tsx`), de `analyticsTabsRegistry.ts`, `mapTabProfiles.ts`, `crossVariables.ts`, icônes et fichiers `ContributionsBlock`, `ExpertiseBlock`, `OwnershipHistoryBlock`, `CertificatesBlock`, `InvoicesBlock` s'ils ne sont plus importés ailleurs ; types `LandAnalyticsData` réduits.
- `TestModeGuide.tsx` : rappel de régénérer les données après mise à jour du générateur.
