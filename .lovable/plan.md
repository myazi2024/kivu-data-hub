# Revue du service « Ajouter une autorisation » (menu Actions, carte cadastrale)

## Constats

1. **Pièce jointe toujours refusée** : le fichier est envoyé dans un dossier `permit-documents/<utilisateur>/...`, mais les règles de stockage n'autorisent un utilisateur à écrire que dans un dossier qui commence par son propre identifiant. Joindre un document fait donc échouer tout l'envoi, avec un message générique « Erreur lors de l'enregistrement ».
2. **Une autorisation approuvée n'arrive jamais sur la parcelle** : le formulaire envoie ses champs dans un format (`permitNumber`, `issueDate`, `validityMonths`, `documentUrl`…) que la règle d'approbation du serveur ne lit pas. Elle attend `permit_number`, `issue_date`, `validity_period_months`, `permit_document_url`. Une fois approuvée par l'admin, l'autorisation n'est donc pas ajoutée aux autorisations de la parcelle.
3. **Contrôle des doublons inefficace** : il est fait dans le navigateur, qui ne voit que les propositions de l'utilisateur lui-même. Il ignore les autorisations déjà enregistrées sur la parcelle et celles soumises par d'autres. S'il échoue, l'envoi continue sans rien signaler.
4. **Aucun contrôle côté serveur** : le format du numéro, la date (pas dans le futur), la durée de validité (6, 12, 24 ou 36 mois) et le type (bâtir / régularisation) ne sont vérifiés que dans le navigateur. Le statut « Valide / Expiré » est calculé par le navigateur, en libellés français.
5. **Notification falsifiable** : la notification « soumise » est créée par le navigateur.
6. **Lien du document instable** : le formulaire enregistre un lien signé à durée limitée au lieu du chemin du fichier. Le lien finit par expirer.
7. **Incohérences d'affichage** : sur le récapitulatif, la date d'expiration utilise 12 mois par défaut alors que le calcul utilise 36. Le toast annonce « enregistrée » alors que la demande est seulement en attente de validation.
8. **Code mort / redondances** : la donnée de parcelle transmise au formulaire n'est jamais utilisée. Le mode « fenêtre autonome » (et son bouton WhatsApp) n'est utilisé nulle part, car le formulaire n'est ouvert qu'intégré. La fermeture passe par `window.confirm` au lieu de la boîte de confirmation de l'application.
9. **Même défaut dans le CCC** : les autorisations envoyées par le formulaire CCC n'incluent pas le service émetteur. À l'approbation, le type d'autorisation est enregistré à la place du service.

## Corrections

**Serveur (migration)**
- Nouvelle fonction `submit_building_permit_contribution(...)`, réservée aux connectés. Elle :
  - vérifie que la parcelle existe ;
  - valide le numéro (même format que le formulaire), la date (pas dans le futur), la validité (6, 12, 24 ou 36) et le type ;
  - refuse un numéro déjà enregistré sur la parcelle ou déjà proposé par n'importe quel utilisateur (en attente ou approuvé) ;
  - calcule elle-même le statut administratif (valide / expiré) ;
  - crée la proposition « en attente » au format attendu par l'approbation, avec le chemin du document ;
  - envoie elle-même la notification de soumission.
- Les données saisies sont enregistrées sans être réinterprétées. Le document n'est accepté que s'il se trouve dans le dossier de l'utilisateur.

**Formulaire**
- Envoi du fichier dans `<utilisateur>/permit-documents/...`, le dossier autorisé, puis soumission via la nouvelle fonction. Si la soumission échoue, le fichier envoyé est supprimé et l'erreur du serveur est affichée telle quelle (doublon, date, etc.).
- Suppression du contrôle de doublon fait dans le navigateur, de la notification envoyée par le navigateur et du statut calculé localement. L'aperçu affiche une estimation cohérente, toujours sur la durée choisie.
- Toast « Autorisation soumise pour validation ».
- Suppression de la donnée de parcelle inutilisée, du mode fenêtre autonome et du bouton WhatsApp associé. Confirmation de fermeture par la boîte de dialogue de l'application.

**Lecture du document**
- La carte « autorisation » de l'espace utilisateur ouvre le document via un lien signé généré à la demande (chemin stocké). Les anciens liens restent compatibles.

**CCC**
- Ajout du service émetteur dans les autorisations envoyées par le formulaire CCC.

**Suivi**
- Tests sur le format du numéro et sur l'estimation du statut.
- Compte rendu dans le rapport d'audit de la carte cadastrale et règle dans les notes du projet.

## Détails techniques
- La fonction s'exécute avec des droits élevés et `SET search_path = public`. Exécution accordée à `authenticated` uniquement. Elle insère dans `cadastral_contributions` (`contribution_type = 'update'`, `status = 'pending'`) en clés snake_case : `permit_type`, `permit_number`, `issue_date`, `validity_period_months`, `issuing_service`, `administrative_status`, `permit_document_url`, `is_current`.
- Le chemin du document doit commencer par `auth.uid()`, ce qui correspond aux règles de stockage existantes : aucune nouvelle règle de stockage n'est nécessaire.
- Les déclencheurs existants (normalisation, score anti-fraude, synchronisation à l'approbation) s'appliquent sans changement.
