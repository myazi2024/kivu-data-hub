

## Audit complet — Formulaire CCC (post-corrections IRL)

### 1. Erreurs runtime actives 🔴

#### B1. `Map container is already initialized.` + `Cannot read properties of undefined (reading 'appendChild')`
Stack : `ParcelMapPreview.tsx:356` → `L.map(mapRef.current, …)`
- L'effet d'init (L409) garde `if (mapInstanceRef.current) return`, mais en **StrictMode/HMR** React ré-exécute l'effet : le cleanup `map.remove()` est asynchrone côté Leaflet (DOM nettoyé après) → la 2ᵉ exécution recrée `L.map()` sur un container **encore taggé** `_leaflet_id`.
- Conséquence en chaîne : `tileLayer.addTo(map)` (L435) puis l'overlay SVG (L8150 leaflet) ne trouvent plus de container → `appendChild undefined`.
- **Fix** : avant `L.map(...)`, exécuter `if ((mapRef.current as any)._leaflet_id) { delete (mapRef.current as any)._leaflet_id; mapRef.current.innerHTML = ''; }` ; et dans le cleanup, wrapper `mapInstanceRef.current.remove()` dans try/catch.

---

### 2. Bugs logiques 🟠

#### B2. Tracé des constructions ignoré pour les Appartements
`getMissingFields` L743 exige `buildingShapes` quand `!isTerrainNu && !isAppartement`, mais L736-739 force déjà `apartmentLength/Width/Orientation`. ✅ OK — **mais** : le compteur `expectedBuildingCount` (L744) ne tient pas compte si la principale est `Terrain nu` et qu'une additionnelle est bâtie → cas mixte non couvert. Rare mais bloquant.

#### B3. Auto-purge `IRL` re-déclenchée en boucle
L1222-1255 : la dépendance `taxRecords` dans le `useEffect` provoque un toast à chaque modification de tax (frappe utilisateur → `setTaxRecords` → effet → re-toast si la condition reste vraie pendant un instant). Le guard fonctionne, mais le toast doit s'afficher **une seule fois par changement d'état Location**, pas à chaque keystroke.
- **Fix** : retirer `taxRecords` des deps, ou guarder avec un `useRef` qui mémorise le set de `validRefs` précédent.

#### B4. Surface calculée — incohérence ordre des côtés
L1411-1446 : commentaire dit `[Nord, Sud, Est, Ouest]` mais l'utilisateur peut avoir 5+ côtés ou renommer les côtés. Le code prend `sides[0..3]` après filtrage des côtés vides → si l'utilisateur saisit Nord/Est/Sud (ordre adjacent) en omettant Ouest, l'algo « rectangle » compare `Nord↔Est` au lieu de `Nord↔Sud`. Calcul faux silencieux.
- **Fix** : utiliser le tracé GPS (formule du lacet/Shoelace) quand des bornes existent ; sinon désactiver l'autocalc et exiger 4 côtés.

#### B5. `clearSavedFormData` jamais appelée
Définie L279 mais **aucune référence** dans le hook (vérifié). Le brouillon localStorage n'est donc jamais purgé après soumission réussie → restauration zombie au prochain ouverture pour la même parcelle.
- **Fix** : appeler `clearSavedFormData()` dans `handleSubmit` après succès.

#### B6. Re-entrée bornes GPS désynchronisées
L1216 : init `gpsCoordinates` une seule fois (`[]` deps). Si l'utilisateur ajoute un côté plus tard via `addParcelSide` (L621), une borne est ajoutée → OK. Mais `removeParcelSide` (L628) supprime `gpsCoordinates[index]` seulement si `index < length`, sans renuméroter les `borne: 'Borne X'` restants. Affichage incohérent.

#### B7. `ownership_history` cascade `endDate`
L372-374 : modifier `startDate` du record N met à jour `endDate` du record N+1 — **mais** le tableau est trié plus récent → plus ancien (N=0 = plus récent). Donc N+1 = plus ancien. Mathématiquement, `endDate(plus_ancien) = startDate(plus_recent)` est correct. ✅ Mais L1396-1407 fait l'inverse : sync `previousOwners[last].endDate = currentOwners[0].since` → contredit B7 si l'utilisateur a déjà saisi manuellement. Le guard `if (!lastPreviousOwner.endDate)` protège, OK.

---

### 3. Validation 🟡

#### V1. Pas de schéma Zod
`getMissingFields` (250 l.) accumule 50+ règles ad-hoc sans contrat typé. Risque de régression silencieuse à chaque ajout de champ.

#### V2. Pas de validation côté serveur sur le `constructionRef` IRL
`tax_history` JSONB accepte n'importe quoi. Si le frontend bug, des données IRL invalides peuvent être insérées. À ajouter : contrainte de cohérence côté Edge Function de soumission.

#### V3. `formData.areaSqm` peut redevenir 0 silencieusement
L1419 / L1436 : `if (heronValue <= 0) return;` — l'ancienne valeur reste mais aucun warning. UX silencieuse.

