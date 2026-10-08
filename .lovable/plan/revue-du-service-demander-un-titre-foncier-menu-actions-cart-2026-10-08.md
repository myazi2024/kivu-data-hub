# Revue du service « Demander un titre foncier » (menu Actions, carte cadastrale)

## Constats

1. **Données personnelles lues par le navigateur** : au choix d'une parcelle, le formulaire lit directement le nom, le téléphone et l'e-mail du propriétaire dans les contributions CCC et la fiche parcelle. Cela contredit la règle « identité du propriétaire uniquement après paiement ». En plus, ça ne marche pas pour un utilisateur ordinaire : il ne voit que ses propres contributions, donc le préremplissage échoue sans rien dire.
2. **Le montant à payer ne suit pas la même règle selon le moyen de paiement** : Mobile Money recalcule le montant avec le barème du jour, alors que la carte bancaire reprend le montant enregistré sur la demande. Si l'admin change le barème entre-temps, le paiement Mobile Money est refusé.
3. **Demande modifiable après création** : tant qu'elle n'est pas payée, l'utilisateur peut encore changer le type de titre, la superficie ou la zone. Le montant enregistré ne bouge pas, mais le dossier ne correspond plus à ce qui a été facturé.
4. **Paiement basé sur l'estimation du navigateur** : le montant envoyé au paiement est le total calculé à l'écran, pas celui fixé par le serveur. Aucun avertissement n'apparaît si les deux diffèrent.
5. **Demande impossible à reprendre** : si l'utilisateur ferme la fenêtre de paiement, la demande est annulée d'office. L'espace utilisateur ne permet ni de reprendre le paiement, ni d'annuler une demande en attente.
6. **Fichiers orphelins** : si un envoi de pièce jointe échoue en cours de route, les fichiers déjà envoyés restent stockés, et le message ne dit pas lequel a échoué.
7. **Aucun contrôle côté serveur des champs obligatoires** : nom, prénom, téléphone RDC, province, zone et type de titre ne sont vérifiés que dans le navigateur.
8. **Code mort / redondances** : `fee_items`, `payment_status`, `selectedFees` et `totalAmountOverride` sont envoyés mais ignorés par le serveur. Il reste un commentaire `toggleFee removed`. La table des types de titre est dupliquée dans le navigateur (`TITLE_TYPE_MAPPING`) alors que le serveur a la sienne (`map_land_title_type_key`).
9. **Fichier trop long** : la fenêtre du formulaire fait 1377 lignes, au-delà de la limite de 1000 du projet.

## Corrections

**Serveur (migration)**
- Nouvelle fonction `get_land_title_parcel_prefill(parcel_number)` réservée aux connectés. Elle renvoie seulement la localisation, la superficie, les côtés et bornes, la construction et l'état des autorisations de bâtir. Elle ne renvoie jamais le nom, le téléphone ni l'e-mail du propriétaire, comme pour la mutation.
- `enforce_land_title_request_insert` : vérifie les champs obligatoires (noms, téléphone au format RDC, province, zone SU/SR, type de titre) et refuse une demande à 0 $.
- `enforce_land_title_request_update` : bloque aussi, pour l'utilisateur, le type de titre, la superficie, la zone et la localisation après création.

**Fonctions de paiement**
- `process-mobile-money-payment` : compare le montant au `total_amount_usd` enregistré, comme le paiement par carte.

**Formulaire**
- Préremplissage via la nouvelle fonction. Le demandeur saisit lui-même l'identité du propriétaire.
- Après création, le paiement se fait au montant renvoyé par le serveur, avec un avertissement si l'estimation affichée diffère.
- Fermer la fenêtre de paiement n'annule plus la demande : elle reste « en attente de paiement ».
- Envoi des pièces : en cas d'échec, les fichiers déjà envoyés sont supprimés et le message nomme la pièce en cause.
- Suppression des champs ignorés et des commentaires morts. L'estimation des frais s'appuie sur une seule correspondance des types de titre, alignée sur celle du serveur.
- Découpage : préremplissage, envoi et état du formulaire sortis dans des fichiers dédiés, pour passer sous 1000 lignes.

**Espace utilisateur**
- Pour une demande non payée : bouton « Reprendre le paiement » (Mobile Money au montant enregistré) et bouton « Annuler » (fonction serveur déjà en place).

**Suivi**
- Tests sur la correspondance des types de titre et sur la validation du téléphone.
- Compte rendu ajouté au rapport d'audit de la carte cadastrale. Règle ajoutée dans les notes du projet.

## Détails techniques
- Les politiques d'accès actuelles restent en place (lecture et insertion par le propriétaire de la demande, mise à jour uniquement si en attente et non payée). Les nouvelles règles passent par des déclencheurs côté serveur.
- La fonction de préremplissage s'exécute avec des droits élevés, avec `SET search_path = public`. Elle n'est accessible qu'aux connectés et ne lit que des colonnes non personnelles de la parcelle, ainsi que de la dernière contribution approuvée.
- Le webhook Stripe et la création du paiement par carte ne changent pas : ils utilisent déjà le montant enregistré.
