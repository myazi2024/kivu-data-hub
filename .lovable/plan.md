# Refonte de l’espace utilisateur sur le modèle de l’administration

## Constat vérifié

- L’espace utilisateur actuel limite le contenu à une colonne étroite (`360 px` sur ordinateur) et place 11 rubriques dans une barre horizontale défilante.
- L’espace admin utilise une structure plus adaptée aux écrans riches : barre latérale organisée par catégories, en-tête fixe, fil d’Ariane, grande zone de contenu et tiroir de navigation sur mobile.
- Les fonctions utilisateur existantes sont déjà séparées par domaine : profil, contributions CCC, locations, annonces, valeur, fiscalité, titres, autorisations, expertises, mutations, hypothèques, lotissements, litiges, factures et réglages.

## Refonte proposée

### 1. Même structure générale que l’espace admin

- Remplacer la navigation horizontale par une barre latérale fixe sur ordinateur.
- Utiliser un tiroir latéral sur téléphone, ouvert depuis l’en-tête.
- Reprendre les proportions, bordures, densité, états actifs et comportements de défilement de l’administration.
- Donner toute la largeur disponible au contenu au lieu de le maintenir dans une colonne mobile centrée.
- Retirer la navigation publique et le pied de page de cet espace de travail, avec un accès clair pour revenir au site.

### 2. Navigation utilisateur regroupée

```text
Vue d’ensemble
  Tableau de bord

Mes biens
  Contributions CCC
  Locations
  Annonces
  Valeur & expertise

Démarches
  Titres fonciers
  Autorisations de bâtir
  Expertises
  Mutations
  Hypothèques
  Lotissements
  Litiges

Finances
  Factures
  Fiscalité déclarée

Mon compte
  Profil
  Préférences
  Sécurité
  Mes données
```

- Ajouter une recherche de rubrique dans la barre latérale, comme dans l’admin.
- Afficher les compteurs utiles à côté des rubriques concernées quand les données sont disponibles.
- Conserver les anciennes adresses `?tab=` grâce à une correspondance vers les nouveaux groupes et sous-rubriques.

### 3. En-tête et repères de navigation

- Créer un en-tête utilisateur inspiré de celui de l’admin avec bouton du menu mobile, titre de la rubrique, notifications et menu du compte.
- Ajouter un fil d’Ariane cohérent : `Mon espace > Catégorie > Rubrique`.
- Conserver la déconnexion, le profil, les notifications et le retour au site dans des emplacements stables.

### 4. Vue d’ensemble réellement utile

- Réutiliser les statistiques déjà disponibles pour présenter une synthèse compacte des contributions, titres, factures et litiges.
- Ajouter des accès rapides vers une nouvelle contribution, les demandes en cours et les actions nécessitant l’attention de l’utilisateur.
- Présenter les informations en panneaux sobres et denses, sur le même registre visuel que l’administration, sans multiplier les cartes décoratives.

### 5. Harmonisation des écrans existants

- Adapter les listes, filtres, tableaux, formulaires et panneaux utilisateur à la nouvelle largeur.
- Remplacer les grands arrondis actuels par les rayons plus sobres de l’administration.
- Uniformiser les chargements, états vides, statuts, boutons d’action et espacements.
- Préserver intégralement les fonctions existantes, notamment « Modifier mes données », le suivi des corrections CCC et tous les dialogues métiers.

### 6. Adaptation mobile et validation

- Vérifier le tiroir de navigation, l’en-tête, les tableaux défilants, les dialogues et les zones tactiles à `360 px`.
- Vérifier aussi les largeurs tablette et ordinateur afin d’éviter les textes coupés, débordements et superpositions.
- Tester la navigation par URL, les anciennes adresses, les changements de rubrique, les notifications et les principaux boutons.
- Exécuter les tests existants et le contrôle TypeScript après la refonte.

## Notes techniques

- Extraire une configuration de navigation utilisateur et des composants dédiés pour la barre latérale et l’en-tête, en suivant les conventions de l’admin sans partager ses permissions ou ses contenus.
- Réduire `UserDashboard` à la gestion de la structure, de `?tab=` / `?sub=` et du chargement des rubriques.
- Charger les grandes rubriques à la demande pour ne pas alourdir l’ouverture de l’espace utilisateur.
- Utiliser exclusivement les jetons visuels existants et les composants d’interface du projet ; aucune nouvelle logique métier ni modification de base de données n’est comprise dans cette refonte.
