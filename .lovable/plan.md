

# Corrections du module Lotissement

## Probleme 1 : Bloc "Demandeur" redondant

Le bloc "Demandeur" dans `StepParentParcel.tsx` demande manuellement le prenom, nom, telephone et email alors que ces informations sont deja disponibles via l'utilisateur connecte (auto-rempli par le `useEffect` dans `useSubdivisionForm.ts`). Ce bloc est inutile et encombre l'interface.

**Solution** : Supprimer le bloc formulaire "Demandeur" de `StepParentParcel.tsx`. A la place, afficher un simple encadre en lecture seule montrant le nom et email de l'utilisateur connecte avec un badge "Connecte". Garder uniquement le champ "Qualite du demandeur" (proprietaire/mandataire/notaire) car c'est la seule information non derivable du profil.

## Probleme 2 : Brouillon charge pour la mauvaise parcelle

Le `draftKey` est bien `subdivision-draft-${parcelNumber}`, donc en theorie unique par parcelle. Mais le composant `SubdivisionRequestDialog` est **toujours monte** dans `ParcelActionsDropdown` meme quand `open=false`. Quand l'utilisateur change de parcelle, le composant ne se demonte/remonte pas — le hook garde l'ancien etat en memoire. L'effet de restauration du brouillon (`useEffect` sur `draftKey`) se declenche bien avec le nouveau `draftKey`, mais il **ajoute** les donnees du nouveau brouillon sans reinitialiser les donnees du brouillon precedent (lots, roads, etc. restent en memoire si le nouveau `draftKey` n'a pas de brouillon).

**Solution** : 
1. Dans `SubdivisionRequestDialog`, ajouter `key={parcelNumber}` sur le contenu interne OU conditionner le rendu a `open` pour forcer un remontage complet quand la parcelle change.
2. Dans `useSubdivisionForm`, reinitialiser tous les etats (lots, roads, requester, etc.) quand `parcelNumber` change, avant de restaurer le brouillon.

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Modifie | `StepParentParcel.tsx` — Supprimer le formulaire "Demandeur" (inputs prenom/nom/tel/email), le remplacer par un affichage en lecture seule du profil connecte + garder uniquement le select "Qualite du demandeur" |
| Modifie | `SubdivisionRequestDialog.tsx` — Ajouter rendu conditionnel (`open && ...`) ou `key={parcelNumber}` pour forcer le remontage |
| Modifie | `useSubdivisionForm.ts` — Ajouter un `useEffect` sur `parcelNumber` qui reinitialise lots/roads/commonSpaces/servitudes/requester avant restauration du brouillon |

