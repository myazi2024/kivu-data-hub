# Mes parcelles : ordre de développement des fonctions restantes

Le score de sécurisation existe déjà. Les fonctions restantes sont classées selon trois critères : utilité immédiate pour le propriétaire, effet sur l'objectif (plus de parcelles sécurisées et approuvées), et dépendances entre elles.

## Ordre proposé

1. **Liens rapides vers les services** (petit lot)
   Dans le détail du score, chaque élément manquant reçoit un bouton qui ouvre directement le bon service : déclarer une taxe, demander un titre foncier, une expertise, une mutation, une autorisation de bâtir, etc. Le score devient ainsi actionnable. Aucune nouvelle donnée n'est nécessaire, donc c'est rapide à livrer.

2. **Alertes** (lot moyen)
   Avertissements par parcelle, affichés sur la carte de la parcelle et envoyés par le système de notifications existant : taxe de l'année non déclarée, hypothèque active, litige ouvert, revendication reçue, expertise de plus de 5 ans, demande en attente de paiement. Les alertes reprennent les mêmes règles que le score, ce qui garantit la cohérence.

3. **Tri et filtres** (petit lot)
   Utile dès que l'utilisateur a plusieurs parcelles : tri par score (le plus faible d'abord), par nombre d'alertes, par date d'approbation ou par numéro, avec filtre « avec alertes ». Placé après les alertes pour pouvoir trier sur celles-ci.

4. **Coffre-fort de documents** (gros lot)
   Regroupe par parcelle les pièces déjà fournies (titre, justificatifs d'exploitation, quittances, certificats d'expertise ou de mutation), en consultation sécurisée par lien temporaire, réservée au propriétaire. Possibilité d'ajouter des documents personnels (privés, non soumis à validation). Il complète aussi le score, puisque des pièces manquantes peuvent y être ajoutées.

5. **Historique des scores** (lot moyen)
   Enregistrement du score à chaque changement (approbation, paiement, nouvelle pièce) et petite courbe d'évolution dans le détail. Placé tard car il n'a de valeur qu'après plusieurs semaines de données ; on peut cependant commencer l'enregistrement dès l'étape 2 pour avoir un historique prêt.

6. **Fiche imprimable** (lot moyen)
   Fiche PDF résumant la parcelle : identité, score, éléments complétés et manquants, alertes, liste des documents du coffre. En dernier, car elle rassemble le résultat de toutes les étapes précédentes. Elle n'a pas valeur de document officiel (mention explicite, pour ne pas la confondre avec la fiche cadastrale payante).

## Proposition de livraison

- Lot A : étapes 1 + 2 + 3 (et démarrage silencieux de l'enregistrement des scores).
- Lot B : étape 4.
- Lot C : étapes 5 + 6.

Après approbation, je commence par le lot A.

## Détails techniques

- Liens rapides : table de correspondance élément du score vers route/service, côté `parcelSecurity.ts`, testée.
- Alertes : fonction serveur réservée au propriétaire (contrôle `owner_user_id` à l'intérieur), notifications via `notify_user` avec clé anti-doublon ; aucune lecture directe des historiques payants.
- Coffre : bucket privé existant + URL signée via fonction serveur vérifiant la propriété ; noms de fichiers en `crypto.randomUUID()`.
- Historique : table `parcel_security_snapshots` alimentée par trigger serveur, lecture propriétaire uniquement.
- Fiche : génération PDF côté navigateur à partir des données déjà autorisées, sans section payante non achetée.
