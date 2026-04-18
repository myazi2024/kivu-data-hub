

## Audit détaillé — Formulaire CCC (CadastralContributionDialog)

### Périmètre audité
`CadastralContributionDialog` (249 l.) + 5 onglets + `useCCCFormState` (1778 l.) + `useCadastralContribution` (726 l.) + `RentalStartDateField`, `AdditionalConstructionBlock`, picklists, validation, persistance localStorage, soumission Supabase.

---

### 1. Architecture — ✅ globalement saine, ⚠ dette croissante

| Fichier | Lignes | Seuil mémoire (1000) | Statut |
|---|---|---|---|
| `useCCCFormState.ts` | **1778** | dépassé 1.78× | ⚠ À modulariser |
| `GeneralTab.tsx` | **1365** | dépassé 1.36× | ⚠ À découper (blocs Title / Owners / Construction / Permits) |
| `LocationTab.tsx` | 815 | OK | ✅ |
| `AdditionalConstructionBlock.tsx` | 767 | OK | ✅ |
| `ReviewTab.tsx` | 752 | OK | ✅ |
| `ObligationsTab.tsx` | 551 | OK | ✅ |

Conséquence : maintenance ralentie, tests difficiles, risque de régressions sur la chaîne IRL/Location/Permis.

---

### 2. Logique métier — bugs et incohérences

#### B1. ❌ Auto-purge `rentalStartDate` cassée après inversion de règle
- `GeneralTab.tsx` L1088-1090 et `AdditionalConstructionBlock.tsx` L405-407 :
  - Code actuel : `if (new Date(rentalStartDate) > new Date(y, 11, 31)) purge`.
  - Or la règle en vigueur est `rentalStartDate ≥ 01/01/constructionYear`.
  - Conséquence : si l'utilisateur saisit 2020 puis change l'année de construction à 2024, la date 2020 reste en place alors qu'elle devient invalide → soumission bloquée plus tard sans feedback immédiat.
- **Correctif** : remplacer par `if (new Date(rentalStartDate) < new Date(y, 0, 1)) purge`.

#### B2. ⚠ Picklist IRL : double source de vérité
- `ObligationsTab.tsx` L174 lit `formData.declaredUsage` + `formData.additionalConstructions` directement.
- Mais `additionalConstructions` est un **state séparé** dans `useCCCFormState`, injecté indirectement via le hook (rebalancé sur `formData`).
- Risque : si `formData.additionalConstructions` n'est pas systématiquement synchronisé avec le state principal, le picklist IRL peut ne pas apparaître.
- **Correctif** : injecter `additionalConstructions` en prop dédiée à `ObligationsTab` (comme dans `ReviewTab`).

#### B3. ⚠ Détection « Précaire » incohérente
- L707-708 : exclusion `'Construction précaire'` (libellé long) — mais le picklist normalisé renvoie `'Précaire'` (cf. `constructionNatureNormalizer.ts`).
- Conséquence : matériaux/standing requis même pour Précaire.
- **Correctif** : utiliser `normalizeConstructionNature()` puis comparer à `'Précaire'`.

#### B4. ⚠ `existingConstructions` (additional) : `additionalConstructions` non typé en `formData`
- `ObligationsTab` cast `formData.additionalConstructions as any[]` mais `CadastralContributionData` ne le déclare pas.
- Risque TS faible, mais zone d'ombre.

---

### 3. Erreur runtime active

#### B5. ❌ `Cannot set properties of undefined (setting '_leaflet_pos')`
- Stack : `ParcelMapPreview` → `setView` sur instance Leaflet démontée.
- Symptôme classique : `setView` appelé après unmount du dialog ou avant que le container ait des dimensions (tab Localisation pas encore monté).
- **Correctif** : protéger l'appel par `if (mapRef.current && mapRef.current._loaded)` + dépendre de `tabActive === 'location'` pour éviter init prématurée.

---

### 4. Validation & sécurité

