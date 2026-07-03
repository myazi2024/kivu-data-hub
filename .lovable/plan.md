
## Audit onglet « Valeur marchande » (CCC) — bugs, dépendances, robustesse

Périmètre lu : `MarketValueTab.tsx` (1152 l.), `useFormValidation.ts` (bloc market-value), `useCadastralContribution.tsx` (types + payload).

### Bugs identifiés

**Critiques (corriger)**
1. **Devise du loyer non recalculée** — Dans un local proposé à la location, changer la devise (USD/CDF) après avoir saisi le montant ne recalcule pas `targetRentUsd`. Résultat : valeur USD persistée fausse (impact IRL, statistiques admin).
2. **Devises de revente/expertise dépendantes d'un `cdfRate` figé** — `toUsd` capture `cdfRate` au premier rendu ; si la config change (rechargement `useCurrencyConfig`) les USD stockés ne se mettent pas à jour.
3. **`useMemo` de `vacantTargets` dépend de `formData` entier** — recalcul à chaque frappe (perf mobile), rerender de la grille complète.
4. **Photos orphelines** — Ajout d'image → URL stockée en state ; suppression = seulement filtrée localement, le fichier reste dans le bucket `cadastral-documents/market-listings|sale-listings|appraisal-reports`. Abandon du formulaire = orphelins garantis.
5. **Données mortes des locaux décochés** — Décocher `listForRent` conserve loyer, images, description, contact dans `marketListings`. Persistés en DB et exposés côté admin.
6. **Validation `saleListing` incomplète côté hook** — `useFormValidation` vérifie modalités/dispo mais pas la longueur description (> 500) ni la cohérence devise/montant. Le blocage est uniquement dans le bouton « Suivant » via toast (contournable en cliquant l'onglet suivant).
7. **`appraisalDate` hors fenêtre 6 mois** — Signalée en warning visuel mais acceptée par la validation, contredisant la question « expertise réalisée au cours des 6 derniers mois ».
8. **`saleListing` non purgé si `wouldSell === false`** — L'utilisateur bascule Oui → renseigne annonce → repasse Non. `setWouldSell(false)` nettoie prix mais laisse `formData.saleListing` intact (persisté en DB via la sérialisation conditionnelle mais gardé en state, réapparaît si Oui recliqué).

**Importants**
9. **Deduplication images absente** — même URL peut être ajoutée deux fois (résilience côté état).
10. **`equivalent()` incohérent** — USD→CDF utilise `convertFromUsd`, CDF→USD utilise `amount/cdfRate` en direct (2 chemins pour la même conversion).
11. **Fallback `constructionYear`** — pour une construction additionnelle sans année, le code prend `formData.constructionYear` (année principale). Faux positif « année héritée ».
12. **`subjectLabel`** basé sur le premier `vacantTargets[0].subject` ; hétérogène si plusieurs catégories.
13. **Absence de min sur `availableFrom`** — date passée acceptée.
14. **Contact WhatsApp non pré-rempli** avec `formData.whatsappNumber` déjà saisi.
15. **`handleNextTab` UX** — le clic « Suivant » n'ouvre pas l'onglet incomplet, se contente d'un toast.
16. **Duplication de code** — bloc images vente ≈ bloc images location (270 lignes identiques). Sortir un composant `ListingImagesUploader`.

**Mineurs**
17. **Aria** — boutons Oui/Non sans `aria-pressed`, non-signalés aux SR.
18. **`showBlock2`** truthy même sans construction additionnelle en location si la seule construction est occupée → affiche systématiquement l'encart « aucun local vacant ».
19. **Analytics** — aucun event tracké (checkbox `listForRent`, upload photo, `wouldSell` toggle).
20. **Modularisation** — 1152 lignes dans un seul composant, IIFE imbriquées difficilement testables.

### Fonctionnalités absentes pertinentes pour la valeur d'annonce

- **Surface habitable** par local (m²) — actuellement seul `area_sqm` global.
- **Nombre de pièces / chambres / salles d'eau** par local (attendu sur toute annonce immobilière).
- **Équipements clés** : parking, meubles, climatisation, eau/électricité réseau ou groupe, connexion internet, ascenseur.
- **État du bien** (neuf, rénové, à rénover).
- **Frais d'agence / commission** attendu.
- **Publication multi-canal opt-in** (partenaires) — case à cocher pour autoriser la diffusion.
- **Consentement explicite RGPD/PII** pour l'affichage public du numéro/email.

Ces ajouts ne font PAS partie des correctifs proposés ci-dessous — je les liste pour arbitrage.

---

## Correctifs proposés (Phase build)

**Objectif : corriger les 8 bugs critiques + 3 importants (contact WhatsApp, dédup, coherence conversion) sans étendre le périmètre fonctionnel.**

### C1 — Recalcul devise loyer (bug #1)
Extraire un helper local `updateListingWithRent(t, rawAmount, rawCurrency)` qui recalcule systématiquement `targetRentUsd = toUsd(amount, currency)`. Le Select de devise appelle ce helper avec le montant existant.

### C2 — `cdfRate` réactif (bug #2)
Ajouter un `useEffect` qui, quand `cdfRate` change, recalcule `resalePriceUsd`, `appraisedValueUsd`, et pour chaque `marketListing` `targetRentUsd` à partir des couples (amount, currency) stockés.

### C3 — Dépendances `useMemo` (bug #3)
Remplacer `[formData, additionalConstructions]` par les seules propriétés utilisées : `formData.declaredUsage`, `.propertyCategory`, `.constructionType`, `.constructionNature`, `.constructionMaterials`, `.standing`, `.isOccupied`, `.hostingCapacity`, `.rentalConfiguration`, `.monthlyRentUsd`, `.rentalUnits`, `.constructionYear`, `.soundEnvironment`, `additionalConstructions`.

### C4 — Rollback / suivi des uploads (bug #4)
Utiliser le tracker `useFormPersistence.trackUploadedFile` déjà en place : à chaque upload dans MarketValueTab, `trackUploadedFile(url)`. Suppression locale d'une image = `untrackUploadedFile(url)` + best-effort `supabase.storage.remove([path])`. Rollback global déjà branché dans le `catch` de submit.

### C5 — Purge données locaux décochés (bug #5)
Quand `listForRent` passe à `false`, écraser l'entrée en `{ constructionRef, unitLabel, listForRent: false }` (jeter loyer, images, description, contact, images tracked → rollback storage). Éviter la persistance de données mortes.

### C6 — Validation hook `saleListing` durcie (bug #6)
Ajouter dans `useFormValidation.ts` (bloc `market-value`, `formData.wouldSellIfOffered === true`) :
- `sale.description.length <= 500`
- `sale.coverImageUrls.length >= 1`
- Cohérence `(resalePriceAmount, resalePriceCurrency)` couple.
- Contact : si `sale.contactChannel === 'email'`, contactValue matche `/.+@.+\..+/` ; sinon `/^\+?\d[\d\s\-]{6,}$/`. Optionnel donc validé seulement si renseigné.

### C7 — Fenêtre expertise (bug #7)
Quand `appraisalDate < MIN_DATE`, la validation reclasse : afficher un blocage explicite (`missing`) invitant à décocher « expertise récente » ou à corriger la date. Empêche l'incohérence sémantique.

### C8 — Purge `saleListing` si Non (bug #8)
Dans `setWouldSell(false)`, ajouter `handleInputChange('saleListing', undefined)` + rollback des images sale via tracker (C4).

### C9 — Dédup images
Dans le handler d'ajout, `if (images.includes(url)) return;` + toast d'info.

### C10 — Conversion unifiée
`equivalent()` réécrit avec `convertFromUsd(...)` dans les deux sens (déjà exposé par `useCurrencyConfig`).

### C11 — WhatsApp pré-rempli
Si `formData.whatsappNumber` existe et l'utilisateur choisit `contactChannel='whatsapp'` sans `contactValue`, pré-remplir la coordonnée.

### Fichiers touchés
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` — helpers, effet cdfRate, purge, dédup, tracker.
- `src/hooks/ccc/useFormValidation.ts` — bloc `market-value` étendu.
- `src/hooks/useCCCFormState.ts` — exposer `trackUploadedFile` / `untrackUploadedFile` au tab si pas déjà propagé.
- `src/components/cadastral/CadastralContributionDialog.tsx` — propagation des trackers vers `MarketValueTab`.

### Hors périmètre (à valider séparément)
- Ajout des champs annonce enrichis (surface, pièces, équipements, état, consentement PII).
- Modularisation en sous-composants (`SaleListingBlock`, `RentalListingCard`, `ListingImagesUploader`).
- Aria-pressed, tracking analytics, min date `availableFrom`.
