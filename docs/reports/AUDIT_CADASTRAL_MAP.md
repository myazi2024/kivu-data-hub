# Audit — Carte cadastrale

## Corrigé
- Terminologie : derniers « Permis » affichés remplacés par « Autorisation » (intro CCC, intro demande, étape « autorisation initiale », fiche cadastrale PDF, récapitulatif CCC). « Permis de conduire » conservé.
- Fiche de résultat et historique fiscal : ne se rechargent plus à chaque rafraîchissement de session (dépendance sur l'identifiant utilisateur).
- Aucune écriture de paiement, facture ou accès payé faite depuis le navigateur ; abonnements temps réel correctement nettoyés ; aucun `Math.random` pour les fichiers.
- Parcelles : lecture directe réservée aux admins (accès public via vue/RPC).

## Ouvert
- Historique des propriétaires et historique fiscal lisibles par tout utilisateur connecté, sans paiement (contraire au modèle « données personnelles après paiement »). Les restreindre casserait l'affichage actuel de la carte et du tableau client : décision à prendre, puis passage par une fonction serveur vérifiant l'accès payé.
- Dialogues très longs à découper (expertise 4 069 lignes, titre foncier 3 496, aperçu parcelle 3 160, mutation 1 409, bloc construction 1 141) — sans impact fonctionnel, travail à planifier séparément.
- `useAdvancedAnalytics` affiche des indicateurs simulés au hasard (hors carte).
