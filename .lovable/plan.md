# Pièces jointes du propriétaire actuel et des anciens propriétaires (formulaire CCC)

## 1. Réponse « Non » : pas de pièce d'identité du propriétaire actuel
Quand l'utilisateur répond « Non » à « Êtes-vous propriétaire ? » (simple contributeur) :
- Dans l'onglet Infos, bloc « Propriétaire actuel », l'emplacement « Ajouter la pièce d'identité » (et ses variantes : arrêté, RCCM, titre de concession, acte d'affectation) ne s'affiche plus, ni son info-bulle.
- Cette pièce n'est plus exigée pour envoyer le formulaire, et le récapitulatif ne la signale plus comme manquante.
- Une pièce déjà jointe dans un brouillon est ignorée à l'envoi (rien n'est téléversé).
- Le serveur refuse toute pièce d'identité du propriétaire actuel envoyée par un contributeur (le champ est vidé), pour qu'elle ne puisse pas être partagée sans consentement.
- Le parcours « Oui » (propriétaire exploitant) reste inchangé. La pièce d'identité reste obligatoire dans « Revendiquer une parcelle » (déjà le cas).

## 2. Historique des propriétaires : pièces jointes par ancien propriétaire
Pour chaque ancien propriétaire ajouté :
- **Titre de propriété** : obligatoire (PDF ou image, 10 Mo max).
- **Pièce d'identité** : optionnelle.
- Affichage : fichier joint avec bouton de retrait, comme les autres pièces du formulaire.
- Validation : un ancien propriétaire renseigné sans titre bloque l'envoi, avec renvoi vers l'onglet Historique. En modification d'une contribution, un titre déjà enregistré compte comme fourni.
- Récapitulatif : indique pour chaque ancien propriétaire les pièces jointes.
- Après validation par l'admin, le titre et la pièce d'identité sont recopiés dans l'historique de la parcelle. Ils restent visibles seulement via l'accès payé à l'historique (règle existante) ; la pièce d'identité d'un ancien propriétaire n'est montrée qu'aux admins.
- Admin : les deux pièces apparaissent dans le détail de la contribution.

## Détails techniques
- `ownerDeclaration.role` passé jusqu'à `GeneralTab` → `CurrentOwnersSection` (masquage), `useFormValidation` (exigence `ownerDocFile` seulement si `role === 'owner'` ou en modification sans déclaration), `ReviewTab`, et `useCCCFormState` (pas d'upload ni d'`ownerDocumentUrl` pour un contributeur).
- `PreviousOwner` : ajout `titleDocFile`, `identityDocFile` (non persistés dans le brouillon local, comme les autres fichiers) et `titleDocumentUrl`, `identityDocumentUrl`. Upload via `uploadCccDocument` (bucket privé `cadastral-documents`, dossier `previous-owners`), suppression des fichiers déjà envoyés si l'envoi échoue.
- `buildContributionPayload` : `ownership_document_url` = URL du titre (au lieu de `null`) et nouveau `identity_document_url` dans le JSON `ownership_history`.
- Migration :
  - colonne `identity_document_url text` sur `cadastral_ownership_history` ;
  - trigger d'insertion/mise à jour de `cadastral_contributions` : si `submitter_role <> 'owner'`, forcer `owner_document_url = NULL` ;
  - fonction d'approbation CCC : recopier `identity_document_url` ;
  - `get_parcel_paid_history` : renvoyer `identity_document_url` uniquement aux admins.
- Tests : `useFormValidation.test.ts` — contributeur sans pièce d'identité = valide ; ancien propriétaire sans titre = invalide ; avec titre sans pièce d'identité = valide.

## Hors périmètre
- Les contributions déjà enregistrées ne sont pas modifiées.
