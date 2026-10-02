# Audit et adaptation mobile de toute l’application

## Objectif
Rendre chaque parcours utilisable sur téléphone et tablette, sans débordement, contenu coupé, commande inaccessible ni chargement disproportionné. Conserver l’apparence BIC, les règles métier, les droits d’accès et les protections serveur existantes.

## Constats déjà confirmés
- Les pages publiques tiennent généralement dans la largeur, mais « Programme Contributeur Cadastral » et « Codes de remise » débordent à 320–390 px à cause de leurs boutons finaux.
- L’Accueil, la connexion, les services, les publications, les articles, la vérification de document et le pitch ne créent pas de débordement global à 390 px. Le bandeau thématique des articles défile horizontalement comme prévu.
- La carte cadastrale, Données foncières, l’espace utilisateur et l’admin ont déjà une structure mobile dédiée, mais nécessitent une revue de leurs fenêtres, onglets, tableaux, gestes tactiles et barres fixes.
- Les zones de sécurité iPhone sont partiellement prévues dans le code, mais le réglage global permettant de les appliquer n’est pas activé.
- Plusieurs commandes tactiles mesurent moins de 44 px ; plusieurs fenêtres admin n’ont pas de hauteur mobile ni de défilement garanti.
- Plusieurs tableaux admin restent des tableaux larges à défilement horizontal alors qu’un affichage mobile par fiches existe déjà ailleurs dans le projet.
- La carte cadastrale charge jusqu’à 2 000 parcelles détaillées ; plusieurs listes admin paginent après avoir chargé toutes les lignes. Ces volumes peuvent ralentir ou saturer un téléphone.
- Le catalogue des services en temps réel recharge toute la liste à chaque changement et les journaux montrent actuellement des échecs de reconnexion.

## Corrections prévues

### 1. Socle mobile commun
- Activer les zones de sécurité des téléphones à encoche et appliquer les marges utiles aux panneaux, boutons flottants et barres d’action fixes.
- Donner aux fenêtres communes une largeur avec marge latérale, une hauteur maximale dynamique et un défilement interne fiable ; préserver les fenêtres qui ont déjà un comportement spécialisé.
- Harmoniser les cibles tactiles essentielles à 44 px minimum, en priorité navigation, fermeture, validation, paiement, téléversement et actions de ligne.
- Prévenir les débordements de mots, nombres, badges et longues appellations géographiques sans masquer les informations indispensables.

### 2. Pages publiques
- Corriger les deux débordements mesurés sur « Programme Contributeur Cadastral » et « Codes de remise » en empilant leurs actions sur petit écran.
- Vérifier puis ajuster Accueil, navigation, cookies, connexion, services, publications, articles, détails d’article, pages institutionnelles, mentions légales, vérification de document et pitch aux largeurs 320, 360, 390 et 768 px.
- Rendre le menu mobile défilable sur les téléphones courts afin que ses derniers liens restent accessibles.

### 3. Carte cadastrale et formulaire CCC
- Tester et corriger la barre de recherche avec clavier ouvert, suggestions, notifications flottantes, recherche avancée et absence de résultat.
- Vérifier la coexistence des contrôles de carte, légende, panier, fiche parcelle, panneau « Actions » et zones de sécurité, sans recouvrement.
- Revoir chaque étape du CCC sur téléphone : onglets, listes, cartes, saisie GPS, voirie, constructions, pièces jointes, boutons précédent/suivant, récapitulatif et soumission.
- Appliquer le même contrôle aux neuf services ouverts depuis « Actions » : expertise, mutation, titre foncier, litige, lotissement, autorisations, hypothèque, taxes et services cadastraux.
- Conserver strictement les lectures payantes, paiements serveur, RPC sécurisées et règles de visibilité existantes.

### 4. Données foncières et Analytics
- Vérifier les gestes de la carte RDC et des circonscriptions : déplacement, pincement, sélection, zoom, retour et passage Carte/Analytics.
- Corriger tout conflit entre le balayage horizontal des panneaux et les gestes propres à la carte.
- Réorganiser sur petit écran les filtres dépendants de localisation, les boutons Provinces/Circonscriptions, les légendes et les cartes d’indicateurs.
- Améliorer la lisibilité des graphiques et libellés actuellement affichés autour de 10 px, sans fausser les données ni simplifier les filtres CCC.

### 5. Espace utilisateur, revendeur et RH
- Ouvrir chaque rubrique de « Mon compte » et vérifier navigation, listes, états vides, paiements, documents, préférences et sécurité.
- Transformer les onglets trop larges en rangée défilable ou en sélection compacte selon leur nombre.
- Vérifier les téléversements depuis galerie/appareil photo, les erreurs réseau et la conservation des données saisies.
- Adapter le tableau revendeur et l’espace RH, notamment les onglets, graphiques, longues adresses et statuts.

### 6. Espace admin
- Parcourir chaque module depuis le tiroir mobile, y compris CCC, utilisateurs, sécurité, paiements, facturation, carte, demandes, historiques, contenus, configuration, RH et système.
- Appliquer le modèle mobile déjà utilisé par les bonnes fenêtres cadastrales aux fenêtres admin qui peuvent dépasser la hauteur de l’écran.
- Remplacer, lorsque nécessaire, les tableaux larges par le composant mobile en fiches déjà présent ; garder le tableau complet sur ordinateur.
- Corriger les filtres à largeur fixe, barres d’actions, groupes de 5 à 9 onglets et petites commandes de ligne.
- Ne modifier aucun droit admin, calcul financier, statut ou processus d’approbation pendant ce travail de présentation.

### 7. Charge réseau et serveur sur mobile
- Remplacer la pagination purement visuelle des grandes listes par des pages réellement demandées au serveur, module par module, avec total fiable.
- Réduire les données initiales de carte : chargement par zone visible ou niveaux de détail, sans exposer de données supplémentaires et sans inventer de géométrie.
- Éviter le rechargement complet du catalogue à chaque événement temps réel et rendre la reconnexion explicite après une coupure.
- Ajouter reprise, progression ou message clair aux téléversements critiques sur réseau instable, en respectant les limites de fichiers existantes.
- Mesurer les réponses volumineuses et conserver en cache les GeoJSON partagés lorsque cela ne compromet pas leur actualité.

## Vérification
- Contrôle automatisé des débordements et captures à 320×568, 360×800, 390×844, 768×1024 et sur ordinateur.
- Parcours tactiles avec clavier ouvert, orientation portrait/paysage, mouvement réduit et réseau lent/interrompu.
- Tests ciblés du CCC, de la carte, des filtres Analytics, des paiements, des historiques payants, des téléversements et des actions admin.
- Contrôle des types, tests existants et état final de la compilation après chaque lot.
- Les pages connectées ne peuvent pas être parcourues automatiquement avec la base externe actuelle ; elles seront corrigées par inspection et tests, puis listées précisément pour une validation visuelle avec votre session.

## Livrable
- Corrections appliquées par lots, sans fonctionnalité supplémentaire.
- Rapport `docs/reports/AUDIT_MOBILE_APP.md` indiquant pour chaque écran : problème, gravité, correction, vérification effectuée et éventuel contrôle restant avec une session connectée.
