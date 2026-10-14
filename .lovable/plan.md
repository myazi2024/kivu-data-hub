# Aligner exactement les deux catalogues

## Objectif
Reprendre le design du catalogue des services pour le catalogue Données foncières, sur ordinateur et mobile, plutôt que proposer une présentation seulement similaire. Conserver l’ouverture au-dessus de la page.

## Écarts confirmés
- Les services utilisent une ligne compacte : icône, nom, chevron, prix et case de sélection. Le catalogue Données foncières répartit actuellement ces éléments sur deux lignes sur mobile et ajoute un libellé « Graphique » sous le titre.
- Le bloc de sélection groupée des services présente un titre, un résumé, un badge de disponibilité et un bouton pleine largeur. Celui des données utilise une autre disposition.
- Le catalogue des services affiche la devise, le récapitulatif, le total et un bouton de paiement pleine largeur. Celui des données utilise un pied fixe avec le total et le bouton côte à côte.
- La fenêtre de référence occupe tout l’écran sur mobile ; celle des données conserve une marge extérieure.

## Modifications prévues
1. **Même cadre** : reprendre les dimensions, marges, arrondis et emplacement de fermeture du catalogue de référence ; plein écran sur mobile, fenêtre centrée sur ordinateur, défilement interne et page d’origine conservée.
2. **Mêmes lignes** : même disposition compacte, taille des icônes, typographie, bordures, ombres, prix et chevron. Supprimer la deuxième ligne permanente « Graphique / Indicateur » ; placer cette information dans les détails. Un titre trop long sera tronqué comme dans les services, mais restera intégralement lisible dans les détails et accessible aux lecteurs d’écran.
3. **Même sélection** : sélectionner en cliquant sur la ligne, sans que le chevron de détails modifie la sélection ; conserver une commande clavier accessible et empêcher l’ajout d’un visuel déjà acheté.
4. **Même sélection groupée** : reprendre le bloc « dossier complet » avec un titre adapté à l’onglet, le nombre de visuels, le montant et un bouton pleine largeur « Tout ajouter / Compléter / Tout retirer ».
5. **Même récapitulatif** : reprendre la hiérarchie de la devise, du nombre sélectionné et du total, puis un bouton de paiement pleine largeur sous le total. Retirer le pied fixe actuel pour retrouver la composition du catalogue des services. Ne pas ajouter de taxe, remise ou champ fiscal appartenant seulement au catalogue cadastral.
6. **Conserver les particularités des données** : onglets analytiques, durée d’accès dans les détails, titres et ordre configurés, devises explicites, panier indépendant et parcours de paiement existant.

## Détails techniques
- Extraire uniquement la présentation commune des lignes et des blocs de récapitulatif, puis l’utiliser dans les deux catalogues avec leurs propres données et actions. Aucun mélange de facturation, de règles d’accès ni de suivi d’événements.
- Préserver l’apparence du catalogue des services pendant cette extraction ; les corrections concernent le catalogue des données.
- Réutiliser la même présentation pour la fenêtre superposée et l’adresse directe du catalogue.
- Aucun changement des tarifs, des tables ou des fonctions serveur.

## Vérifications
- Comparer les deux catalogues à dimensions identiques, notamment 360 × 613, un mobile plus large et un ordinateur.
- Vérifier les prix longs en USD/CDF, titres longs, détails ouverts, sélection partielle/groupée, achats existants et catalogue vide.
- Tester le clic sur la ligne, le chevron, le clavier, la fermeture/réouverture avec panier conservé et la fenêtre de paiement.
- Vérifier l’absence de régression visuelle dans les services. Un achat réel connecté reste non vérifiable automatiquement avec l’authentification externe disponible dans ce projet.
