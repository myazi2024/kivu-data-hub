# Audit et correction du système de notifications

## Constat vérifié (base + code)

Modèle : une seule table `notifications` (id, user_id, title, message, type, is_read, action_url, created_at, read_at). Pas de table de lecture séparée. 3 lignes en base, aucun doublon actuel.

### Bugs confirmés
1. **Temps réel inopérant** : la table `notifications` n'est pas dans la publication temps réel. L'abonnement de `useNotifications` ne reçoit donc jamais rien ; le badge ne bouge qu'au rechargement.
2. **Badge faux au-delà de 50** : le compteur est calculé sur les 50 dernières notifications chargées, pas sur le vrai nombre de non lues.
3. **Badge qui descend à tort** : « marquer comme lu » décrémente même si la notification était déjà lue ; la suppression lit une liste périmée.
4. **Deux instances concurrentes** : la cloche utilisateur et l'en-tête admin appellent chacun `useNotifications` (double chargement, double abonnement avec le même nom de canal, états non synchronisés entre eux et entre onglets).
5. **Toast rouge pour un simple avertissement** (`warning` affiché comme erreur).

### Risques de sécurité
6. **Création depuis le navigateur** : ~20 endroits insèrent directement (`usePermitPayment`, `AdminMortgages`, `AdminTaxDeclarations`, `AdminLandTitleRequests`, `AdminCCCContributions`, dialogs autorisation/expertise, `leaseContractNotice`, `cadastralValidation`, `UserDataControls`…). Un utilisateur peut se créer de fausses notifications « paiement confirmé » ; un admin peut écrire n'importe quoi à n'importe qui ; rien n'est atomique avec l'action métier (la décision passe, la notification peut échouer silencieusement).
7. **Modification libre** : la règle de mise à jour permet à l'utilisateur de réécrire titre, message, type et lien de ses notifications (seul `is_read`/`read_at` devrait changer).
8. **Aucune validation** : `type` libre, `action_url` peut pointer vers un site externe (risque d'hameçonnage via clic).
9. Règles en double (deux règles de suppression identiques).

### Conception / performance
10. Pas d'index `(user_id, created_at desc)` pour la liste ; pas de pagination (50 max, plus anciennes inaccessibles) ; aucune purge des notifications anciennes.
11. Pas de clé anti-doublon : un double clic ou une relance crée deux notifications.
12. Pas de mise à jour optimiste ni de retour arrière ; pas de resynchronisation au retour réseau / au retour sur l'onglet.

### UX
13. Pas de libellé accessible avec le nombre de non lues, pas de `aria-live`, pas de catégorie/priorité, bouton supprimer invisible au clavier sur desktop.

## Corrections proposées

### Base de données (une migration)
- Ajouter `notifications` à la publication temps réel.
- Contraintes : `type` limité à la liste, `action_url` limité aux chemins internes (commence par `/`), `is_read` non nul.
- Colonne `dedupe_key` + index unique `(user_id, dedupe_key)` : une même notification ne peut plus être créée deux fois.
- Index `(user_id, created_at desc)` ; supprimer l'index redondant et la règle de suppression en double.
- Remplacer la règle de mise à jour : l'utilisateur ne peut changer que `is_read`/`read_at` (déclencheur qui bloque toute autre modification hors admin).
- Retirer l'insertion directe par le navigateur ; RPC `notify_user` (admin uniquement, pour les envois manuels) et fonction serveur `_notify` utilisée par les RPC/déclencheurs métier existants (décisions CCC, mutations, hypothèques, taxes, titres, autorisations, paiements) dans la même transaction.
- RPC `get_unread_notification_count`, `mark_notification_read(id)` (renvoie si l'état a changé), `mark_all_notifications_read()`.
- Purge planifiée des notifications lues de plus de 180 jours.

### Code
- Remplacer les ~20 insertions directes : soit supprimées (la notification est déjà émise côté serveur par le RPC/déclencheur), soit déplacées dans le RPC métier correspondant, soit `notify_user` pour les actions admin manuelles.
- `useNotifications` réécrit avec React Query : une seule source partagée (cloche + en-tête admin), compteur réel via RPC, pagination « Charger plus », abonnement unique (INSERT/UPDATE/DELETE) avec déduplication par id, resynchronisation à la reconnexion et au retour sur l'onglet (couvre aussi plusieurs onglets / appareils), mise à jour optimiste avec retour arrière et message d'erreur.
- `NotificationBell` : `aria-label` avec le nombre, `aria-live` pour les nouvelles, bouton supprimer visible au focus, « Charger plus », toast neutre pour `warning`.
- `AdminNotifications` aligné sur les nouvelles RPC.

### Tests (matrice)
- Normaux : création → réception temps réel → badge +1 → lecture → badge −1.
- Limites : double clic lecture (badge −1 une seule fois), double soumission (une seule notification grâce à `dedupe_key`), perte réseau (retour arrière + resynchro), rechargement.
- Concurrence : deux onglets / deux appareils (lecture dans l'un → mise à jour dans l'autre), « tout lire » simultané.
- Charge : 100 / 1 000 / 10 000 notifications (compteur exact, pagination, temps de requête via l'index).
- Sécurité : lecture/modification/suppression d'une notification étrangère refusée ; changement d'id ; insertion directe refusée ; réécriture du message refusée ; lien externe refusé ; abonnement temps réel filtré par les règles d'accès.
- Tests unitaires du hook (fusion, déduplication, compteur jamais négatif) + tests SQL des RPC.

## Détails techniques
- Le temps réel Supabase respecte les règles d'accès : un utilisateur ne reçoit que ses lignes (les admins voient tout en lecture, le filtre `user_id` côté abonnement reste nécessaire).
- Le flag `has_role` reste la seule source pour les droits admin.
- Ordre : migration → RPC → remplacement des insertions → hook/UI → tests.