---

### 4. Performances ⚡

#### P1. `useEffect` auto-save trop large
L1379-1384 : déps incluent `formData, currentOwners, …, saveFormDataToStorage` → re-render de `saveFormDataToStorage` à chaque changement (callback non stable car déps internes massives L239) → setTimeout/clearTimeout cascade 10×/sec en frappe rapide.
- **Fix** : utiliser un `useRef` pour la dernière sérialisation, debounce 1500ms unique avec une lib stable.

#### P2. `getMissingFields` recalculée à chaque render
Dépendances de `useCallback` L888 = 24 valeurs. Re-création quasi-systématique → cascade dans `isTabAccessible` → chaque `<Tab>` se ré-évalue. Mémoiser via `useMemo` retournant `MissingFields[]`.

#### P3. Cascade picklists construction recharge à chaque render
L1535-1606 : 4 effets enchaînés sur `getPicklistDependentOptions`. Si `useCCCFormPicklists` ne mémoise pas la fonction, ces effets bouclent. À vérifier.

---

### 5. Architecture & dette 📐

| Fichier | Lignes | Action |
|---|---|---|
| `ParcelMapPreview.tsx` | **2885** | 🔴 Critique — découper en `useLeafletMap`, `useDrawingMode`, `useGpsBornes`, `useBuildingShapes`. |
| `useCCCFormState.ts` | 1781 | 🟠 Modulariser : `useCCCOwners`, `useCCCConstruction`, `useCCCTaxes`, `useCCCLocation`, `useCCCValidation`. |
| `GeneralTab.tsx` | 1366 | 🟠 Découper en blocs : Title, Owners, Construction, Permits. |

---

### 6. UX & cohérence 🎨

- **U1** : `RentalStartDateField` exige `≥ 01/01/yyyy` mais l'`Année de construction` n'est pas obligatoire avant l'usage Location → l'utilisateur peut sélectionner Location, voir l'erreur, et ne pas comprendre qu'il faut d'abord renseigner l'année.
- **U2** : Le sélecteur « Construction concernée » IRL (ObligationsTab L213) n'affiche **pas** d'alerte visuelle si `allRefs.length === 0` alors qu'un IRL existe ; juste un texte gris dans le menu déroulant fermé.
- **U3** : `obligationType` (taxes/mortgages/disputes) n'est pas indiqué visuellement si une section a une erreur → l'utilisateur peut soumettre depuis Review et ne pas savoir quel sous-onglet ouvrir.
- **U4** : Dans `ReviewTab`, le bilan IRL par construction (récemment ajouté) ne propose pas de bouton « Aller à l'onglet Obligations » directement focalisé sur le record manquant.

---

### 7. Sécurité & PII 🔐

- **S1** : `STORAGE_KEY = cadastral_contribution_${parcelNumber}` contient noms, RC, NIF, photos métadata — pas chiffré. À documenter dans la politique cookies (déjà via `ConsentAwareStorage` ?). Vérifier que le wrapper consent est appliqué.
- **S2** : `auth_redirect_url` (L235) écrit le `pathname + search` en clair — peut contenir `parcelNumber` PII dans le query.

---

### 8. Plan de correctifs priorisés

| # | Sévérité | Action | Effort |
|---|---|---|---|
| **C1** | 🔴 Haute | Patcher init Leaflet (`_leaflet_id` cleanup + try/catch remove) | 10 lignes |
| **C2** | 🔴 Haute | Appeler `clearSavedFormData()` après soumission réussie | 1 ligne |
| **C3** | 🟠 Moy. | Stopper le toast IRL en boucle (retirer `taxRecords` des deps + ref guard) | 5 lignes |
| **C4** | 🟠 Moy. | Renuméroter `gpsCoordinates` après `removeParcelSide` | 5 lignes |
| **C5** | 🟠 Moy. | Bloquer ou désactiver le calcul automatique surface si `parcelSides < 4` non rectangulaires | 10 lignes |
| **C6** | 🟡 Basse | UX : tooltip « Renseignez d'abord l'année de construction » sur RentalStartDateField désactivé | 5 lignes |
| **C7** | 🟡 Basse | Toast/badge sur sous-onglet Obligations si erreur IRL en attente | 10 lignes |
| **C8** | 🟡 Dette | Modulariser `ParcelMapPreview` (priorité haute long-terme) | grand |

### 9. Tests E2E recommandés
- Ouvrir le formulaire 2× de suite sans recharger → plus aucune erreur Leaflet.
- Soumettre avec succès → fermer puis rouvrir : aucun brouillon restauré.
- En frappant rapidement dans le champ « Montant » d'un IRL → un seul toast (pas 10).
- Supprimer un côté de parcelle → `Borne 3` devient `Borne 2`, etc.
- Saisir 3 côtés sur 4 → message clair, pas de surface calculée fausse.

