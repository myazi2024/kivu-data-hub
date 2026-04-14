

# Finalisation du deplacement "Environnement sonore" — Fichiers restants

5 fichiers restent a aligner apres les modifications deja effectuees.

## Modifications

### 1. AdminCCCContributions.tsx — Propager sound_environment a l'approbation
Ajouter `sound_environment` et `nearby_noise_sources` dans les deux blocs de propagation vers `cadastral_parcels` :
- Bloc **update** (ligne ~360, avant `province`) : ajouter `sound_environment: updatedContribution.sound_environment, nearby_noise_sources: updatedContribution.nearby_noise_sources`
- Bloc **insert** (ligne ~451, avant la fermeture) : idem

### 2. ReviewTab.tsx — Afficher le son dans le recapitulatif
Apres le bloc "Limites et entrees" (ligne ~324), ajouter une section conditionnelle affichant `formData.soundEnvironment` et `formData.nearbySoundSources` avec les labels traduits (reutiliser les constantes SOUND_ENVIRONMENT_OPTIONS de LocationTab).

### 3. ExpertiseBlock.tsx — Retirer le graphique sonore
Le bloc lit `data.expertiseRequests` qui ne contient plus `sound_environment`. Supprimer :
- Le `useMemo` `bySoundEnv` (lignes 40-43)
- L'entree `sound-env` dans le tableau de definitions de graphiques (lignes 171-172)
- L'import `Volume2` s'il n'est plus utilise

### 4. testDataGenerators.ts — Deplacer sound_environment
- **generateContributions** (ligne ~283) : ajouter `sound_environment: pick(SOUND_ENVS, idx)` et `nearby_noise_sources` au record, avec la constante `SOUND_ENVS` definie localement
- **generateExpertiseRequests** (ligne ~648) : retirer `sound_environment: pick(SOUND_ENVS, i)` et la constante `SOUND_ENVS`

### 5. crossVariables.ts — Verification
Verifier si des croisements referent a `sound-env` dans le bloc expertise et les retirer ou les deplacer vers un bloc cadastral si necessaire.

## Fichiers impactes
- `src/components/admin/AdminCCCContributions.tsx`
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx`
- `src/components/visualizations/blocks/ExpertiseBlock.tsx`
- `src/components/admin/test-mode/testDataGenerators.ts`
- `src/config/crossVariables.ts` (verification)

