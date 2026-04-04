

# Audit complet du formulaire de demande de titre foncier

## Architecture generale

Le formulaire est un composant monolithique de **3332 lignes** (`LandTitleRequestDialog.tsx`) avec 6 onglets (Demandeur, Lieu, Mise en valeur, Documents, Frais, Envoi). Il s'appuie sur `useLandTitleRequest.tsx` (317 lignes) pour la persistance et `LandTitleReviewTab.tsx` (444 lignes) pour le recapitulatif.

---

## Problemes identifies

### A. Architecture et maintenabilite

1. **Fichier monolithique de 3332 lignes** : Le composant viole la strategie de modularisation documentee dans `complex-dialog-modularization-strategy-fr`. Il devrait etre decoupe en sous-composants par onglet (RequesterTab, LocationTab, ValorisationTab, DocumentsTab, PaymentTab) dans un dossier dedie `src/components/cadastral/land-title-request/`.

2. **~50 etats `useState` dans un seul composant** : Risque de re-rendus excessifs. Les etats pourraient etre regroupes via `useReducer` ou extraits dans des hooks dedies (`useLandTitleFormState`, `useLandTitleParcelData`).

3. **Logique metier inline dans le JSX** (lignes 1166-1326) : Le fetch des donnees parcelle (owner, location, valorisation, permits) est entierement dans un `onClick` de 160 lignes. Doit etre extrait dans un hook ou une fonction utilitaire.

### B. Bugs fonctionnels

4. **Usage "Location" manquant** : Le bloc CCC injecte "Location" pour les combinaisons Residentielles/Commerciales/Industrielles + Durable/Semi-durable (via `constructionUsageResolver.ts`). Le formulaire titre foncier (lignes 421-472) calcule les usages en dur sans inclure "Location". Desalignement avec le CCC.

5. **Materiaux non lies a la nature** : Dans le CCC, les materiaux auto-determinent la nature (ex: "Beton arme" -> "Durable"). Dans le formulaire titre foncier (lignes 2462-2487), les materiaux sont un select independant dont la liste est filtree par nature, mais sans auto-determination inverse. Desalignement documente dans `construction-type-consistency-standard-fr`.

6. **Draft ne sauvegarde pas `propertyCategory`** : Le brouillon (`landTitleDraftStorage.ts`) ne contient pas `propertyCategory`, `standing`, `floorNumber`, `constructionYear`. Ces champs sont perdus en cas de restauration de brouillon.

7. **Reset incomplet a la fermeture** : `handleConfirmClose` (ligne 796) ne reset pas `showValorisationUpdate`, `hasPermitUpdate`, `permitUpdateType`, `permitUpdateNumber`, `permitUpdateDate`, `permitUpdateService`, `permitUpdateFile`, `parcelBuildingPermits`.

8. **`property_category` non fetch depuis la DB** : Le `select` de contributions (ligne 1178) ne demande pas `property_category`. La variable `valoPropertyCategory` (ligne 1282) caste en `(contribData as any)?.property_category` ce qui fonctionne, mais c'est fragile car le champ n'est pas dans le select explicite.

### C. Validation et securite

9. **Validation `isFormValid()` insuffisante** : Ne verifie pas le genre du proprietaire quand `requesterType === 'representative'` et `ownerLegalStatus === 'Personne physique'`. Ne verifie pas que `constructionType`, `constructionNature`, `declaredUsage` sont remplis (se repose uniquement sur `valorisationValidated`).

10. **Pas de validation des coordonnees GPS** : Les coordonnees sont acceptees sans verifier qu'elles sont dans la plage valide pour la RDC (-13.5 a 5.5 lat, 12 a 31 lng).

11. **Upload sans verification MIME reelle** : Le type MIME est verifie par `file.type` (declare par le navigateur) mais pas par les magic bytes du fichier. Un fichier malveillant pourrait contourner la validation.

12. **Insert avec `as any`** (ligne 249 de `useLandTitleRequest.tsx`) : Le type-cast contourne le typage TypeScript, masquant d'eventuelles colonnes manquantes ou mal nommees.

### D. UX et ergonomie

13. **Onglet "Mise en valeur" en mode non-parcel-linked** : Quand `requestType === 'initial'` et la parcelle est liee, le bloc construction s'affiche directement sans contexte. Pas de radio "Ces donnees sont exactes" / "Proposer une mise a jour" car `parcelValorisationData` existe. Mais si l'utilisateur navigue directement a l'onglet sans avoir de parcelle, le formulaire est vide sans guidance.

14. **Le RecapTab ne montre pas** : `propertyCategory`, `standing`, `floorNumber`, `constructionYear`, `constructionMaterials`, les donnees d'autorisation de batir proposees. Ces champs sont soumis mais invisibles au recapitulatif.

15. **Navigation sans garde** : L'utilisateur peut cliquer sur n'importe quel onglet a tout moment (sauf si `isFormBlocked`). Pas de validation progressive a chaque etape — il peut aller a "Frais" sans avoir rempli "Demandeur".

16. **Pas de feedback visuel par onglet** : Les tabs ne montrent pas d'indicateur vert/rouge de completude. Seul le RecapTab donne cette info.

### E. Coherence avec le CCC

17. **Appartements : nombre d'etages visible** : Selon `construction-type-consistency-standard-fr`, les appartements doivent masquer "Nombre d'etages". Le formulaire titre foncier l'affiche pour toute nature != "Non bati" sans exception pour les appartements.

18. **Autorisations de batir pour Appartements** : Selon la meme spec, les appartements masquent les autorisations de batir. Le formulaire titre foncier ne fait pas cette distinction.

---

## Plan de correction propose

### Phase 1 — Bugs critiques (bloquants)

1. **Ajouter "Location" aux usages declares** dans le useEffect lignes 421-472, aligne sur `constructionUsageResolver.ts`
2. **Ajouter `property_category` au select** explicite de contributions (ligne 1178)
3. **Completer le reset** dans `handleConfirmClose` pour tous les etats permits
4. **Enrichir le draft** avec `propertyCategory`, `standing`, `floorNumber`, `constructionYear`

### Phase 2 — Coherence CCC

5. **Masquer "Nombre d'etages"** pour `propertyCategory === 'Appartement'`
6. **Masquer le bloc "Autorisation de batir"** pour `propertyCategory === 'Appartement'`
7. **Ajouter la logique materiaux -> nature** (auto-determination) comme dans le CCC

### Phase 3 — RecapTab complet

8. **Ajouter au RecapTab** : categorie de bien, materiaux, standing, nombre d'etages, annee de construction, donnees d'autorisation de batir proposees

### Phase 4 — Modularisation (refactoring)

9. Extraire chaque onglet en sous-composant
10. Extraire la logique de fetch parcelle en hook dedie
11. Grouper les etats en `useReducer`

### Fichiers concernes
- `src/components/cadastral/LandTitleRequestDialog.tsx`
- `src/components/cadastral/LandTitleReviewTab.tsx`
- `src/utils/landTitleDraftStorage.ts`
- `src/hooks/useLandTitleRequest.tsx`

