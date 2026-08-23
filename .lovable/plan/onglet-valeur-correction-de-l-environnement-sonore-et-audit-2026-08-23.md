# Onglet « Valeur » — correction de l'environnement sonore et audit

## 1. « Environnement sonore : — compléter dans Localisation » alors que la donnée est saisie (confirmé)

L'environnement sonore est stocké dans un état séparé du reste du formulaire. L'onglet Valeur, lui, va le chercher dans le bloc de données principal — où il n'est jamais écrit. Le message d'incomplétude s'affiche donc **toujours**, même quand le niveau sonore est correctement renseigné dans Localisation.

Correctif : transmettre l'environnement sonore à l'onglet Valeur, comme cela est déjà fait pour le récapitulatif.

## 2. La soumission peut rester bloquée sur une « modalité de paiement » qui n'existe plus (confirmé, bloquant)

Le bloc « Modalités de prix » a été retiré de l'annonce de vente à votre demande, mais la validation exige toujours ce champ. Résultat : dès que l'utilisateur répond « Oui » à la question de revente, l'envoi est refusé avec un motif introuvable dans le formulaire.

Correctif : retirer cette exigence de la validation.

## 3. Renvois vers le mauvais onglet (confirmé)

Le bloc « Construction » a été déplacé dans **Localisation**, mais l'onglet Valeur renvoie encore vers **Infos** :
- lien « Année : — compléter dans Infos » (ouvre le mauvais onglet) ;
- message « Aucun local n'a été déclaré comme inoccupé dans l'onglet Infos… » ;
- bandeau « Vous avez indiqué dans l'onglet Infos que N local(aux)… ».

Correctif : pointer et nommer l'onglet « Localisation ».

## 4. Le rapport d'expertise et les photos ne sont pas consultables hors formulaire (confirmé)

Les pièces jointes de l'onglet Valeur sont enregistrées sous forme d'adresse « publique » alors que le stockage est privé. Dans le formulaire, les images s'affichent quand même (résolution automatique en lien signé), mais le **rapport d'expertise** ouvert depuis le récapitulatif, l'espace admin ou l'espace utilisateur pointe vers une adresse inopérante (erreur au clic).

Correctif : enregistrer le chemin du fichier (et non une adresse publique factice) et ouvrir le rapport via un lien signé temporaire aux trois endroits concernés. Les enregistrements existants (anciennes adresses publiques) restent lisibles : la résolution accepte les deux formats.

## 5. Suppression d'image incomplète (confirmé, mineur)

Le nettoyage du fichier dans le stockage ne reconnaît que l'ancien format d'adresse. Une fois le point 4 corrigé, la suppression d'une photo laisserait le fichier orphelin dans le stockage.

Correctif : accepter les deux formats lors de la suppression.

## 6. Annonces « fantômes » qui bloquent l'envoi (confirmé, mineur)

Si un local coché « à proposer à la location » redevient occupé (ou si la construction n'est plus louée), son annonce reste enregistrée. La validation continue d'exiger une photo pour ce local, alors que le bloc n'est plus affiché — blocage sans champ visible.

Correctif : ne valider que les annonces correspondant à un local réellement vacant, et purger les annonces orphelines.

## Points vérifiés et corrects (aucun changement)

- Restauration en édition des données de valeur (prix, expertise, annonce de vente, annonces de location).
- Conversion USD/CDF et recalcul lors d'un changement de taux.
- Purge des données quand l'utilisateur repasse « Non » (vente ou expertise).
- Fenêtre de 6 mois de l'expertise, calculée à l'affichage.

## Détails techniques

- `CadastralContributionDialog.tsx` : passer `soundEnvironment={state.soundEnvironment}` à `MarketValueTab` ; nouvelle prop dans `MarketValueTabProps`, transmise à `buildVacantTargets` (`marketValueUtils.ts` : paramètre explicite au lieu de `formData.soundEnvironment`), et ajoutée aux deps du `useMemo`.
- `useFormValidation.ts` (~l.438-440) : supprimer le contrôle `sale.paymentTerms` ; borner la boucle `marketListings` aux refs présents dans les locaux vacants.
- `MarketValueTab.tsx` : `handleTabChange('general')` → `'location'` et libellés « Infos » → « Localisation » (l. ~733, ~677, ~683) ; `isPublic={false}` sur les trois `StorageFileUpload` (l. 411, 643, 914) ; `pathFromPublicUrl` accepte aussi un chemin brut ; purge des annonces dont le ref n'est plus vacant.
- Rapport d'expertise : ouverture via `createSignedUrl` dans `review/MarketValueSummary.tsx`, `admin/ccc/CCCMarketValuePanel.tsx`, `user/assets/MarketValuePanel.tsx` (petit utilitaire partagé, sur le modèle de `SignedStorageImage`).

Aucune migration SQL, aucune modification de RLS ni de règle métier.
