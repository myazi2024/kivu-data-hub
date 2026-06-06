## Objectif

Ajouter un nouvel onglet **« Valeur marchande »** au formulaire CCC, inséré **entre « Obligations » et « Récapitulatif »**, pour collecter :
- la valeur de revente hypothétique de la parcelle,
- la valeur vénale issue d'une expertise immobilière récente (≤ 6 mois) avec pièce jointe,
- pour les biens loués mais dont certains locaux sont **inoccupés**, la mise sur le marché locatif de ces locaux.

L'onglet est accessible une fois les onglets précédents valides (logique `isTabAccessible` existante).

## 1. Structure de l'onglet (`MarketValueTab.tsx`)

### Bloc 1 — Valeur marchande de la parcelle (toujours visible)

**Sous-bloc 1.1 — Valeur de revente hypothétique**
- Question : « Si un acheteur sérieux se présentait aujourd'hui, accepteriez-vous de vendre cette parcelle ? » → Radio cards Oui / Non (`wouldSellIfOffered: boolean`).
- Si **Oui** :
  - Question : « Après négociation, à quel prix raisonnable accepteriez-vous de vendre ? »
  - Sélecteur de devise (USD / CDF) via `useCurrencyConfig` + champ numérique (`resalePriceAmount: number`, `resalePriceCurrency: 'USD'|'CDF'`).
  - Conversion automatique affichée (équivalent dans l'autre devise) et stockage normalisé en USD (`resalePriceUsd`) calculé via `exchangeRate`.

**Sous-bloc 1.2 — Valeur vénale (expertise immobilière)**
- Question : « Une expertise immobilière a-t-elle été réalisée sur cette parcelle au cours des 6 derniers mois ? » → Radio Oui / Non (`hasRecentAppraisal: boolean`).
- Si **Oui** :
  - Date de l'expertise (`appraisalDate`, contrôle ≤ aujourd'hui et ≥ aujourd'hui − 6 mois → warning si hors fenêtre).
  - Nom de l'expert / cabinet (`appraiserName`, optionnel).
  - Valeur vénale retenue : sélecteur devise + montant (`appraisedValueAmount`, `appraisedValueCurrency`), conversion auto → `appraisedValueUsd`.
  - Upload du rapport d'expertise via `StorageFileUpload` (bucket privé `expertise-reports`) :
    - Types acceptés : `application/pdf`, `image/jpeg`, `image/png`.
    - Taille max 10 Mo (via `MAX_FILE_SIZES.document`).
    - Stocké en URL : `appraisalReportUrl`.

### Bloc 2 — Mise sur le marché des locaux non occupés (conditionnel)

**Condition d'affichage** : pour chaque construction où `declaredUsage === 'Location'` ET `isOccupied === false` (i.e. construction louée mais inoccupée), ou — selon la sémantique existante — `rentalConfiguration === 'multi'` avec des locaux non occupés. Implémentation initiale : on lit `formData` + `additionalConstructions`, on filtre celles répondant `declaredUsage='Location'` & `isOccupied=false`.

- **Paragraphe contextuel dynamique** :
  > « Vous avez indiqué dans l'onglet *Infos* que **{N} {bienTerm}** (catégorie / type tels que renseignés) ne sont pas actuellement occupés. Souhaitez-vous les proposer à la location ? »
  - `{bienTerm}` est contextualisé : « appartement(s) », « maison(s) », « local/locaux » selon `propertyCategory` ou `constructionType`.
- **Liste des locaux vacants** (cartes), chacune affichant :
  - Libellé (catégorie + n° + étage si renseigné),
  - Loyer mensuel actuel (USD) si présent dans `rentalUnits`,
  - Capacité d'accueil (`hostingCapacity`),
  - Type de construction, nature, matériaux, standing.
- **Action par carte** :
  - Case à cocher « Mettre sur le marché »,
  - Si cochée : champ optionnel « Loyer cible (USD) » (`targetRentUsd`),
  - Champ optionnel « Disponible à partir du » (`availableFrom: date`).
- Données stockées dans un tableau `marketListings: Array<{ constructionRef, unitLabel, listForRent, targetRentUsd?, availableFrom? }>`.

Si aucun local vacant éligible → bloc 2 masqué et un petit hint indique que tout est déclaré occupé.

## 2. Données & types

Étendre `CadastralContributionData` (dans `src/hooks/useCadastralContribution.tsx`) :

```ts
// Valeur marchande
wouldSellIfOffered?: boolean;
resalePriceAmount?: number;
resalePriceCurrency?: 'USD' | 'CDF';
resalePriceUsd?: number; // normalisé

// Valeur vénale
hasRecentAppraisal?: boolean;
appraisalDate?: string;
appraiserName?: string;
appraisedValueAmount?: number;
appraisedValueCurrency?: 'USD' | 'CDF';
appraisedValueUsd?: number;
appraisalReportUrl?: string;

// Mise sur le marché
marketListings?: Array<{
  constructionRef: string; // 'main' | additionalConstructions[i] id
  unitLabel?: string;
  listForRent: boolean;
  targetRentUsd?: number;
  availableFrom?: string;
}>;
```

`buildContributionPayload` mappe ces champs vers les colonnes SQL (voir §4).

## 3. Validation (`useFormValidation.ts`)

- Bloc 1 :
  - `wouldSellIfOffered` requis (Oui/Non).
  - Si Oui → `resalePriceAmount > 0` + devise.
  - `hasRecentAppraisal` requis. Si Oui → `appraisalDate`, `appraisedValueAmount > 0`, `appraisalReportUrl`.
  - Warning (non bloquant) si `appraisalDate` > 6 mois.
- Bloc 2 (si rendu) : aucune obligation, mais si `listForRent=true` et `targetRentUsd` saisi, vérifier > 0.

Ces règles s'ajoutent dans `validateForSubmission` avec `tab: 'market-value'`, et l'onglet est accessible via `isTabAccessible('market-value')` après `obligations`.

## 4. Backend (migration unique)

Migration ajoutant à `cadastral_contributions` et `cadastral_parcels` :
- `would_sell_if_offered boolean`
- `resale_price_amount numeric`, `resale_price_currency text CHECK (in 'USD','CDF')`, `resale_price_usd numeric`
- `has_recent_appraisal boolean`
- `appraisal_date date`
- `appraiser_name text`
- `appraised_value_amount numeric`, `appraised_value_currency text CHECK`, `appraised_value_usd numeric`
- `appraisal_report_url text`
- `market_listings jsonb DEFAULT '[]'::jsonb`

Trigger CCC → `cadastral_parcels` propage ces colonnes (mêmes noms côté parcelle).

Bucket Storage privé `expertise-reports` (créé via `supabase--storage_create_bucket`) + policies RLS sur `storage.objects` :
- `INSERT` autorisé à l'utilisateur authentifié pour `name LIKE auth.uid()||'/%'`,
- `SELECT` au propriétaire et aux rôles admin (réutiliser `has_role`).

`DRAFT_SAFE_FIELDS` étendu (sauf `appraisalReportUrl` qui n'est pas PII mais reste OK).

## 5. UI/UX & onglet

- Ajouter `TabsTrigger value="market-value"` (libellé « Valeur marchande ») et `TabsContent` correspondant dans `CadastralContributionDialog.tsx`, **entre « Obligations » et « Envoi »**.
- Mettre à jour `isTabAccessible` / la séquence des onglets dans `useCCCFormState.ts` pour inclure `market-value`.
- Réutiliser les composants `Card`, `RadioGroup`, `Input`, `Label`, `CurrencySelector` (ou un composant local minimal), `StorageFileUpload`, classes `rounded-2xl`, `animate-fade-in`.
- Mobile-first (rendu testé à 360 px).

## 6. Récapitulatif & Admin

- `ReviewTab.tsx` : nouvelle section « Valeur marchande » récap (prix de revente, expertise + lien rapport, locaux mis en marché).
- `CCCDetailsDialog.tsx` admin + `types.ts` (Contribution) : ajouter les colonnes pour affichage. Lecture du rapport via URL signée (RPC `get_signed_appraisal_report` calquée sur `get_signed_expertise_certificate`).

## 7. Vérification

- Compilation TS.
- Tests manuels :
  1. Bloc 1 : Non → champs masqués ; Oui → saisie USD ↔ CDF (conversion correcte).
  2. Bloc 1.2 : upload PDF, JPG, refus DOCX, refus > 10 Mo.
  3. Bloc 2 : marquer une construction `Location` + `isOccupied=false`, vérifier la liste et la persistance des `marketListings`.
  4. Soumission : payload contient les nouveaux champs, valeurs visibles dans Admin et Récapitulatif.

## Fichiers (estimés)

- **Création** : `src/components/cadastral/ccc-tabs/MarketValueTab.tsx`, sous-composants `MarketValueResaleBlock.tsx`, `MarketValueAppraisalBlock.tsx`, `VacantUnitsMarketingBlock.tsx`.
- **Édition** :
  - `src/components/cadastral/CadastralContributionDialog.tsx` (onglet + content)
  - `src/hooks/useCCCFormState.ts` (séquence onglets, score complétude, reset)
  - `src/hooks/useCadastralContribution.tsx` (interfaces + payload)
  - `src/hooks/ccc/useFormValidation.ts` (règles)
  - `src/hooks/ccc/useFormPersistence.ts` (DRAFT_SAFE_FIELDS)
  - `src/components/cadastral/ccc-tabs/ReviewTab.tsx`
  - `src/components/admin/ccc/CCCDetailsDialog.tsx` + `types.ts`
- **Migration SQL** + bucket `expertise-reports` + RPC signed URL.
