

# Deplacement "Environnement sonore" : Expertise → CCC

## Resume

Deplacer le bloc "Environnement sonore" (niveau sonore + sources de bruit + mesure micro) du formulaire d'expertise immobiliere vers le formulaire CCC (onglet Localisation, apres "Limites et Entrees"). Puis aligner toute la chaine : base de donnees, approbation, analytics, admin, fiche cadastrale, mode test.

## Chaine d'impact

```text
CCC Form (LocationTab)         ← AJOUTER le bloc sonore
Expertise Form (Dialog)        ← RETIRER le bloc sonore
useCadastralContribution.tsx   ← nouveau champ soundEnvironment + nearbySoundSources
useCCCFormState.ts             ← persistance + payload
cadastral_contributions (DB)   ← nouvelle colonne sound_environment
cadastral_parcels (DB)         ← nouvelle colonne sound_environment
AdminCCCContributions.tsx      ← propager sound_environment a l'approbation
ExpertiseBlock.tsx             ← lire depuis cadastral_parcels au lieu d'expertise
crossVariables.ts              ← garder les croisements inchanges
testDataGenerators.ts          ← generer sound_environment dans CCC + retirer d'expertise
AdminExpertiseRequests.tsx     ← retirer l'affichage sound_environment
ReviewTab.tsx                  ← afficher le son dans le recapitulatif
generateExpertiseCertificatePDF← retirer sound_environment du PDF expertise
```

## Etapes d'implementation

### 1. Migration SQL
- Ajouter `sound_environment text` et `nearby_noise_sources text` aux tables `cadastral_contributions` et `cadastral_parcels`
- Les colonnes dans `real_estate_expertise_requests` restent (donnees historiques) mais ne seront plus alimentees

### 2. Formulaire CCC — LocationTab
- Ajouter les props `soundEnvironment`, `nearbySoundSources`, `onSoundEnvironmentChange`, `onNearbySoundSourcesChange` au composant
- Inserer le bloc apres le `ParcelMapPreview` (apres la zone Limites et Entrees) : question "sur place ?", mesure microphone, picklist niveau sonore, sources de bruit
- Deplacer les constantes `SOUND_ENVIRONMENT_OPTIONS` et les fonctions `startSoundMeasurement`, `stopSoundMeasurement`, `getSoundLevelFromDecibels` dans un fichier utilitaire partage ou directement dans LocationTab

### 3. Hook CCC — useCadastralContribution + useCCCFormState
- Ajouter `soundEnvironment` et `nearbySoundSources` a `CadastralContributionData`
- Inclure dans le payload de soumission (`sound_environment`, `nearby_noise_sources`)
- Persister dans localStorage

### 4. Formulaire Expertise — RealEstateExpertiseRequestDialog
- Retirer tout le bloc "Environnement sonore" du JSX (lignes ~1926-2077)
- Retirer les states `soundEnvironment`, `nearbyNoiseSources`, `isOnSite`, `isRecordingSound`, `measuredDecibels`, `microphoneError` et les refs audio
- Retirer les fonctions `startSoundMeasurement`, `stopSoundMeasurement`, `getSoundLevelFromDecibels`
- Retirer `sound_environment` et `nearby_noise_sources` du payload de soumission
- Ajuster l'onglet "environnement" (ne garder que Accessibilite & distances, etc.)

### 5. Approbation CCC — AdminCCCContributions
- Ajouter `sound_environment: updatedContribution.sound_environment` dans les deux blocs (update et insert) de propagation vers `cadastral_parcels`

### 6. ReviewTab CCC
- Afficher le son dans le recapitulatif (apres les limites/servitudes)

### 7. Analytics — ExpertiseBlock
- Modifier la source de donnees : lire `sound_environment` depuis `cadastral_parcels` (ou deplacer le graphique vers un bloc cadastral) — ou conserver temporairement en lisant les deux sources

### 8. Admin Expertise — AdminExpertiseRequests
- Retirer l'affichage de `sound_environment` et `nearby_noise_sources` dans le detail

### 9. PDF Expertise — generateExpertiseCertificatePDF
- Retirer la ligne "Env. sonore" du certificat d'expertise

### 10. Mode test — testDataGenerators
- Ajouter `sound_environment` aux donnees de test CCC
- Retirer `sound_environment` des donnees de test expertise

### 11. Types
- Retirer `sound_environment` et `nearby_noise_sources` de `src/types/expertise.ts` (interfaces)
- Regenerer les types Supabase apres migration

## Fichiers impactes

**Nouvelle migration** : 1 fichier SQL

**Modifies** (~12 fichiers) :
- `src/components/cadastral/ccc-tabs/LocationTab.tsx`
- `src/hooks/useCadastralContribution.tsx`
- `src/hooks/useCCCFormState.ts`
- `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx`
- `src/components/admin/AdminCCCContributions.tsx`
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx`
- `src/components/visualizations/blocks/ExpertiseBlock.tsx`
- `src/components/admin/AdminExpertiseRequests.tsx`
- `src/utils/generateExpertiseCertificatePDF.ts`
- `src/components/admin/test-mode/testDataGenerators.ts`
- `src/types/expertise.ts`
- `src/integrations/supabase/types.ts`
- `src/config/crossVariables.ts` (ajuster si necessaire)

