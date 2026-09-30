# Audit et optimisation de l'espace utilisateur

## Objectif
Passer en revue chaque rubrique de l'espace utilisateur (écran et serveur), documenter les problèmes trouvés, puis les corriger sans ajouter de nouvelle fonctionnalité.

## Rubriques auditées (une par une)
1. Tableau de bord et navigation (menu latéral, recherche, fil d'Ariane, tiroir mobile, anciennes adresses)
2. Profil et en-tête
3. Sécurité du compte et préférences
4. Notifications (cloche et liste)
5. Contributions CCC et demandes de modification
6. Autorisations de bâtir
7. Demandes de titre foncier
8. Mutations
9. Morcellements (lotissements)
10. Expertises immobilières
11. Hypothèques
12. Litiges fonciers
13. Factures et paiements (finance)
14. Documents et données personnelles

## Pour chaque rubrique, vérifier
- Bugs : erreurs d'affichage, chargements qui ne finissent pas, erreurs non affichées, boutons sans effet
- Logique : statuts incohérents, compteurs faux, filtres ou tris erronés, actions permises à tort
- Orphelins : écrans, boutons ou fichiers inaccessibles ou jamais utilisés
- Code mort ou dupliqué : fonctions de chargement répétées, composants en double
- Optimisations : requêtes en double, pagination, droits d'accès côté serveur (chaque utilisateur ne voit que ses données), lisibilité sur téléphone

## Livrables
- Rapport `docs/reports/AUDIT_USER_SPACE.md` : liste des problèmes par rubrique, gravité, correction appliquée
- Corrections appliquées dans la foulée, en priorité les problèmes de sécurité et de données fausses
- Vérification finale : tests automatiques, contrôle de types, parcours dans le navigateur sur ordinateur et téléphone avec un compte utilisateur

## Détails techniques
- Périmètre code : `src/pages/UserDashboard.tsx`, `src/components/user/**` (dashboard, contributions, building-permits, finance, data, assets), hooks associés.
- Serveur : relire les policies RLS et RPC des tables lues par l'espace (cadastral_contributions, ccc_correction_requests, notifications, cadastral_invoices, payment_transactions, *_requests, user_preferences, profiles, user_sessions) ; vérifier que chaque lecture/écriture est limitée à `auth.uid()` et que les paiements ne sont jamais insérés par le client.
- Standards du projet respectés : statuts EN en base, terme « Autorisation », `crypto.randomUUID()` pour les fichiers, couleurs sémantiques, dialogues > 1000 lignes modularisés, RPC SECURITY DEFINER avec `search_path = public`.
- Chargement partagé via react-query (clés uniques par module) pour supprimer les requêtes en double.
- Aucune modification des écrans admin sauf si une correction commune l'exige.
- Toute correction serveur passe par une migration ; aucune donnée réelle supprimée.
