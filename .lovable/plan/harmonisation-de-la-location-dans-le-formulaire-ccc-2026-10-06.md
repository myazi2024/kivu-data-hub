# Harmonisation de la location dans le formulaire CCC

## Objectif

Clarifier la date d’occupation des locaux, conserver le loyer uniquement pour les locaux occupés par un locataire, et aligner visuellement le contrat de location sur les pièces jointes de l’onglet Infos.

## Corrections prévues

### 1. Libellé de la date selon l’occupation

Dans les cartes du mode **« Divisé en plusieurs locaux »** :
- local occupé par un locataire : **« Occupé par le locataire actuel depuis le »** ;
- local inoccupé : conserver **« Inoccupé depuis le »** ;
- local occupé par le propriétaire : aucun champ de date locative, comme actuellement.

Le même vocabulaire sera repris dans le récapitulatif, la fiche administrateur et les restitutions concernées afin d’éviter des libellés contradictoires.

### 2. Règle du loyer confirmée

Conserver la règle métier choisie :
- **propriétaire (bailleur)** : aucun loyer mensuel, aucune date locative et aucun contrat ;
- **locataire** : le loyer mensuel reste affiché et requis ;
- **local inoccupé** : comportement locatif actuel conservé.

Les totaux, l’impôt sur les revenus locatifs et les contrôles serveur continueront d’exclure uniquement les locaux occupés par le propriétaire.

### 3. Contrat de location aligné sur l’onglet Infos

Restyler le champ **« Contrat de location (optionnel) »** sur le modèle vérifié des pièces jointes de l’onglet Infos :
- bouton pleine largeur à bordure pointillée avec icône d’ajout ;
- fichier joint présenté dans un bloc compact avec icône, nom lisible et action de retrait ;
- formats et taille maximale indiqués sous le bouton ;
- états d’envoi et messages d’erreur conservés.

L’envoi restera privé dans le stockage cadastral existant et le contrat restera facultatif.

## Harmonisation front-end / back-end

- Mettre à jour le helper partagé des libellés de date pour les affichages du formulaire, du récapitulatif et de l’administration.
- Vérifier la sérialisation des clés `occupied_by`, `rental_start_date`, `monthly_rent_usd` et `lease_contract_url` pour la construction principale et les constructions additionnelles.
- Conserver et tester les contrôles serveur déjà en place : un local du propriétaire avec un loyer doit être signalé ; un local du locataire sans loyer doit rester signalé.
- Ajouter ou adapter les tests ciblés pour les trois états : propriétaire, locataire et vacant.

## Vérification

- Contrôle du code et tests automatisés du formulaire CCC.
- Vérification visuelle sur mobile et ordinateur des cartes multi-locaux et du dépôt de contrat.
- Contrôle du récapitulatif et de la fiche administrateur pour confirmer les mêmes règles et libellés.
