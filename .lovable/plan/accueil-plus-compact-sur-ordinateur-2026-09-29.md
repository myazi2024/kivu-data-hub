# Accueil plus compact sur ordinateur

## Résultat attendu
- Faire tenir l’Accueil entier — navigation, carte, texte, trois indicateurs BIC, partenaires et bas de page — dans la hauteur d’un écran d’ordinateur courant, sans défilement vertical lorsque l’espace le permet.
- Préserver la carte à gauche, les textes et actions à droite, les contenus et liens existants, ainsi que la charte BIC. Sur les fenêtres exceptionnellement basses, conserver la lisibilité et permettre le défilement plutôt que couper le contenu.

## Ajustements
1. Réduire les espaces verticaux de la première section sur ordinateur : marges entre titre, texte, boutons, liens et indicateurs ; rendre le bandeau des chiffres moins haut sans réduire excessivement leur lisibilité.
2. Adapter la hauteur de la carte à l’espace disponible sur ordinateur au lieu d’imposer 420 px à partir de 1280 px de large ; garder sa sélection au survol/clic et la liste des circonscriptions accessibles.
3. Resserrer légèrement le ruban des partenaires et les espaces autour, sans changer ses logos colorés ni son petit libellé. Garder le pied de page visible.
4. Vérifier les écrans d’ordinateur habituels et les fenêtres plus basses, en contrôlant le défilement, les chevauchements et les interactions ; corriger les écarts constatés.

## Détails techniques
- Modifier seulement les classes de présentation de l’Accueil (`HeroSection`, `HomeProvinceMap`, `HomeBicIndicators`, `PartnersSection` si nécessaire), avec des règles réactives tenant compte de la hauteur disponible ; aucune modification des données ni des règles métier.
- Mesures relevées avant modification : à 1280 × 800, la première section mesure 738 px pour une navigation de 65 px et un pied de page de 48 px ; à 1280 × 720, le ruban partenaires ajoute environ 109 px et la page atteint environ 960 px. La carte réserve 420 px sur ces deux tailles.
