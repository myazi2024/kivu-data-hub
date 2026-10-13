# Refonte de la page de découverte des Données foncières

## Objectif
Remplacer la page destinée aux profils non habilités par une présentation courte, accueillante et convaincante, qui donne envie de demander l’accès sans promettre une autorisation automatique.

## Présentation et contenu
- Conserver la navigation du site, supprimer les cadenas, les accents d’alerte, le badge « Utilisateur » et les deux longues listes de données interdites ou accessibles.
- Construire une page aérée, sans empilement de cartes, avec le titre **« Données foncières »**, suivi de **« Une nouvelle perspective sur le foncier en RDC. »**
- Ajouter un paragraphe bref : **« Explorez la carte, comparez les territoires et appuyez vos analyses sur les données disponibles du cadastre numérique. »**
- Limiter les bénéfices à trois éléments : **« Visualisez les territoires »**, **« Analysez les tendances foncières »**, **« Partagez vos analyses »**. Ne pas promettre l’accès aux identités, à toutes les parcelles ou à des documents payants.
- Mettre en évidence un bouton **« Demander l’accès »**, vers le parcours de partenariat existant. Ajouter une mention discrète : **« L’accès est accordé après examen de votre demande, selon votre profil et votre activité. »**
- Conserver un retour à l’accueil discret et adapter le titre et la description de la page pour remplacer le ton « Accès restreint ».

## Emplacement des images
- Préparer les emplacements maintenant ; les captures seront fournies plus tard, conformément à votre choix.
- Prévoir une grande zone d’aperçu sous l’introduction, avec un format paysage sur ordinateur et un format portrait sur mobile ; afficher uniquement la variante adaptée à l’écran.
- En attendant les captures, utiliser un emplacement sobre intitulé **« Aperçu des Données foncières »**, sans image inventée ni capture contenant des données personnelles.
- Préserver les proportions des futures captures et leur lisibilité, sans recadrage qui masque l’interface ni texte superposé. Aucun formulaire d’envoi d’image supplémentaire n’est nécessaire.

## Périmètre technique
- Modifier uniquement la présentation de `LandDataAccessDenied` dans `src/components/access/LandDataAccessGate.tsx`, en isolant la page de découverte si nécessaire pour garder le contrôle d’accès lisible.
- Conserver sans changement la vérification de connexion, les rôles autorisés, les états de chargement et la redirection vers `/auth` : cette refonte n’ouvre aucun accès supplémentaire.
- Réutiliser les boutons et couleurs sémantiques existants, compatibles avec les thèmes clair et sombre.
- Conserver `/partnership` comme destination : cette page présente actuellement le parcours de partenariat et les moyens de contact, sans création d’un nouveau processus de demande.

## Vérification
- Contrôler la lisibilité sur ordinateur et mobile, les proportions des emplacements et l’absence de débordements.
- Vérifier le lien « Demander l’accès », l’accessibilité au clavier et le maintien du contrôle d’accès.
- Tester les états profil autorisé, non habilité et non connecté ; signaler les vérifications authentifiées impossibles si aucune session utilisable n’est disponible.

## Non inclus
- Aucun changement serveur ou de permissions.
- Aucune publicité générée : vos deux captures seront intégrées lorsqu’elles seront fournies.