

# Audit complet du formulaire CCC

## A. Données collectées mais NON affichées dans l'Admin

L'interface admin (`AdminCCCContributions.tsx`) ne montre **pas** les champs suivants dans le panneau de détails, bien qu'ils soient enregistrés en base :

1. **`property_category`** — Catégorie de bien (Villa, Appartement, etc.) : collectée, persistée, mais jamais affichée dans l'onglet "Général" de l'admin.
2. **`construction_materials`** — Matériaux de construction : collecté, persisté, absent de l'affichage admin.
3. **`standing`** — Standing/niveau de finition : collecté, persisté, absent de l'affichage admin.
4. **`construction_year`** — Année de construction : collectée, persistée, absente.
5. **`apartment_number` / `floor_number`** — N° appartement et étage : collectés, persistés, absents.
6. **`house_number`** — Numéro de la parcelle (voirie) : collecté, persisté, absent.
7. **`lease_years`** — Durée du bail (quand bail initial/renouvellement) : collectée côté formulaire mais **jamais envoyée en DB** (pas dans `buildContributionPayload`).
8. **`is_title_in_current_owner_name`** — Titre au nom du propriétaire actuel : collecté, persisté via `isTitleInCurrentOwnerName` dans `useCadastralContribution.tsx` mais **absent du payload** (`buildContributionPayload` ne l'inclut pas).
9. **`additional_constructions`** — Constructions additionnelles : persistées, mais **pas affichées** dans l'admin.
10. **`road_sides`** — Données de voirie (types de routes, entrées) : persistées, absentes de l'affichage admin (les côtés de parcelle dans l'onglet "Général" montrent `parcel_sides` mais pas `road_sides`).
11. **`servitude_data`** — Servitude de passage : persistée, absente de l'affichage admin.
12. **`has_dispute` / `dispute_data`** — Litige foncier : persistés, absents de l'affichage admin.
13. **`building_shapes`** — Tracés de construction (polygones, surfaces, hauteurs) : persistés, absents de l'affichage admin.

## B. Données NON envoyées en DB (perte de données)

14. **`lease_years`** — La durée du bail en années est gérée dans le formulaire (`leaseYears` state) mais n'est **jamais** incluse dans `buildContributionPayload`. La donnée est perdue à la soumission.
15. **`isTitleInCurrentOwnerName`** — Bien qu'il y ait `formData.isTitleInCurrentOwnerName`, le `buildContributionPayload` ne mappe pas ce champ vers la colonne DB `is_title_in_current_owner_name`.
16. **`heightM` des constructions** — La hauteur est stockée dans `buildingShapes[].heightM` qui est envoyé dans le JSONB `building_shapes`, mais l'approbation admin (`handleApprove`) ne propage pas `building_shapes` vers `cadastral_parcels`.
17. **`additional_constructions`** — L'approbation admin ne propage pas non plus `additional_constructions`, `road_sides`, `servitude_data`, `has_dispute`, `dispute_data`, `building_shapes` vers `cadastral_parcels`.

## C. Bugs et incohérences logiques

18. **`calculateCompleteness` admin diverge du formulaire** — L'admin utilise 10 champs fixes (ligne 633-651) pour calculer la complétude, tandis que le formulaire (`calculateCCCValue`) utilise ~30 champs pondérés. Le score admin est significativement différent du score CCC affiché au contributeur.
19. **`ownershipHistory` affichage avec mauvais clés** — L'admin onglet "Historiques" (ligne 1316-1321) lit `owner.ownerName`, `owner.startDate`, etc. (camelCase), mais `buildContributionPayload` convertit en snake_case (`owner_name`, `ownership_start_date`). Résultat : les historiques s'affichent comme "Propriétaire: undefined" pour les contributions soumises via le formulaire normal.
20. **`mortgageHistory` affichage avec mauvais clés** — Même problème : l'admin lit `mortgage.mortgageAmountUsd` (camelCase) mais les données stockées sont en snake_case (`mortgage_amount_usd`).
21. **Statut `returned` absent du filtre admin** — L'onglet des filtres (ligne 917-923) affiche : pending, approved, rejected, suspicious, all. Les contributions "renvoyées pour correction" (`returned`) n'ont **pas** d'onglet dédié et sont noyées dans "Tous".
22. **`resetLocationBlock` ne reset pas `buildingShapes`** — Le bouton reset de l'onglet Localisation (ligne 1474-1494) ne réinitialise pas `buildingShapes` ni `constructionMode`/`additionalConstructions`. Les tracés orphelins persistent.

## D. Redondances

