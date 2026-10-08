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

## Suite — accès payé aux historiques (corrigé)
Lecture libre supprimée ; carte et tableau client passent par `get_parcel_paid_history` ; Données foncières et recherche avancée par des fonctions statistiques sans données personnelles.

## Catalogue de services et panier (2026-10-02)

### Problèmes trouvés et corrigés
- **Services « Historique des propriétaires » et « Obligations fiscales et hypothécaires » toujours indisponibles avant paiement** : leurs règles de disponibilité lisaient les historiques, que le serveur ne renvoie qu'après paiement. `get_cadastral_parcel_data` renvoie maintenant `data_availability` (booléens d'existence, sans donnée personnelle) et les règles du catalogue pointent vers ces indicateurs.
- **« Localisation et historique de bornage »** : la règle GPS lisait un champ non renvoyé avant paiement ; elle utilise désormais `data_availability.gps_coordinates` / `boundary_history`.
- **Panier** : un service archivé ou désactivé restait dans le panier, et seuls les prix de la parcelle active étaient synchronisés. `syncWithCatalog` aligne maintenant toutes les parcelles (prix, nom, catégorie, retrait des services retirés).
- **Synchronisation des prix** : un indicateur partagé entre parcelles recopiait inutilement les parcelles non modifiées ; corrigé.

### Vérifié sans écart
- Montants recalculés par `create_cadastral_invoice_safe` à partir du catalogue actif (non archivé) ; accès accordé par `mark_cadastral_invoice_paid_safe`.
- Purge des services payés après paiement ; données personnelles toujours servies uniquement après paiement.

### Points ouverts
- Parcours connectés (ajout au panier, paiement) non cliqués dans le navigateur de contrôle.

## Résultat cadastral acheté (2026-10-07)
- Serveur : `get_cadastral_parcel_data` renvoie `access` (services actifs + fin d'accès) ; « Localisation & bornage » seul ouvre la localisation sans le propriétaire ; `legal_verification` lit la parcelle complète.
- Fiche, PDF et téléchargement depuis l'espace client : rubriques ouvertes uniquement selon `access`, cadenas sinon, numérotation fixe ; plus de lecture directe des tables côté navigateur.
- Fiche rechargée automatiquement après paiement.
- Code de vérification créé seulement à l'impression/au téléchargement d'un document contenant un service acheté.
- Supprimé : contrôle d'accès en double (`checkServiceAccess`), reconstruction du nom du propriétaire depuis les détails bruts.

## Gestion Hypothèque (menu Actions) — 2026-10-08

### Problèmes trouvés
- Aucune demande de radiation ne pouvait aboutir : deux règles serveur contradictoires refusaient chaque envoi.
- La vérification d'hypothèque active lisait directement la table des hypothèques, invisible aux notaires, héritiers et mandataires : radiation bloquée à tort et contrôle « une seule hypothèque active » contournable.
- Le navigateur fixait statut, statut de paiement, montant et frais à l'enregistrement ; notifications et journal d'audit écrits par le navigateur (falsifiables).
- Une demande en attente de paiement ne pouvait être ni relancée ni annulée ; toute nouvelle tentative créait un doublon.
- Le formulaire d'enregistrement affichait un choix de statut sans effet (le serveur force « active ») et annonçait « Hypothèque enregistrée » pour une demande en attente.
- Barème des frais de radiation en double (navigateur et serveur) et total recalculé hors de `calculateMortgageFees`.

### Corrections appliquées
- Vérification d'hypothèque active via la fonction serveur `check_parcel_active_mortgage` : ouverte à tout utilisateur connecté, elle ne révèle les détails que pour une référence exacte.
- Radiation créée uniquement par `submit_mortgage_cancellation_request` : montant recalculé depuis le barème configuré, anti-doublon, réutilisation d'une demande en attente de paiement, notification et audit créés côté serveur.
- Annulation possible via `cancel_mortgage_cancellation_request` (demandeur, statut en attente de paiement) et bloc « Reprendre le paiement » dans l'espace utilisateur.
- Enregistrement : choix de statut retiré du formulaire, statut forcé « active » par le serveur, message corrigé en « Demande d'enregistrement soumise ».
- Paiements (Mobile Money et carte) vérifient la demande, son statut et le montant dû côté serveur.
- Code mort retiré : liste de statuts en dur, calcul de total dupliqué, écritures notification/audit navigateur.

### Points ouverts
- La table des hypothèques est vide : vérifier les valeurs réelles avant toute normalisation supplémentaire des statuts.
- Trois alertes du scan de sécurité sur les nouvelles fonctions sont intentionnelles (contrôle de l'appelant interne, fermées aux visiteurs).
- Parcours connectés non testés à l'écran (connexion requise).
