# Audit et optimisation du menu « Carte cadastrale »

## Objectif
Passer en revue chaque partie de la carte cadastrale (écran et serveur), corriger ce qui ne va pas, sans ajouter de nouvelle fonctionnalité.

## Parties examinées une par une
1. Affichage de la carte : fond de carte, regroupement des parcelles, géolocalisation, mouvements réduits
2. Recherche de parcelle et barre de recherche
3. Fiche de résultat d'une parcelle et actions proposées (catalogue de services)
4. Panier, paiement et accès aux documents payés (y compris le mode test)
5. Formulaires ouverts depuis la carte : contribution CCC, litige, autorisation de bâtir, titre foncier, mutation, morcellement, expertise
6. Notifications, sons, lien WhatsApp, suivi analytique
7. Côté serveur : fonctions de calcul, règles d'accès aux données, services en ligne liés à la carte (tuiles, factures, paiements)

## Pour chaque partie, on recherche
- Bugs et erreurs visibles ou dans la console
- Incohérences (statuts, libellés, « Autorisation » et non « Permis », montants calculés côté navigateur au lieu du serveur)
- Écrans ou fonctions jamais utilisés ou inaccessibles
- Code mort ou dupliqué
- Optimisations : chargements en double, rechargements inutiles, données personnelles exposées, droits d'accès trop larges

## Corrections
- Appliquées au fil de l'audit, en gardant l'apparence et les parcours actuels
- Toute écriture sensible (paiement, facture, accès payé) reste réservée au serveur
- Données personnelles consultables seulement après paiement, via le serveur

## Vérification finale
- Contrôle du code et tests automatiques sans erreur
- Carte ouverte dans le navigateur sur ordinateur et téléphone : affichage, recherche, fiche de parcelle, ouverture des formulaires, sans erreur console
- Limite : sans compte sur votre base, je ne pourrai pas tester les parcours connectés (paiement, envoi de formulaire) ; je vous indiquerai quoi tester

## Livrable
Rapport `docs/reports/AUDIT_CADASTRAL_MAP.md` : problèmes trouvés, corrections faites, points laissés ouverts et pourquoi.

## Détails techniques
- Point d'entrée : route /cadastral-map et hooks associés (données, paiement, notifications, Leaflet), proxy Mapbox, useCadastralPayment, record-test-payment
- Recherche de : dépendances d'effets sur l'objet utilisateur, insert/update directs sur tables sensibles, `Math.random`, abonnements temps réel sans nettoyage, requêtes non paginées au-delà de 1 000 lignes
- Côté base : politiques des tables consultées par la carte, droits d'exécution des fonctions utilisées
- Fichiers de plus de 1 000 lignes découpés si rencontrés ; AGENTS.md mis à jour si une règle change
