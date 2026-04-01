# Modules Fonctionnels

## 1. Cadastre (recherche et contributions)

**Composants** : `CadastralSearchBar`, `CadastralResultsDialog`, `CadastralResultCard`, `CadastralContributionDialog`

**Hooks** : `useCadastralSearch`, `useAdvancedCadastralSearch`, `useCadastralContribution`

**Workflow contribution** :
1. L'utilisateur recherche une parcelle ou contribue une nouvelle
2. Remplit le formulaire (localisation, propriétaire, construction, GPS, côtés parcelle…)
3. La contribution est soumise avec statut `pending`
4. Un admin valide/rejette depuis `AdminCCCContributions`
5. Si approuvée → données fusionnées dans `cadastral_parcels`, code CCC généré

**Données** : `cadastral_parcels` (70+ colonnes), `cadastral_contributions` (80+ colonnes)

---

## 2. Titres Fonciers

**Composant** : `LandTitleRequestDialog` (formulaire multi-étapes)

**Hook** : `useLandTitleRequest`, `useLandTitleDynamicFees`

**Workflow** :
1. Choix province, type (urbain/rural)
2. Localisation détaillée (ville/commune/quartier ou territoire/collectivité/village)
3. Informations demandeur + propriétaire (si différent)
4. Pièces jointes (carte d'identité, preuve de propriété, procuration)
5. Calcul des frais dynamiques selon type de titre et superficie
6. Paiement → statut passe de `pending` à `in_review`

**Frais** : configurés dans `land_title_fees_by_type` (par type de titre, zone urbaine/rurale, tranches de superficie)

---

## 3. Mutations Foncières

**Composant** : `MutationRequestDialog`

**Hook** : `useMutationRequest`

**Types** : mutation_type (vente, donation, succession, échange…)

**Colonnes financières** : `market_value_usd`, `mutation_fee_amount`, `bank_fee_amount`, `late_fee_amount`, `late_fee_days`

**Constantes** : `LATE_FEE_CAP_USD = 500`, `DAILY_LATE_FEE_USD = 0.45`, `LEGAL_GRACE_PERIOD_DAYS = 20`

---

## 4. Hypothèques

**Composants** : `MortgageFormDialog`, `MortgageManagementDialog`, `MortgageCancellationDialog`, `MortgageFlowContainer`

**Hooks** : `useMortgageDraft`, `useMortgageFees`

**Tables** : `cadastral_mortgages`, `cadastral_mortgage_payments`

**Workflow** : enregistrement → suivi des paiements → mainlevée (avec frais et paiement)

---

## 5. Permis de Bâtir

**Composants** : `BuildingPermitRequestDialog` (multi-étapes), `BuildingPermitManagementDialog`

**Hook** : `usePermitPayment`

**Workflow** : formulaire → pièces jointes → calcul frais → paiement → suivi admin

---

## 6. Lotissement (Subdivision)

**Composant** : `SubdivisionRequestDialog`

**Dossier** : `src/components/cadastral/subdivision/` (25+ fichiers de types et composants)

**Table** : `subdivision_requests`

---

## 7. Expertise Immobilière

**Composant** : `RealEstateExpertiseRequestDialog`

**Hook** : `useRealEstateExpertise`

**Table** : `real_estate_expertise_requests` (33 colonnes techniques : matériaux, équipements, environnement sonore, permis de construire…)

**Workflow** : demande → paiement → assignation expert → rapport → certificat PDF

**Frais** : configurés dans `expertise_fees_config`

---

## 8. Litiges Fonciers

**Composants** : `LandDisputeReportForm`, `LandDisputeManagementDialog`, `LandDisputeLiftingForm`

**Table** : `cadastral_land_disputes`

**Workflow** : signalement → instruction → résolution/levée

---

## 9. Fiscalité

**Composants** : `IRLCalculator`, `BuildingTaxCalculator`, `PropertyTaxCalculator`, `TaxFormDialog`

**Hook** : `usePropertyTaxCalculator`

**Table** : `cadastral_tax_history`

---

## 10. Codes CCC (Certificat Contributeur Cadastral)

**Composants** : `ContributorCodesPanel`, `CCCIntroDialog`, onglets `ccc-tabs/`

**Table** : `cadastral_contributor_codes`

**Workflow** : contribution approuvée → code CCC généré automatiquement → valeur en USD → utilisable comme réduction sur les services → validé par préfixe et expiration

---

## 11. Publications (Kiosque)

**Composants** : `cart/CartButton`, `cart/CartPanel`, composants publications

**Hooks** : `useCart`, `usePublications`

**Tables** : `publications`, `orders`, `publication_downloads`

---

## 12. Certificats

**Types** : `expertise_immobiliere`, `titre_foncier`, `permis_construire`, `mutation_fonciere`, `lotissement`

**Table** : `certificate_templates` (modèles personnalisables), `generated_certificates`

**Génération** : PDF via jsPDF avec QR code, tampon, signature configurables
