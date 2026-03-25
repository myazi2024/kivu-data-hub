

# Audit du service "Taxes foncieres" — Divergences et optimisations

## Problemes identifies

### 1. PAS DE PANNEAU ADMIN DEDIE POUR LES DECLARATIONS FISCALES (majeur)

Les trois services fiscaux (Impot foncier, Taxe de batisse, IRL) soumettent des declarations dans `cadastral_contributions` avec `contribution_type = 'update'` et un champ `tax_history` JSON. Mais il n'existe **aucun panneau admin dedie** pour visualiser, valider ou rejeter ces declarations.

- `AdminTaxHistory.tsx` lit depuis `cadastral_tax_history` — une table differente qui n'est alimentee que lors de l'approbation CCC (pas depuis les services fiscaux).
- `AdminCCCContributions.tsx` affiche les contributions CCC (type `new`) mais pas les declarations fiscales (type `update`).

**Consequence** : Les declarations fiscales soumises via les services restent indefiniment en statut `pending` sans qu'aucun admin ne puisse les traiter.

**Correction** : Creer un composant `AdminTaxDeclarations.tsx` qui liste les contributions de type `update` ayant un `tax_history` non-null, avec filtres par type de taxe, annee, statut, et actions Approuver/Rejeter/Renvoyer. Lors de l'approbation, inserer dans `cadastral_tax_history`.

### 2. DESALIGNEMENT CLES JSON CCC vs SERVICE (bug)

Le CCC stocke les taxes en **camelCase** (`taxYear`, `amountUsd`, `paymentStatus`). Les services fiscaux stockent en **snake_case** (`tax_year`, `amount_usd`, `payment_status`). L'admin CCC (L1350) lit en camelCase. L'approbation CCC (L476) lit en snake_case.

| Source | Cle annee | Cle montant | Cle statut |
|--------|-----------|-------------|------------|
| CCC form | `taxYear` | `amountUsd` | `paymentStatus` |
| Service fiscal | `tax_year` | `amount_usd` | `payment_status` |
| Admin CCC display | `taxYear` | `amountUsd` | `paymentStatus` |
| Admin CCC approval | `tax_year` | `amount_usd` | `payment_status` |

L'approbation CCC echoue silencieusement car elle lit `tax_year` alors que le CCC stocke `taxYear` — les champs inseres dans `cadastral_tax_history` sont donc `null`.

**Correction** : Ajouter un helper de compatibilite dans l'approbation CCC qui resout les deux formats. Standardiser sur snake_case pour les nouvelles soumissions.

### 3. VERIFICATION DE DOUBLON N'EXCLUT PAS LE STATUT `returned`

`checkDuplicateTaxSubmission` (L95) filtre `.neq('status', 'rejected')` mais ne prend pas en compte le statut `returned`. Si une declaration a ete renvoyee pour correction, l'utilisateur ne peut pas la re-soumettre car le doublon est detecte.

**Correction** : Ajouter `.neq('status', 'returned')` ou filtrer avec `.in('status', ['pending', 'approved'])`.

### 4. PAS D'ONGLET ANALYTICS DEDIE AUX TAXES

Les graphiques fiscaux (`taxes`, `taxes-year`, `taxes-amount`) sont integres dans l'onglet `parcels-titled`. Il n'y a pas d'onglet `taxes` dedie dans `ANALYTICS_TABS_REGISTRY`, contrairement aux mutations, hypotheques et autorisations.

**Correction** : Creer un onglet `taxes` avec graphiques : repartition par type de taxe, montants par exercice, taux de penalite, repartition zone fiscale, conformite par province.

### 5. REDONDANCE CCC : DONNEES FISCALES NON PRE-REMPLIES

Le CCC collecte l'historique fiscal (type, annee, montant, statut paiement, date, recu). Quand l'utilisateur ouvre ensuite un calculateur fiscal sur la meme parcelle, aucune de ces donnees n'est exploitee — ni pour pre-remplir l'exercice fiscal deja couvert, ni pour avertir qu'une annee est deja declaree via CCC.

**Correction** : Dans les 3 calculateurs, verifier si une contribution CCC existe avec des `tax_history` pour la meme parcelle et les memes annees, et afficher un avertissement.

### 6. PROPRIETAIRE ACTUEL NON AFFICHE DANS LE RECAPITULATIF

`PropertyTaxSummaryStep` n'affiche pas le nom du proprietaire (`ownerName`). Le nom est collecte dans le formulaire mais absent de la fiche de declaration soumise.

**Correction** : Ajouter `ownerName` dans le recapitulatif et dans le payload JSON.

### 7. AUCUNE DONNEE FICTIVE DETECTEE

Les taux sont charges depuis `property_tax_rates_config` (DB) avec fallback code. Les taux de batisse viennent de `cadastral_contribution_config`. L'IRL utilise 22% (legislation DRC). Pas de donnees simulees.

---

## Plan d'implementation

### Etape 1 — Creer le panneau admin des declarations fiscales
Creer `AdminTaxDeclarations.tsx` : liste les `cadastral_contributions` de type `update` avec `tax_history` non-null. Afficher type de taxe, exercice, montant, parcelle, statut. Actions : Approuver (insere dans `cadastral_tax_history`), Rejeter, Renvoyer. Filtres par type de taxe, annee, statut. Export CSV.

### Etape 2 — Corriger le desalignement camelCase/snake_case
Dans `AdminCCCContributions.tsx` L474-480, ajouter un helper de resolution qui accepte les deux formats (`taxYear` || `tax_year`). Meme correction pour l'affichage L1350-1354.

### Etape 3 — Corriger la verification de doublons
Modifier `checkDuplicateTaxSubmission` pour exclure aussi le statut `returned`.

### Etape 4 — Ajouter le proprietaire dans le recapitulatif
Passer `ownerName` a `PropertyTaxSummaryStep` et l'afficher. Inclure dans le payload de soumission.

### Etape 5 — Creer l'onglet analytics dedie
Ajouter un bloc `taxes` dans `ANALYTICS_TABS_REGISTRY` avec graphiques : type de taxe, exercice fiscal, zone fiscale, penalites, conformite.

### Etape 6 — Integrer le panneau dans la sidebar admin
Ajouter l'entree dans le menu admin et le routage.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/components/admin/AdminTaxDeclarations.tsx` | **Nouveau** — panneau admin |
| `src/components/admin/AdminCCCContributions.tsx` | Fix camelCase/snake_case |
| `src/components/cadastral/tax-calculator/taxSharedUtils.ts` | Fix doublon `returned` |
| `src/components/cadastral/tax-calculator/PropertyTaxSummaryStep.tsx` | Afficher proprietaire |
| `src/components/cadastral/PropertyTaxCalculator.tsx` | Passer ownerName au summary |
| `src/hooks/useAnalyticsChartsConfig.ts` | Onglet analytics `taxes` |
| Sidebar/routing admin | Ajouter entree menu |

6-7 fichiers modifies + 1 nouveau, aucune migration DB.