23. **Validation de fichier dupliquée** — `handleFileChange` (lignes 274-296) et `validateAttachmentFile` (lignes 303-314) effectuent exactement les mêmes vérifications (type MIME + taille 10MB). `handleFileChange` devrait simplement appeler `validateAttachmentFile`.
24. **États d'avertissement inutilisés** — `showRequiredFieldsPopover`, `highlightSuperficie`, `showGPSWarning`, `showAreaMismatchWarning`, `areaMismatchMessage`, `shouldBlinkSuperficie`, `showUsageLockedWarning`, `showPermitTypeBlockedWarning`, `permitTypeBlockedMessage` sont déclarés dans le state mais ne sont **jamais exportés** ou sont exportés sans être consommés par aucun composant enfant.
25. **`permitRequest` state résiduel** — L'état `permitRequest` (ligne 131-138) est maintenu mais le mode "request" semble peu utilisé dans les validations actuelles. Beaucoup de champs (`architecturalPlanImages`, `constructionPhotos`, etc.) sont gérés séparément.

## E. Fonctionnalités visuelles absentes

26. **Pas de badge de complétude par onglet** — Les onglets (Infos, Localisation, Passé, Obligations, Envoi) affichent des noms mais pas de badge visuel (check vert, point rouge) indiquant si l'onglet est complet ou contient des erreurs.
27. **Pas de résumé des erreurs en mode brouillon** — Quand l'utilisateur ferme et revient, il n'a aucun indicateur visuel montrant quels onglets restent incomplets.
28. **Pas d'indicateur de progression globale** — Pas de barre de progression montrant l'avancement global du formulaire (ex: "65% complété").
29. **Pas de visualisation du croquis dans l'admin** — L'admin voit les coordonnées GPS en texte mais pas de rendu visuel (SVG ou carte) des tracés de parcelle et construction.

## F. Optimisations

30. **`useCCCFormState.ts` fait 1577 lignes** — Ce hook monolithique gère tout : state, validation, soumission, reset, effets. Il devrait être décomposé en hooks spécialisés (ex: `useCCCValidation`, `useCCCSubmission`, `useCCCConstruction`, `useCCCGeography`).
31. **Auto-save toutes les 1500ms** — L'effet d'auto-save (ligne 1182-1187) déclenche `saveFormDataToStorage` à chaque changement de n'importe quel state. Avec ~20 dépendances dans l'array, cela cause des sauvegardes très fréquentes et potentiellement coûteuses en sérialisation JSON.
32. **`handleApprove` ne propage pas toutes les données** — Quand l'admin approuve une contribution, le code (lignes 315-417) copie manuellement chaque champ vers `cadastral_parcels`. Il manque : `property_category`, `apartment_number`, `floor_number`, `additional_constructions`, `road_sides`, `servitude_data`, `has_dispute`, `dispute_data`, `building_shapes`, `is_title_in_current_owner_name`, `lease_years`.

---

## Plan de corrections prioritaires

### Priorité 1 — Perte de données (critique)

**Fichier** : `src/hooks/useCadastralContribution.tsx` — `buildContributionPayload`
- Ajouter `lease_years: data.leaseYears || null`
- Ajouter `is_title_in_current_owner_name: data.isTitleInCurrentOwnerName ?? null`

**Fichier** : `src/components/admin/AdminCCCContributions.tsx` — `handleApprove`
- Ajouter dans les insert/update de `cadastral_parcels` : `property_category`, `apartment_number`, `floor_number`, `additional_constructions`, `road_sides`, `servitude_data`, `has_dispute`, `dispute_data`, `building_shapes`, `is_title_in_current_owner_name`

### Priorité 2 — Affichage admin incomplet

**Fichier** : `src/components/admin/AdminCCCContributions.tsx`
- Interface `Contribution` : ajouter les champs manquants typés
- Onglet "Général" : afficher `property_category`, `construction_materials`, `standing`, `construction_year`, `apartment_number`, `floor_number`, `house_number`, `is_title_in_current_owner_name`, `additional_constructions`
- Onglet "Localisation" : afficher `road_sides`, `servitude_data`, `building_shapes` (avec rendu visuel via `ParcelSketchSVG`)
- Onglet "Obligations" : afficher `has_dispute`, `dispute_data`
- Onglet "Historiques" : corriger les clés camelCase/snake_case (utiliser un helper `rr()` comme pour les taxes)
- Ajouter un onglet/filtre `returned` dans les TabsList

### Priorité 3 — Nettoyage et UX

**Fichier** : `src/hooks/useCCCFormState.ts`
- `resetLocationBlock` : ajouter `setBuildingShapes([])`
- Supprimer les états d'avertissement inutilisés
- Factoriser `handleFileChange` pour utiliser `validateAttachmentFile`
- Aligner `calculateCompleteness` admin avec `calculateCCCValue` formulaire

### Priorité 4 — UX visuelle

**Fichier** : `src/components/cadastral/CadastralContributionDialog.tsx`
- Ajouter des badges de complétude sur chaque onglet (check vert si `isTabComplete`, point rouge sinon)
- Ajouter une barre de progression globale sous le header

**Impact total** : ~200 lignes modifiées dans 3 fichiers principaux.

