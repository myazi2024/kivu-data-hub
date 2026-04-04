

# Amelioration de la fonctionnalite "Determiner un titre"

## Probleme actuel

1. **"Duree souhaitee" inutile** : Le champ `occupationDuration` (perpetuel/long_terme/temporaire) est utilise comme critere principal de deduction, alors qu'en droit foncier congolais, c'est l'etat de mise en valeur (prouve par l'autorisation de batir) qui determine le titre, pas un souhait du demandeur.

2. **L'autorisation de batir n'intervient pas dans la deduction** : Le formulaire collecte deja les donnees d'autorisation de batir (existantes via `parcelBuildingPermits` ou proposees via `permitUpdate*`), mais `deduceLandTitleType()` ne les prend pas en compte. Or, la presence d'une autorisation de batir delivree est la preuve formelle de la mise en valeur.

3. **La logique actuelle** dans `landTitleDeduction.ts` (727 lignes) branch sur `occupationDuration` en premier (lignes 99-301), ce qui fausse la deduction : un congolais avec construction durable + autorisation de batir delivree devrait automatiquement obtenir un Certificat d'enregistrement, independamment d'une "duree souhaitee".

## Solution

### 1. Supprimer le champ "Duree souhaitee"

**Fichier** : `LandTitleRequestDialog.tsx`
- Retirer le `Select` "Duree souhaitee" du bloc Eligibilite (lignes 2796-2832)
- Retirer la variable d'etat `occupationDuration` et son setter
- Le bloc Eligibilite ne garde que le champ "Nationalite"
- Le bouton "Determiner le titre" s'affiche des que `nationality` est rempli (au lieu de `nationality && occupationDuration`)
- Retirer `occupationDuration` des dependances du `useEffect` de reset (ligne 354)
- Retirer les messages conditionnels basés sur `occupationDuration` (lignes 2835-2861)

**Fichier** : `landTitleDraftStorage.ts` — retirer `occupationDuration` du draft

**Fichier** : `useLandTitleRequest.tsx` — retirer `occupationDuration` du type et de l'insert

**Fichier** : `LandTitleReviewTab.tsx` — retirer l'affichage de "Duree souhaitee"

### 2. Ajouter l'autorisation de batir comme critere de deduction

**Fichier** : `landTitleDeduction.ts`
- Ajouter au type `LandTitleDeductionInput` : `hasBuildingPermit: boolean` (une autorisation de batir delivree existe-t-elle, soit dans les donnees parcelle, soit proposee par l'utilisateur)
- Refondre la logique de deduction :
  - **Congolais + Construction durable + Autorisation de batir** → Certificat d'enregistrement (confiance haute)
  - **Congolais + Construction durable + PAS d'autorisation** → Concession ordinaire (avec mention que l'obtention d'une autorisation de batir permettrait d'evoluer vers le certificat)
  - **Etranger + Construction durable + Autorisation** → Bail emphyteotique (18-99 ans)
  - **Etranger + sans construction durable** → Bail foncier
  - **Semi-durable / Precaire** → Concession ordinaire (avec chemin de conversion)
  - **Terrain nu** → Permis d'occupation (urbain ou rural)
- Supprimer toute reference a `occupationDuration` dans les parametres et la logique
- Supprimer `OCCUPATION_DURATION_OPTIONS`
- Simplifier : la "duree" decoule naturellement du type de titre deduit

### 3. Connecter les donnees d'autorisation au moteur de deduction

**Fichier** : `LandTitleRequestDialog.tsx`
- Dans `handleValidateValorisation`, calculer `hasBuildingPermit` :
  ```
  const hasBuildingPermit = parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes';
  ```
- Passer ce booleen a `deduceLandTitle()` a la place de `occupationDuration`

### 4. Adapter les messages du bloc Eligibilite

- Remplacer le message conditionnel (lignes 2835-2861) par un message base sur la presence/absence d'autorisation de batir :
  - Si autorisation presente : "La mise en valeur est prouvee par l'autorisation de batir delivree"
  - Si absente : "Aucune autorisation de batir n'a ete identifiee. Cela peut limiter le type de titre accessible."

### Fichiers modifies
- `src/utils/landTitleDeduction.ts` — refonte logique, nouveau parametre, suppression `occupationDuration`
- `src/components/cadastral/LandTitleRequestDialog.tsx` — suppression du champ, adaptation de la validation
- `src/components/cadastral/LandTitleReviewTab.tsx` — retrait affichage duree
- `src/utils/landTitleDraftStorage.ts` — retrait du draft
- `src/hooks/useLandTitleRequest.tsx` — retrait du type et de l'insert

