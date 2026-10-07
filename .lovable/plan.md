# Revue du service « Demande de mutation » (menu Actions, carte cadastrale)

## Problèmes constatés (vérifiés dans le code et la base)

### 1. Montant à payer fixé par le navigateur (critique)
Le formulaire calcule lui-même le total (frais fixes, droits de mutation de 3 % ou 1,5 %, frais bancaires, pénalités de retard) puis l'enregistre tel quel. Aucun contrôle serveur n'existe à la création : les fonctions de paiement vérifient seulement que le montant payé égale le montant enregistré. Un utilisateur peut donc enregistrer 1 $ et payer 1 $. Il peut aussi créer directement une demande déjà « payée » ou « approuvée » : la protection du statut de paiement ne s'applique qu'aux modifications, pas à la création.

### 2. Données personnelles exposées par le préremplissage
La fonction qui préremplit les dates (date du titre, date d'acquisition) renvoie aussi le nom du propriétaire actuel et la référence du titre à tout utilisateur connecté, pour n'importe quelle parcelle. Le formulaire n'utilise que les deux dates.

### 3. Incohérence sur l'expropriation
L'expropriation est traitée comme un transfert : le formulaire exige un certificat d'expertise et une valeur vénale, alors que la liste des pièces requises pour ce type ne mentionne pas de certificat. Le blocage ne correspond pas à ce qui est affiché.

### 4. Contrôles manquants sur le certificat d'expertise
Une date de délivrance future est acceptée. La validité de 6 mois et le seuil de 10 000 $ ne sont vérifiés que dans le navigateur.

### 5. Envoi des pièces jointes
Si l'envoi d'un fichier échoue au milieu, les fichiers déjà envoyés restent orphelins. De plus, la demande n'est pas créée, mais aucun message ne dit quel fichier a échoué.

### 6. Redondances et code mort
- La validation du numéro Mobile Money est une copie locale, alors qu'un validateur RDC partagé existe déjà.
- Le hook garde un champ `profile` inutilisé.
- Le chargement des demandes ne se relance pas quand on change d'environnement test/production.
- Plusieurs icônes et composants importés ne sont pas utilisés dans le formulaire.

## Corrections prévues

### Côté serveur
- Ajouter un contrôle à la création d'une demande qui :
  - force le statut « en attente » et le paiement « en attente » ;
  - recalcule les frais fixes depuis la grille active (frais obligatoires, plus les frais optionnels cochés) ;
  - recalcule les droits de mutation selon la valeur vénale et l'ancienneté du titre, puis les frais bancaires (exemptés pour les titres de 10 ans et plus) ;
  - recalcule les pénalités de retard depuis la date d'acquisition de la parcelle, ou la date déclarée si la parcelle n'en a pas (0,45 $/jour après 20 jours, plafonnées à 500 $) ;
  - vérifie le certificat pour les types qui l'exigent : date non future, moins de 6 mois, valeur vénale positive ;
  - écrase le détail et le total envoyés par le navigateur.
- Réduire le préremplissage aux seules dates utiles, sans nom ni référence de titre.

### Côté formulaire
- Afficher le montant renvoyé par le serveur à l'étape de paiement, avec un avertissement si un écart apparaît.
- Aligner l'expropriation : pas de certificat exigé, comme l'indique sa liste de pièces. Le même barème est appliqué côté serveur.
- Refuser une date de certificat future.
- En cas d'échec d'envoi, supprimer les fichiers déjà envoyés et nommer le fichier en cause.
- Retirer les redondances et le code mort listés ci-dessus.

## Détails techniques
- Migration : fonction `enforce_mutation_request_insert()` (`SECURITY DEFINER`, `SET search_path = public`) en `BEFORE INSERT` sur `mutation_requests`. Elle ignore le `service_role` (générateurs de test). Elle réécrit `fee_items`, `total_amount_usd`, `mutation_fee_amount`, `bank_fee_amount`, `late_fee_amount`, `late_fee_days`, `status`, `payment_status`, et lève une exception sur un certificat invalide. Les frais optionnels sont lus depuis les `fee_id` reçus, filtrés sur `is_active`.
- Barème partagé avec le formulaire : types de transfert, types sans pénalité, 3 % / 1,5 %, 0,5 %, seuil de 10 000 $, 0,45 $/jour, délai de 20 jours, plafond de 500 $. Ces valeurs sont recopiées à l'identique dans la fonction SQL ; un test front vérifie la cohérence du calcul client.
- `get_parcel_mutation_prefill` renvoie uniquement `title_issue_date` et `current_owner_since`.
- `MutationConstants.ts` : `expropriation` reste un transfert (bénéficiaire), mais sort des types exigeant un certificat (`requiresExpertiseCertificate`).
- `useMutationRequest` : l'insertion ne transmet plus le total ; on retire `profile` et l'on ajoute `isTestRoute` aux dépendances. `MutationRequestDialog` utilise `isValidDrcMobileNumber` et l'on retire les imports inutilisés.
- Upload : chemins `crypto.randomUUID()`, rollback via `storage.remove` en cas d'échec.
- Vérification : typecheck, `vitest`, test d'insertion SQL (montant falsifié réécrit, statut « payé » refusé), ajout d'une règle dans `AGENTS.md`.
