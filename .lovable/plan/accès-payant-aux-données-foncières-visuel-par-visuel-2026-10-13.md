# Accès payant aux Données foncières, visuel par visuel

## Objectif
Les profils non habilités peuvent acheter l'accès à certains visuels de Données foncières. « Demander l'accès » ouvre un nouveau catalogue, distinct du catalogue de la carte cadastrale : un onglet par analyse, des visuels à cocher, un panier puis un paiement.

## Parcours utilisateur
1. Page de découverte → « Demander l'accès » ouvre le **Catalogue des données** (`/donnees-foncieres/catalogue`).
2. Onglets identiques à ceux d'Analytics (Titres, Parcelles, Location et valeur, etc.). Chaque visuel affiche son nom, une courte description, son prix (USD/CDF) et la durée d'accès. Le bouton « Ajouter au panier » devient « Déjà acheté » si l'accès est en cours. Un bouton « Tout l'onglet » est aussi proposé.
3. Panier propre à ce catalogue (bouton flottant, liste, total, retrait d'un visuel). Il ne se mélange pas au panier de la carte cadastrale.
4. Paiement avec les moyens déjà en place (Mobile Money et carte bancaire). Le mode test reste simulé côté serveur.
5. Après paiement, l'utilisateur entre dans Données foncières et **ne voit que les visuels achetés et encore valides**. Les onglets sans aucun visuel acheté sont masqués. Un lien « Acheter d'autres visuels » renvoie au catalogue.
6. À expiration, le visuel disparaît. Le catalogue le propose à nouveau.

Les profils déjà habilités gardent un accès complet, sans changement.

## Espace admin — nouvel écran « Catalogue Données foncières »
- Liste de tous les visuels par onglet, à partir de la même liste que celle d'Analytics.
- Pour chaque visuel : prix en USD, actif/inactif (en vente ou non), description courte.
- Durée d'accès réglable (en jours), globale avec possibilité de la changer par visuel.
- Vue des achats : utilisateur, visuels, montant, date d'expiration.
- Actions groupées : appliquer un prix à tout un onglet.

## Règles
- Les prix et la durée sont toujours recalculés par le serveur. Le montant envoyé par le navigateur n'est jamais pris en compte.
- L'accès n'est créé qu'après confirmation du paiement (ou simulation en mode test), jamais par le navigateur.
- Un visuel déjà acheté et valide ne peut pas être payé une seconde fois. Un rachat après expiration est possible.
- Les visuels non achetés ne reçoivent aucune donnée : ils ne sont pas seulement masqués à l'écran.

## Détails techniques
- Tables : `analytics_visual_catalog` (tab_key, item_key, price_usd, access_days nullable, is_active, description), `analytics_catalog_settings` (default_access_days), `analytics_visual_invoices` (user, items, total serveur, status), `analytics_visual_access` (user_id, tab_key, item_key, expires_at, invoice_id). GRANT + RLS : lecture du catalogue actif pour les utilisateurs connectés, accès en lecture seule pour son propriétaire, écriture réservée à l'admin et au service.
- RPC `create_analytics_visual_invoice(items)` : prix serveur, exclusion des accès valides, facture en attente. RPC `get_my_analytics_access()` : liste des clés valides.
- `process-mobile-money-payment`, `create-payment`/`stripe-webhook` et `record-test-payment` : nouveau `payment_type = 'analytics_access'` ; à la confirmation, insertion idempotente dans `analytics_visual_access` avec `expires_at = now() + durée`.
- Front : `LandDataAccessGate` laisse entrer un profil non habilité s'il possède au moins un accès valide ; `useAnalyticsAccess` combiné à `isChartVisible` filtre les onglets et visuels ; nouveau `useAnalyticsCart` (stockage séparé `bic-analytics-cart`) ; page catalogue et écran admin modularisés.
- Limite connue : les données d'Analytics sont aujourd'hui chargées par le navigateur avec les droits du profil. La protection serveur visuel par visuel exige que les lectures des profils acheteurs passent par une RPC qui vérifie `analytics_visual_access`. Cette étape sera faite onglet par onglet ; jusque-là, le filtrage côté écran s'applique.
- Tests : calcul de facture (exclusion des accès valides, prix serveur), filtrage des visuels, expiration.

## Non inclus
- Aucun changement au catalogue ni au panier de la carte cadastrale.
- Aucun nouveau prestataire de paiement.
