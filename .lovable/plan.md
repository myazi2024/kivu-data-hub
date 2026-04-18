
# Audit détaillé du formulaire CCC

## 1. Périmètre audité
- `CadastralContributionDialog.tsx` (250 l) — shell + 5 onglets
- `useCCCFormState.ts` (**1 785 l**) — state, validations, persistance, calculs
- `useCadastralContribution.tsx` (726 l) — submit/update/anti-fraude
- `useCCCFormPicklists.tsx` (208 l) — picklists DB + fallbacks
- 5 onglets : Infos (1366 l), Localisation (815 l), Passé (287 l), Obligations (557 l), Envoi (752 l)
- `ParcelMapPreview.tsx` (**2 918 l**), `AdditionalConstructionBlock.tsx` (768 l)
- Table `cadastral_contributions` : **80 colonnes** ; état actuel : 2 808 `pending`, 702 `rejected`, **0 `approved`**

---

## 2. Forces du système
- Architecture modulaire respectée : `useCCCFormState` centralise la logique métier, `CadastralContributionDialog` reste fin (250 l).
- Validation à 3 niveaux : `getMissingFieldsForTab` (navigation), `getMissingFields` (soumission), `validateContributionData` (côté hook), anti-fraude RPC `detect_suspicious_contribution`.
- Picklists hybrides DB + fallback (`useCCCFormPicklists`) — robuste hors-ligne.
- `crypto.randomUUID()` utilisé pour les uploads (conforme à la mémoire projet).
- Auto-save localStorage debounced (1 500 ms), restauration post-auth via `auth_redirect_url`.
- Conversion camelCase→snake_case centralisée dans `buildContributionPayload`.
- Sanctions : invalidation par RPC, fraud_attempts log, blocage si score ≥ 80.
- Cohérence stricte IRL × constructions Location (1:1 avec détection orphelins/doublons).

---

## 3. Problèmes critiques (bloquants ou risques data)

### 3.1 — `useCCCFormState.ts` à 1 785 lignes
Viole la règle projet « dialogues > 1000 lignes doivent être modularisés ». Effets de bord : retests manuels obligatoires à chaque modif, useEffect chains difficiles à raisonner (8 cascades géographiques + 5 cascades construction).

### 3.2 — Aucune contribution approuvée en 3 510 soumissions
702 rejets vs 0 approbations : symptôme d'un problème workflow admin (pas du formulaire lui-même), mais à signaler. Le trigger `generate_ccc_code_on_approval` n'a jamais déclenché → **le système de codes CCC n'a jamais été testé en production réelle**.

### 3.3 — `loadFormDataFromStorage` non défensif
- Aucun TTL : un brouillon vieux de 6 mois est restauré avec un toast « Données restaurées » qui peut perturber.
- Aucun versionning de schéma : un changement de structure (`additional_constructions`, `buildingShapes`) restauré depuis un ancien storage peut produire un état incohérent.
- Pas de purge du `STORAGE_KEY` lors d'un schema mismatch.

