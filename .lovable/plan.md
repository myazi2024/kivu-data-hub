# Refonte du panier de la carte cadastrale

## Choix retenu pour le paiement
On garde le paiement **parcelle par parcelle**, en le rendant plus fiable. C'est le choix le plus sûr : chaque achat donne accès aux données d'une seule parcelle, le serveur vérifie déjà les montants parcelle par parcelle, et un échec de paiement ne bloque pas les autres parcelles.

## Problèmes relevés
1. Le bouton « Compléter le dossier » suggère des services à partir d'une localisation fictive (« unknown »). Il peut donc proposer des services sans données, ou en cacher qui sont disponibles. Ce n'est pas la même règle que dans le catalogue, qui se base sur les indicateurs de disponibilité du serveur.
2. Deux mécanismes alignent les prix sur le catalogue (dans le panier et dans le panneau de facturation). Ils peuvent se contredire.
3. Après un paiement, le panier vide toute la parcelle active. Si une partie seulement des services a été payée, des services non payés disparaissent. En parallèle, une seconde purge refait la même vérification côté serveur.
4. Le badge « Déjà acheté » et la purge interrogent le serveur chacun de leur côté, avec des règles d'expiration dupliquées.
5. Code mort dans le panier : remise à zéro complète, compteur de services de la parcelle active et compteur d'achats par parcelle jamais utilisés ; mise à jour des prix en double ; ancien format de sauvegarde (v1) encore migré.
6. À vérifier pendant l'implémentation :
   - l'envoi du brouillon de panier vers le serveur pourrait effacer les codes promo enregistrés ;
   - le serveur doit recalculer lui-même le prix et le code promo de chaque service au moment du paiement ;
   - le panier des publications pourrait s'afficher en même temps que le panier cadastral sur la carte.

## Ce que fera le nouveau panier
- Les services sont regroupés par parcelle puis par catégorie (consultation, fiscal, juridique…), avec le prix du catalogue en vigueur.
- Chaque service affiche son état : disponible, déjà acquis (avec la date de fin d'accès si elle existe), ou retiré du catalogue (retiré automatiquement du panier, avec un message).
- « Compléter le dossier » ne propose que les services réellement disponibles pour la parcelle, selon la même règle que le catalogue.
- Le code promo reste par parcelle. Il est revérifié à l'ouverture du panier, et le montant final est confirmé par le serveur.
- Le paiement d'une parcelle ne retire du panier que les services réellement payés, après confirmation du serveur.
- Le panier est synchronisé entre appareils pour les utilisateurs connectés, sans perdre les codes promo.

## Étapes
1. Vérifier les points restés ouverts (point 6), puis corriger ce qui doit l'être côté serveur dans une nouvelle migration ou fonction.
2. Créer une seule source pour les « services déjà acquis » (avec leur date d'expiration), utilisée à la fois pour les badges et pour la purge.
3. Simplifier le panier : un seul alignement sur le catalogue, et suppression des fonctions mortes et de l'ancien format.
4. Revoir l'affichage du panier : regroupement par catégorie, états des services, suggestions fiables, adaptation mobile (cibles tactiles de 44 px).
5. Après paiement, purger uniquement les services confirmés comme payés par le serveur.
6. Ajouter des tests (synchronisation avec le catalogue, purge partielle, suggestions, codes promo), puis lancer le contrôle du code, le build et la suite complète.

## Détails techniques
- Fichiers principaux : `useCadastralCart.tsx`, `useCartAccessCheck.tsx`, `useCartDiscounts.tsx`, `CadastralCartButton.tsx`, `cart/CartParcelDiscountInput.tsx`, `CadastralBillingPanel.tsx`, `useCadastralPayment.tsx`, fonction `create-payment`, RPC `upsert_cadastral_cart_draft`.
- Les suggestions réutilisent la logique de disponibilité du catalogue (indicateurs `data_availability` côté serveur), pas les historiques protégés.
- Le navigateur ne crée jamais de transaction ; les montants sont toujours recalculés par le serveur.
- Vérification visuelle limitée : la carte cadastrale demande une connexion et le backend est externe. La validation reposera sur le code et les tests.
