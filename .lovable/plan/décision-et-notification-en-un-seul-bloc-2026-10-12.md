# Décision et notification en un seul bloc

## Constat
Plusieurs écrans admin enregistrent la décision depuis le navigateur, puis envoient la notification dans un second appel séparé, sans bloquer en cas d'échec :
- **Hypothèques** (`AdminMortgages`) : approbation, rejet, renvoi. L'approbation crée aussi l'hypothèque ou la passe à « payée » dans des appels distincts. Si l'un échoue, la demande est quand même approuvée.
- **Déclarations de taxe** (`AdminTaxDeclarations`) : l'historique fiscal est inséré ligne par ligne, puis le statut change, puis la notification part. Chaque étape peut échouer seule.
- **Titres fonciers** (`AdminLandTitleRequests`) et **autorisations** (`PermitRequestDialog`) suivent le même schéma.

## Correction
Chaque décision passe par une seule fonction serveur. Elle vérifie le rôle admin et le statut actuel, applique la décision et ses effets, écrit le journal d'audit et crée la notification. Tout est enregistré ensemble : si une étape échoue, rien n'est enregistré et l'admin voit l'erreur.

1. `process_mortgage_decision(id, action, motif)` avec les actions approve, reject et return. L'approbation crée l'hypothèque, ou la passe à `paid` pour une radiation.
2. `process_tax_declaration_decision(id, action, motif)` : l'approbation copie l'historique fiscal avec un statut EN (`pending`/`paid`), puis approuve la déclaration.
3. `process_land_title_decision(...)` et `process_permit_decision(...)` : même principe, en réutilisant les validations déjà en place.
4. Les notifications sont créées par la fonction serveur interne `_notify`, avec une clé anti-doublon (`<type>:<id>:<action>`). Un double clic ne crée donc pas deux notifications.

## Écrans
- Les quatre écrans appellent la fonction correspondante. Les insertions et mises à jour directes, les appels `insertNotification` et l'écriture du journal d'audit depuis le navigateur sont supprimés.
- Si la demande a déjà été traitée, l'admin voit un message clair.
- Les suivis analytiques admin ne changent pas.

## Hors périmètre (inchangé)
Les envois manuels admin (`AdminNotifications`), le blocage d'utilisateurs et les notifications que l'utilisateur s'envoie lui-même gardent `notify_user`. Ce ne sont pas des décisions sur une demande.

## Vérifications
- Tests SQL des fonctions : refus pour un non-admin, refus si la demande est déjà traitée, retour arrière complet en cas d'échec, une seule notification après deux appels.
- Vérification des types, tests et build. Ajout de la règle dans AGENTS.md.

## Détails techniques
- Fonctions en SECURITY DEFINER avec `SET search_path = public`. Elles vérifient `has_role(auth.uid(), 'admin'|'super_admin')` et verrouillent la ligne (`FOR UPDATE`) pour contrôler le statut. EXECUTE est accordé à `authenticated` uniquement.
- `_notify` n'est pas exécutable par le navigateur.
- Avant la migration, je vérifierai les colonnes réelles de `cadastral_mortgages`, `cadastral_tax_history`, `land_title_requests` et des autorisations, ainsi que les RPC de décision existantes pour éviter les doublons.
