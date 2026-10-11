# Optimiser les commandes et les onglets Analytics sur mobile

## Résultat attendu

- Regrouper les commandes mobiles dans une seule barre flottante en bas, respectant la zone sûre du téléphone.
- En vue **Carte**, afficher dans cette barre : **Partager**, **Carte**, **Analytics**, **Plein écran**.
- En vue **Analytics**, afficher : **Carte**, **Analytics**, **Plein écran** ; ne pas afficher **Partager**.
- Ajouter un chevron discret pour rétracter manuellement la barre. Une fois rétractée, seul ce bouton reste visible afin de pouvoir la rouvrir.
- Retirer les anciens boutons Partager et Plein écran superposés à la carte sur mobile, tout en les conservant à leur emplacement actuel sur ordinateur.
- Conserver strictement les fonctions existantes de partage, de bascule Carte/Analytics, de balayage horizontal et de plein écran.

## Onglets Analytics

- Rendre la liste verticale des onglets rétractable sur mobile avec un bouton chevron dédié.
- En mode rétracté, conserver une ligne compacte indiquant l’onglet actif et le bouton de réouverture.
- En mode déployé, garder la sélection actuelle et le comportement existant des onglets.
- Laisser la présentation ordinateur inchangée.

## Filtres Analytics

- Supprimer entièrement le sélecteur de statut actuellement présenté sous la valeur initiale « Tous statuts » dans les analyses.
- Retirer ce statut du calcul des filtres actifs et de la réinitialisation, sans modifier les filtres de temps ou de lieu.

## Détails techniques

- Étendre `MapMobilePager` pour recevoir les actions Partager/Plein écran et gérer son état replié, avec boutons tactiles d’au moins 44 px et libellés accessibles.
- Brancher le partage existant et `useMapFullscreen` depuis `DRCInteractiveMap`; masquer les commandes flottantes internes uniquement sous le seuil mobile.
- Ajouter l’état de rétraction des onglets dans `ProvinceDataVisualization`, sans démonter le visuel actif.
- Simplifier `AnalyticsFilters` et `AnalyticsTimeRow` afin de supprimer le statut à la source plutôt que de seulement cacher une option.

## Vérifications

- Tester les deux vues mobiles, barre ouverte/repliée, retour au panneau opposé, partage uniquement sur Carte et plein écran dans les deux vues.
- Vérifier le balayage Carte/Analytics et la zone sûre inférieure.
- Vérifier les onglets Analytics ouverts/repliés et la conservation de l’onglet actif.
- Vérifier l’absence du filtre de statut dans tous les blocs Analytics.
- Exécuter les tests automatisés, le contrôle TypeScript et confirmer la compilation de l’aperçu.
