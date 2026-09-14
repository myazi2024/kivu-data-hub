---
name: Usage réel et contrat de location (CCC)
description: Bloc Capacité d'accueil du formulaire CCC — usage réel du bien loué, capacité adaptée et contrat de location optionnel
type: feature
---

- « Usage réel » s'affiche après « Votre {catégorie} est-il habité ? = Oui » (par local en mode multi). Options = tous les usages prévus, toutes catégories confondues, sans doublon, + « Autre » en dernier (`src/utils/actualUsage.ts`).
- Usage réel non résidentiel → occupants et capacité d'accueil masqués et non bloquants ; remplacés par une capacité d'exploitation dont le libellé/l'unité dépend de l'usage (`resolveOperationalCapacityField`).
- Contrat de location optionnel après « Loyer mensuel (USD) » quand le bien est loué et occupé : un par local occupé en multi, un seul en mode single. Upload via `uploadCccDocument` (bucket privé `cadastral-documents`, chemin préfixé `auth.uid()`).
- À la soumission, `notifyMissingLeaseContract` crée une notification invitant à ajouter le contrat plus tard depuis l'espace utilisateur.
- Colonnes : `actual_usage`, `actual_usage_other`, `operational_capacity`, `operational_capacity_unit`, `lease_contract_url` sur `cadastral_contributions` ; mêmes clés snake_case dans le jsonb `rental_units`.