| Item | État | Constat |
|---|---|---|
| Validation client Zod | ❌ | Aucun schéma Zod sur `CadastralContributionData`. Validation manuelle dispersée dans `getMissingFields` (>200 l.). |
| Validation serveur (Edge / RLS) | ✅ | `useCadastralContribution` insère via Supabase + détection anti-fraude SQL. |
| Encodage URL (WhatsApp) | ✅ | `WhatsAppFloatingButton` encode déjà. |
| Fichiers : `crypto.randomUUID()` | ✅ | Conforme à la mémoire projet. |
| PII (propriétaires) | ✅ | Stockés sous RLS. |
| `localStorage` brouillon | ⚠ | `STORAGE_KEY = cadastral_contribution_${parcelNumber}` — pas de chiffrement, contient PII (noms/RC). À surveiller (pas bloquant tant que `ConsentAwareStorage` est utilisé). |

---

### 5. UX & cohérence cross-onglets

| Item | État | Constat |
|---|---|---|
| Sync `Location` → IRL picklist | ✅ | OK depuis dernier correctif (au moins 1 construction Location). |
| Sync `Location` → sélecteur « Construction concernée » | ✅ | `buildRentalConstructionRefs` partagé. |
| Auto-purge IRL si plus de Location | ✅ | L1233-1247 du hook. |
| Auto-purge `rentalStartDate` si année change | ❌ | Voir B1. |
| Bilan IRL dans Review | ✅ | Détaillé par construction. |
| Tab unlock progressive | ✅ | `isTabAccessible`. |
| Brouillon localStorage | ✅ | Restauration OK. |
| Confettis succès | ✅ | Lazy-loadé. |
| Affichage `rental_start_date` dans fiche cadastrale | ✅ | `ConstructionSection`. |

---

### 6. Persistance — couverture champs

- `cadastral_contributions` : 44 champs ✅ + `rental_start_date` ajouté.
- `additional_constructions` JSONB : `rentalStartDate` rétrocompatible ✅ ; `tax_history` JSONB : `constructionRef` ajouté ✅ + fallback `'main'` pour anciens IRL ✅.
- ⚠ Les fiches existantes avec plusieurs IRL antérieurs au correctif peuvent toutes pointer vers `'main'` → potentiel doublon orphelin. Migration douce non bloquante.

---

### 7. Plan de correctifs priorisés

| # | Sévérité | Action |
|---|---|---|
| **C1** | 🔴 Haute | Inverser la condition d'auto-purge `rentalStartDate` (`< 01/01/y` au lieu de `> 31/12/y`) dans `GeneralTab` + `AdditionalConstructionBlock`. |
| **C2** | 🔴 Haute | Patcher l'erreur Leaflet `_leaflet_pos` dans `ParcelMapPreview` (guard `_loaded`, dépendance tab actif). |
| **C3** | 🟠 Moyenne | Passer `additionalConstructions` en prop explicite à `ObligationsTab` pour fiabiliser le picklist IRL. |
| **C4** | 🟠 Moyenne | Normaliser la nature `Précaire` dans la validation matériaux/standing. |
| **C5** | 🟡 Basse | Introduire un schéma Zod (au moins pour les champs critiques de la soumission). |
| **C6** | 🟡 Dette | Modulariser `useCCCFormState.ts` (sous-hooks par domaine : owners, taxes, permits, geometry) et découper `GeneralTab`. |

---

### 8. Validation E2E recommandée après correctifs

- Saisir construction principale `Location` + `rentalStartDate = 2018`, puis changer `constructionYear` à 2020 → la date doit être effacée et le datepicker se réouvrir vide.
- Ouvrir l'onglet Localisation deux fois de suite → plus aucune erreur Leaflet.
- Ajouter 2 constructions Location → IRL apparaît, sélecteur propose les 3 refs (main + 2 additional), bloque les doublons.
- Repasser une construction additionnelle en `Habitation` → IRL associé purgé automatiquement avec toast.
- Soumettre avec 2 IRL alignés → succès. Avec 1 IRL manquant → blocage + message ciblé dans Review.

