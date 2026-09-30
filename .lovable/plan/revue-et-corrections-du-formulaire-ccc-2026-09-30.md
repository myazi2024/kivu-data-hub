# Revue et corrections du formulaire CCC

## Problèmes confirmés

1. **Approbation admin sans garde serveur** : l'admin approuve une contribution par une simple mise à jour directe. Rien n'empêche de ré-approuver une contribution déjà approuvée ou rejetée. Une fonction serveur sécurisée existe pour cela (vérification du rôle admin, statut attendu) mais n'est jamais utilisée. Même chose pour la fonction serveur de rejet motivé.
2. **Litige signalé depuis le formulaire sans lien vers la parcelle** : l'onglet Obligations attend l'identifiant de la parcelle, mais le formulaire ne le lui transmet jamais. Chaque litige déclaré depuis le CCC est enregistré sans lien, même quand la parcelle existe déjà (demande de mise à jour).
3. **Contrat de location : « initial / renouvellement » non obligatoire** : ce choix est demandé, enregistré et affiché dans le récapitulatif, mais la validation ne l'exige pas. S'il manque, le formulaire suppose « initial » en silence, ce qui fausse les contrôles de dates.
4. **Règle des 3 points GPS écrite en double** côté formulaire (validation d'onglet et validation d'envoi), avec un seuil recopié. Une modification future risque de n'en changer qu'une.
5. **Outil de test oublié** : un utilitaire de débogage des autorisations de bâtir n'est utilisé nulle part dans l'application.

## Corrections

- Approbation et rejet passent par les fonctions serveur sécurisées. En cas de contribution déjà traitée, l'admin voit un message clair.
- Le formulaire transmet l'identifiant de la parcelle existante à l'onglet Obligations. Pour une nouvelle parcelle, rien n'est inventé : le litige reste lié par son numéro.
- « Type de contrat (initial / renouvellement) » devient obligatoire dès que le titre est un contrat de location. Il est signalé dans la liste des champs manquants.
- Un seul seuil partagé pour les points GPS, utilisé par les deux validations.
- Suppression de l'utilitaire de test inutilisé.

## Hors périmètre (à décider plus tard)

- Revérifier côté serveur tous les champs obligatoires à l'envoi. C'est un chantier important qui touche la base, à traiter séparément si vous le souhaitez.

## Vérification

Tests existants et nouveaux tests unitaires (contrat de location sans type, seuil GPS), contrôle des types, puis passage dans le navigateur. Formulaire : le champ manquant apparaît. Admin : approuver deux fois de suite affiche le message « déjà traitée ».

## Détails techniques

- `src/components/admin/ccc/cccApproval.ts` : `supabase.rpc('approve_ccc_contribution', { p_id })` puis relecture de la ligne pour `contribution_type` et `original_parcel_id`. Le chemin de rejet admin appelle `reject_ccc_contribution(p_id, p_reason)`, après lecture du composant de rejet actuel.
- `CadastralContributionDialog.tsx` : passer `parcelId={originalParcelId}` (ou l'équivalent disponible dans l'état du formulaire) à `<ObligationsTab>`.
- `useFormValidation.ts` : ajouter `leaseType` requis quand `propertyTitleType` est un contrat de location, et un test.
- Constante `MIN_GPS_POINTS = 3` partagée entre `useFormValidation.ts` et `validateContributionData` (`useCadastralContribution.tsx`).
- Supprimer `src/utils/testUserBuildingPermits.ts`.
