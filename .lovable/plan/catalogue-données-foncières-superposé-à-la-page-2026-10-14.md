# Catalogue Données foncières superposé à la page

## Objectif
Au clic sur **« Demander l’accès »**, ouvrir le catalogue **au-dessus de la page Données foncières**, sans quitter celle-ci, avec la même présentation que le catalogue des services cadastraux.

## Refonte prévue
1. **Ouverture superposée**
   - Conserver la page et ses captures en arrière-plan, avec un fond assombri.
   - Reprendre le cadre du catalogue des services : fenêtre centrée sur ordinateur, adaptée à toute la largeur sur mobile, en-tête compact et bouton Fermer visible.
   - Limiter le défilement au contenu du catalogue ; la page de découverte reste sur un seul écran.
   - Ne pas fermer sur un clic à l’extérieur. À la fermeture, conserver les sélections du panier et remettre le focus sur le bouton d’ouverture.

2. **Présentation identique aux services, adaptée aux données**
   - Garder les onglets des analyses et la sélection par visuel.
   - Remplacer les lignes actuelles avec grands boutons « Ajouter au panier » par des éléments sélectionnables comme les services : icône, nom, prix avec devise explicite, case à cocher et détails dépliables.
   - Afficher dans les détails la description et la durée d’accès ; signaler les achats encore valides et empêcher leur ajout.
   - Reprendre les états de sélection, les bordures, les espacements et la hiérarchie du catalogue de référence, sans modifier ce dernier.
   - Garder l’ajout de tout un onglet et présenter un récapitulatif compact du panier avec total et accès au paiement, toujours facilement accessible.
   - Réutiliser le sélecteur de devise existant pour l’affichage ; les montants de référence et le paiement restent en USD.

3. **Conserver le parcours d’achat**
   - Garder un panier Données foncières indépendant du panier cadastral.
   - Conserver Mobile Money, carte bancaire et simulation autorisée par le mode test.
   - Maintenir l’adresse `/donnees-foncieres/catalogue` pour les liens directs et les retours de paiement, en réutilisant le même catalogue plutôt qu’une seconde présentation.
   - Après confirmation du paiement, actualiser les accès existants sans attribuer de droits uniquement à partir d’un message de retour bancaire.

## Détails techniques
- Extraire le contenu de `LandDataCatalog.tsx` dans des éléments dédiés réutilisables : catalogue, ligne de visuel, récapitulatif et paiement.
- Utiliser un dialogue accessible pour reproduire l’apparence de `CadastralResultsDialog`, avec gestion du focus et empilement correct du paiement.
- Remplacer le lien « Demander l’accès » de `LandDataAccessDenied` par l’ouverture du dialogue. Utiliser le même catalogue pour « Acheter d’autres visuels ».
- Conserver les sources de configuration des onglets et visuels ; respecter leurs titres, leur ordre et leur visibilité lors de la composition de la liste.
- Aucun changement des tables, tarifs, durées, règles d’accès ou fonctions de paiement côté serveur. Ne pas importer les règles fiscales ou remises propres au catalogue cadastral.

## Vérification
- Tester ouverture sans navigation, fermeture/réouverture avec panier conservé, sélection individuelle et groupée, achats existants, catalogue vide et erreur de chargement.
- Vérifier le paiement et ses retours, sans doublon de fenêtres ni effacement du panier à l’annulation.
- Contrôler sur ordinateur et mobile les titres longs, les onglets, les devises, le total visible et le défilement interne.
- Vérifier clavier, focus et nom accessible des commandes. Les contrôles authentifiés sur Supabase externe seront signalés comme non vérifiés si aucune session exploitable n’est disponible.