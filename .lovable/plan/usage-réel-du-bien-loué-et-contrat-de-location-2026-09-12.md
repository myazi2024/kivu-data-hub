# Usage réel du bien loué et contrat de location

Dans l'onglet Localisation → bloc Construction, ajouter la notion d'usage réel (ce que le locataire fait réellement du bien, qui peut différer de l'usage prévu), adapter les questions d'occupation en conséquence, et permettre de joindre le contrat de location.

## Ce qui change

### 1. Nouvelle question « Usage réel »

- S'affiche dans le bloc « Capacité d'accueil », juste après « Votre {catégorie} est-il habité ? », uniquement si la réponse est « Oui ».
- La liste propose **tous** les usages prévus existants, toutes catégories confondues (Habitation, Commerce, Bureau, Entrepôt, Industrie, Agriculture, Parking, Espace d'entreposage, Terrain vacant, Usage mixte, Aucun…), sans doublons, puis « Autre » en dernier.
- « Autre » ouvre un champ texte libre pour préciser.
- En mode « Divisé en plusieurs locaux », la question est posée **par local**, dans la carte du local, après « Ce local est-il actuellement occupé ? = Oui ».

### 2. Occupants et capacité adaptés à l'usage réel

- Si l'usage réel est **résidentiel** (Habitation, Usage mixte, Agriculture avec habitation) : comportement actuel inchangé — « Combien de personnes y vivent ? » puis « Quelle est sa capacité d'accueil ? (personnes) ».
- Si l'usage réel est **non résidentiel** (Commerce, Bureau, Entrepôt, Industrie, Parking, Espace d'entreposage, Terrain vacant, Aucun, Autre) :
  - « Combien de personnes y vivent ? » disparaît (et la valeur déjà saisie est effacée).
  - La capacité devient une capacité d'exploitation adaptée à l'usage :
    - Commerce / Bureau : « Nombre de postes de travail »
    - Entrepôt / Espace d'entreposage / Industrie : « Capacité de stockage (m³) »
    - Parking : « Nombre de places »
    - Terrain vacant / Aucun / Autre : « Capacité d'exploitation » (champ générique, unité au choix)
  - Ces champs restent facultatifs, comme aujourd'hui pour la capacité.

### 3. Contrat de location (optionnel)

- Si le bien est mis en location **et** que le local est déclaré occupé, un champ « Contrat de location (optionnel) » apparaît juste après « Loyer mensuel (USD) ».
- Un contrat **par local occupé** en mode multi-locaux ; un seul contrat en mode « un seul local ».
- Formats acceptés : PDF, JPG, PNG, max 5 Mo. Le fichier n'est envoyé qu'à la soumission, avec suppression en cas d'échec (même mécanisme que les pièces jointes des litiges).
- Un texte explique que le contrat peut être ajouté plus tard depuis l'espace utilisateur.
- À la soumission, si au moins un local occupé n'a pas de contrat, une notification est créée pour l'utilisateur l'invitant à le déposer depuis son espace.

### 4. Récapitulatif et espace admin

- L'onglet Récapitulatif affiche l'usage réel (et la précision « Autre »), la capacité adaptée, et l'état du contrat (joint / à fournir).
- La fiche admin de la contribution affiche les mêmes informations.

## Détails techniques

**Base de données** (migration sur `cadastral_contributions`) :
- `actual_usage text`, `actual_usage_other text`
- `operational_capacity numeric`, `operational_capacity_unit text`
- `lease_contract_url text`
- Le mode multi-locaux stocke `actualUsage`, `actualUsageOther`, `operationalCapacity`, `operationalCapacityUnit`, `leaseContractUrl` dans chaque entrée du jsonb `rental_units` (pas de changement de schéma).

**Front-end** :
- Nouveau `src/utils/actualUsage.ts` : liste agrégée des usages (à partir de `CCC_STATIC_PICKLIST_REGISTRY.picklist_declared_usage` + surcharges DB via `getPicklistDependentOptions`), prédicat `isResidentialActualUsage`, et résolution du libellé/unité de capacité.
- `ConstructionSection.tsx` : sélecteur usage réel + champ « Autre » après la question d'habitation ; occupants conditionnés à `isResidentialActualUsage` ; capacité alternative ; purge des valeurs devenues hors sujet au changement d'usage.
- `RentalConfigurationFields.tsx` : mêmes champs par local dans les cartes multi-locaux ; champ contrat après le loyer du local ; extension du type `RentalUnit`.
- Nouveau composant `LeaseContractField.tsx` (sélection/prévisualisation/suppression du fichier), réutilisé en single et multi.
- `useCCCFormState.ts` : états `leaseContractFile` / `leaseContractFiles[]`, upload vers le bucket `cadastral-documents` avec chemin préfixé par l'ID utilisateur, rollback en cas d'échec, et injection des URLs dans la charge utile.
- `useCadastralContribution.tsx` : sérialisation des nouveaux champs ; création de la notification « contrat de location manquant » après insertion réussie.
- Récapitulatif (`RentalSummary.tsx`) et admin (`CCCRentalBlock.tsx`, `types.ts`) mis à jour.
- Validation (`useFormValidation.ts`) : aucun nouveau blocage — usage réel et contrat restent facultatifs.

Vérification : `npx tsgo --noEmit -p tsconfig.app.json` puis `npx vitest run`.
