# Traitement des alertes de sécurité

Le dernier scan ne compte plus 104 alertes mais **26** : 11 critiques, 15 avertissements. Les autres ont été réglées lors des audits précédents. Le plan traite les 26, par ordre de gravité.

## 1. Critiques : faux paiements (11 alertes)

Aujourd'hui, un utilisateur connecté peut faire passer en « payé » des frais qu'il n'a pas réglés. C'est possible pour la mutation, le titre foncier, l'expertise, les certificats, la radiation d'hypothèque et l'autorisation de bâtir. Il peut aussi agir sur le paiement d'une autre personne, ou choisir lui-même le prix au moment de payer.

Corrections :
- Un paiement ne passe à « payé » qu'après la confirmation du prestataire Mobile Money ou carte. La validation automatique simulée reste possible, mais seulement si le mode test est vraiment activé côté serveur.
- Pour chaque type de paiement, le serveur vérifie que la demande ou la facture appartient bien à la personne qui paie. Il refuse aussi tout montant différent du montant enregistré.
- Le prix de l'autorisation de bâtir est calculé par le serveur. Le montant envoyé par le navigateur n'est plus pris en compte.
- Le remboursement est réservé aux administrateurs : le serveur vérifie la connexion, le rôle et le statut du remboursement.

## 2. Services internes appelables par n'importe qui (6 alertes)

- Relevés de santé du système et vérification automatique des alertes : il faudra une clé secrète réservée aux tâches planifiées.
- Relance de facture : réservée aux administrateurs ou aux tâches planifiées. L'adresse e-mail et les détails de la facture n'apparaîtront plus dans les journaux.
- Test des identifiants du prestataire de paiement (2 alertes) : réservé aux administrateurs.
- Retour après paiement : le site de retour vient d'une liste d'adresses autorisées, plus de l'en-tête envoyé par le navigateur.

## 3. Exports tableur (7 alertes)

Un nom saisi dans un formulaire peut devenir une formule active quand un administrateur ouvre l'export dans Excel. Les cellules qui commencent par `=`, `+`, `-`, `@` ou une tabulation seront neutralisées dans tous les exports CSV : transactions, hypothèques, titres fonciers, lotissements (demandes et lots), déclarations fiscales.

## 4. Points à confirmer avec vous (2 alertes)

- **Tuiles de carte** : le service doit rester public, car la carte s'affiche sans compte. Je propose de limiter les requêtes par visiteur et d'accepter uniquement les appels venant de votre site. L'alerte sera ensuite marquée comme acceptée.
- **Serveur MCP public** : il ne donne accès qu'à des articles, des publications et la vérification de documents, qui sont déjà publics. Je propose de marquer l'alerte comme acceptée, sauf si vous préférez le fermer.

## Détails techniques

- `process-mobile-money-payment` : supprimer le `setTimeout` de complétion hors mode test (lecture de `cadastral_search_config.test_mode` côté serveur). Contrôle de propriété et de montant par `payment_type` (expertise_payments, mutation_requests, land_title_requests, mortgage cancellation, certificate_access, invoices).
- `create-payment` : montant de l'autorisation recalculé sur le serveur ; `return_url` limité à une liste d'adresses autorisées.
- `process-refund` : vérification du jeton de connexion, `has_role` admin/super_admin et garde de statut.
- `health-snapshot` et `system-alerts-check` : en-tête `x-cron-secret` comparé à un nouveau secret `CRON_SECRET`, transmis aussi par les tâches pg_cron.
- `send-invoice-reminder` et `test-payment-provider` : authentification et vérification du rôle admin (ou du secret cron), journaux expurgés.
- CSV : un helper partagé `sanitizeCsvCell` dans `src/utils/csvExport.ts`, appliqué aux 7 exports.
- `proxy-mapbox-tiles` : `enforceRateLimit` et contrôle de l'origine. MCP et Mapbox seront ensuite marqués comme acceptés, avec une justification.
- Après correction : nouveau scan, puis chaque alerte corrigée est marquée comme réglée.

## Pré-requis

Ces corrections modifient des fonctions en ligne. Il faut que votre base de données réponde à nouveau, alors qu'elle était hors ligne lors des derniers essais.
