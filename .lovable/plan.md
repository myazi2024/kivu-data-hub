# Revue du service « Litige foncier »

## Constats (vérifiés)

1. **Envoi de pièces jointes impossible** : les fichiers partent dans `land-disputes/<utilisateur>/…`, alors que les règles du stockage n'autorisent que les dossiers commençant par l'identifiant de l'utilisateur. Tout signalement avec document échoue, et toute levée aussi, car la levée exige au moins un document.
2. **Levée bloquée ou incohérente** :
   - La recherche du litige d'origine ne voit que les litiges signalés par l'utilisateur lui-même. Une partie adverse ne peut donc jamais demander la levée.
   - Le passage du litige d'origine en « Demande de levée » est fait par le navigateur. Seul un admin a le droit de le faire, donc ça échoue toujours, et la demande de levée reste créée sans lien.
   - Rien n'empêche deux demandes de levée sur le même litige.
3. **Indicateur « litige en cours » de la parcelle jamais mis à jour** : le navigateur tente de modifier la parcelle, mais il n'en a pas le droit. L'erreur passe inaperçue. Quand un admin lève un litige, l'indicateur ne revient pas non plus à « non ».
4. **Les admins ne reçoivent pas les notifications** : le navigateur d'un utilisateur ordinaire ne peut pas lire la liste des admins.
5. **Doublons** : le contrôle se fait dans le navigateur et ne voit que les signalements de l'utilisateur. Deux personnes peuvent donc signaler le même litige.
6. **Aucun contrôle côté serveur** : le statut, la nature, la date, la qualité du déclarant et la référence sont envoyés tels quels par le navigateur. La référence est générée avec `Math.random`.
7. **Suivi de la levée cassé** :
   - `lifting_status` n'est jamais renseigné, donc les statistiques de levées en attente restent à 0.
   - Quand l'admin approuve ou refuse une levée, le litige d'origine n'est pas mis à jour.
8. **Documents** : un lien signé valable 10 ans est enregistré au lieu du chemin du fichier.
9. **Code mort ou redondant** : `checkDuplicateDispute`, `checkDisputeAlreadyResolved`, `generateDisputeReference`, les notifications côté navigateur et la mise à jour directe de la parcelle.

## Corrections

**Serveur (une migration)**
- `submit_land_dispute_report(...)` contrôle chaque champ envoyé :
  - nature, qualité, rôles des parties et niveau de résolution, chacun dans sa liste autorisée ;
  - date non future et longueurs maximales ;
  - parcelle existante.
- Elle refuse aussi un litige actif de même nature sur la parcelle, quel que soit l'auteur.
- Le serveur génère la référence et fixe le statut `en_cours`. Il notifie le déclarant et les admins.
- `check_land_dispute_reference(parcelle, référence)` renvoie uniquement la nature, le statut et la date de début, sans aucune donnée personnelle. Toute partie peut ainsi vérifier une référence.
- `submit_land_dispute_lifting(...)` contrôle quatre points :
  - le litige d'origine existe sur la parcelle ;
  - il n'est ni levé, ni résolu, ni déjà en demande de levée ;
  - le motif et la qualité sont valides ;
  - au moins un document est joint.
- Elle crée ensuite la demande avec `lifting_status = pending` et passe le litige d'origine en « Demande de levée ». Les deux opérations se font ensemble, en une seule étape. Le déclarant et les admins sont notifiés.
- Un déclencheur de synchronisation :
  - recalcule l'indicateur de la parcelle après chaque création ou changement de statut ;
  - quand l'admin lève ou résout une levée, il applique le même statut au litige d'origine, avec `lifting_status = approved` ;
  - si l'admin refuse, le litige d'origine repasse « En cours ».
- L'ajout direct dans la table par les utilisateurs est retiré : tout passe par ces fonctions.

**Écran**
- Les fichiers sont envoyés dans `<utilisateur>/land-disputes/` et le serveur enregistre leur chemin. Les fichiers sont supprimés si le serveur refuse, et la vraie raison du refus s'affiche.
- La référence est affichée après envoi, puisque c'est le serveur qui la produit.
- Les documents s'ouvrent avec un lien signé à la demande, pour l'admin comme pour l'utilisateur. Les anciens liens restent lisibles.
- Le code mort et les appels directs du navigateur sont supprimés.
- Mode CCC intégré : aucun changement de comportement.
- Des tests sont ajoutés pour les règles partagées, et un compte rendu est ajouté au rapport d'audit.

## Hors périmètre
Les statuts restent en français (`en_cours`, `leve`…) pour rester compatibles avec l'admin, les statistiques et le CCC.
