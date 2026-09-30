# Audit et optimisation de l'espace admin

## Objectif
Passer en revue les modules de l'espace admin (écran et serveur), documenter les problèmes trouvés et les corriger, sans ajouter de nouvelle fonctionnalité.

## Méthode (même démarche que pour l'espace utilisateur)
1. **Inventaire** : relier chaque module du menu latéral à son écran ; repérer les écrans jamais atteignables et les fichiers jamais utilisés.
2. **Contrôles automatiques sur tout l'admin** :
   - erreurs de chargement avalées sans message ;
   - chargements qui repartent inutilement ;
   - usage de `Math.random` pour les fichiers ;
   - terme « Permis » encore affiché ;
   - statuts en français enregistrés en base ;
   - modifications directes de table là où une fonction serveur sécurisée existe.
3. **Serveur** :
   - droits d'accès des tables admin : réservées aux administrateurs, aucune règle trop ouverte ;
   - fonctions serveur sensibles : vérification du rôle.
4. **Revue ciblée par groupe de modules** :
   - Demandes et procédures : CCC, mutations, titres fonciers, expertises, autorisations, morcellements, hypothèques, recours ;
   - Facturation et paiements : factures, refacturation, moyens de paiement, remboursements ;
   - Utilisateurs, rôles, sécurité, fraude, RH ;
   - Configuration : carte, apparence, analyses, certificats, modèles de facture, mode test ;
   - Historiques, audit, tableau de bord.
5. **Corrections** : d'abord la sécurité et les données fausses, puis les bugs, le code mort et la performance.
6. **Vérification** : contrôle de types, tests automatiques, ouverture de chaque module dans le navigateur avec un compte admin si une session peut être créée (sinon, signalé comme non vérifié).

## Livrables
- Rapport `docs/reports/AUDIT_ADMIN_SPACE.md` : problèmes par module, gravité, correction appliquée, points restés ouverts.
- Corrections appliquées dans le code et, si besoin, par migration.

## Hors périmètre
- Les 101 alertes de sécurité générales de la base : elles seront listées, et traitées seulement si elles concernent l'admin.
- Aucune refonte visuelle.

## Détails techniques
- Environ 128 fichiers à la racine de `src/components/admin` et 32 sous-dossiers (35 000 lignes à la racine). `AdminSubdivisionZoningRules.tsx` fait 1 400 lignes : à découper selon la règle des 1 000 lignes.
- Menu : `sidebarConfig.ts` et `Admin.tsx` (onglets, fil d'Ariane).
- Standards : RPC SECURITY DEFINER avec `search_path = public`, `has_role`, décisions admin par RPC atomiques, `AlertDialog` pour les actions destructives, react-query avec invalidation via `useAdminAnalytics`.
