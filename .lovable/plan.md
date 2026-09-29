# Affiner la première section de l’Accueil

## Résultat attendu
- Reprendre la hiérarchie de la première section de France Cadastre sans copier sa charte : **carte de la RDC à gauche**, texte et actions à droite sur ordinateur ; disposition lisible et compacte sur mobile.
- Conserver l’identité BIC, ses couleurs, ses polices et les réglages de l’Accueil pilotés depuis l’administration.
- Remplacer le principe de recherche de la référence par deux actions principales : **Cadastre numérique** et **Données foncières**. Adapter les liens et le texte d’accompagnement aux pages et services réellement disponibles, sans reprendre les chiffres ni les affirmations de la référence.
- Montrer les **provinces interactives** ; au choix d’une province, afficher ses circonscriptions foncières sous forme de liste consultable. Ne pas dessiner de frontières de circonscriptions non disponibles. Relier la consultation des données à la page existante.

## Mise en œuvre technique
- Réorganiser uniquement la section d’ouverture de l’Accueil, en réutilisant la carte provinciale déjà présente et la liste de circonscriptions par province. Adapter les interactions de la carte au clavier et au tactile, avec un état de repli si son dessin ne charge pas.
- Préserver les destinations et protections actuelles des actions : Cadastre numérique mène à la carte cadastrale avec passage par la connexion si nécessaire ; Données foncières mène à son accès existant. Conserver le suivi des clics et les paramètres de titre, d’accroche et de lien secondaire administrables.
- Ajuster l’image de fond et son voile si nécessaire pour que la carte, les textes et les boutons soient nets, sans modifier les autres sections de l’Accueil ni les règles métier.
- Vérifier le rendu et les interactions sur grand écran, écran intermédiaire et mobile ; tester les liens, la sélection de province, le repli d’erreur et la réduction des animations.