### 3.4 — Race condition possible sur double-submit
`handleSubmit` vérifie `existingContribs` puis insère, sans verrou DB. Deux clics rapides peuvent créer 2 contributions `pending` (la contrainte unique côté DB n'a pas été vue dans le schéma).

### 3.5 — `useEffect [currentOwners]` (l. 1411) sans guard d'égalité
Synchronise `previousOwners[last].endDate ← currentOwners[0].since` à chaque changement de n'importe quel champ d'un owner courant (frappe sur `firstName` re-déclenche l'effet). Risque de boucle si l'utilisateur édite manuellement endDate puis re-tape sur un current owner.

### 3.6 — `handleSubmit` : upload sans rollback
Si l'upload tax_receipt #3 échoue, les uploads tax_receipt #1 et #2 sont déjà dans le bucket `cadastral-documents` mais aucune contribution n'est créée → fichiers orphelins. Pas de cleanup.

### 3.7 — Validation des fichiers : MIME-type côté client uniquement
`validateAttachmentFile` lit `file.type` (modifiable). Pas de magic-number check, pas de validation côté Edge Function. Risque limité (bucket privé) mais à durcir.

### 3.8 — Re-évaluation O(n²) de `getMissingFields`
Appelé à chaque render via `isFormValidForSubmission`, `isTabComplete`, `isTabAccessible`. Avec 5 onglets et plusieurs CTA, peut être recalculé > 20×/render. Aucun memoization sur le résultat.

---

## 4. Problèmes importants (UX / cohérence)

| # | Problème | Localisation |
|---|----------|--------------|
| 4.1 | `setTimeout(handleSubmit, 1000)` post-auth (CadastralContributionDialog l. 227) — fragile, dépend du temps de propagation `useAuth` | dialog |
| 4.2 | `loadFormDataFromStorage` ne restaure pas `formData.isOccupied` correctement si valeur `false` (`if (parsed.isOccupied !== undefined)` OK, mais le `setFormData` écrase d'autres champs) | useCCCFormState l. 271 |
| 4.3 | Calcul de superficie côté front (l. 1413-1450) — viole la règle « server-side > frontend estimates » | useCCCFormState |
| 4.4 | `Math.random()` dans `triggerConfetti` (acceptable pour anim, mais ailleurs vérifier) | l. 1021 |
| 4.5 | `boundary_history` dans `CadastralContributionData` mais aucun champ UI ne le remplit | useCadastralContribution l. 116 |
| 4.6 | Pas de feedback visuel pendant `uploadFile` séquentiel (boucle for sur titleDocFiles) — l'utilisateur ne voit qu'un loader global | l. 1069 |
| 4.7 | `handleClose` ne vide pas tous les états (e.g. `permitRequest`, `disputeFormData`) — une réouverture sur une autre parcelle peut hériter | l. 1172+ |
| 4.8 | Picklist `picklist_declared_usage` dépend de `${type}_${nature}` mais `Location` est injecté hors picklist via `LOCATION_ELIGIBLE_KEYS` hardcodé → admin ne peut pas désactiver Location pour Industrielle_Durable | constructionUsageResolver.ts |
| 4.9 | `parcelSides` initialisés à 4 côtés (Nord/Sud/Est/Ouest) même si la parcelle réelle a 3 côtés → utilisateur doit supprimer manuellement | l. 166 |
| 4.10 | `getMissingFields` ne valide pas la cohérence entre `gpsCoordinates.length` et `parcelSides.length` — un utilisateur peut soumettre 4 côtés et 2 GPS | l. 641-892 |

---

## 5. Risques sécurité

- **5.1** — `validateContributionData` côté client uniquement. RLS protège l'insert mais aucune Edge Function ne re-valide les structures JSONB (`current_owners_details`, `gps_coordinates`). Un client malveillant peut injecter des champs arbitraires dans les JSONB.
- **5.2** — Le bucket `cadastral-documents` doit être confirmé privé (mémoire projet le mentionne, mais pas vérifié dans cet audit).
- **5.3** — `whatsapp_number` non validé (format E.164 ?) — risque XSS limité si re-rendu sans escape.
- **5.4** — `permit_request_data` et `dispute_data` stockés en JSONB sans schéma Zod — toute structure est acceptée.

---

## 6. Dette technique mesurée

- 31 occurrences de `as any` / `@ts-ignore` dans la chaîne CCC
- 18 `console.log/warn/error` (dont certains en prod path)
- Aucune contribution approuvée → **trigger `generate_ccc_code_on_approval` jamais éprouvé**
- `useCCCFormState.ts` : 35+ useState (devrait être réduit via `useReducer`)

---

## 7. Recommandations priorisées

### Priorité 1 — Bloquants
1. Ajouter une **contrainte unique partielle** côté DB sur `(user_id, parcel_number)` WHERE `status IN ('pending','returned')` pour bloquer les doubles soumissions.
2. Implémenter un **rollback / cleanup** des fichiers uploadés si l'insert final échoue.
3. Ajouter **TTL et versioning** sur `loadFormDataFromStorage` (ex : ignorer si > 30 jours, comparer schemaVersion).
4. Faire valider les contributions par un **Edge Function** (Zod schema sur tous les JSONB).

### Priorité 2 — Stabilité
5. Mémoïser `getMissingFields` via `useMemo` avec deps explicites.
6. Modulariser `useCCCFormState.ts` : extraire `useGeographicCascade`, `useConstructionCascade`, `useFormPersistence`, `useFormValidation`.
7. Remplacer le `setTimeout(handleSubmit, 1000)` post-auth par un `useEffect` réactif sur `user`.
8. Diagnostiquer pourquoi 0 approuvée / 702 rejetées (audit workflow admin séparé).

### Priorité 3 — UX
9. Ne pas pré-remplir 4 côtés ; commencer à 3 + bouton « + côté ».
10. Cohérence GPS ↔ côtés : auto-ajuster ou bloquer la soumission si mismatch.
11. Loader par fichier pendant les uploads séquentiels.
12. Picklist `Location` éligibilité : gérer en DB plutôt qu'en code.

### Priorité 4 — Sécurité
13. Validation magic-number des fichiers (Edge Function).
14. Schéma Zod pour `permit_request_data`, `dispute_data`, `current_owners_details`.
15. Format E.164 obligatoire sur `whatsapp_number`.

---

## 8. Plan d'action pragmatique (ce que je peux implémenter ensuite)

Je propose 3 lots indépendants à valider :

**Lot A — Hardening soumission (P1)** : contrainte unique DB + rollback uploads + TTL/versioning storage. ~3 modifs DB + 2 modifs hook.

**Lot B — Modularisation `useCCCFormState`** (P2) : split en 4 sous-hooks. ~6 nouveaux fichiers, zéro changement comportement.

**Lot C — Diagnostic workflow approbation** (P1) : audit séparé de `AdminCCCContributions.tsx` + trigger `generate_ccc_code_on_approval` pour comprendre pourquoi 0 approbation. Probablement hors périmètre formulaire.

Confirmez quel(s) lot(s) lancer (ou un sous-ensemble) et je passe en mode implémentation.
