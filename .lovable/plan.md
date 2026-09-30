# Suppression du sous-titre non pertinent de l'Accueil

## Objectif
Retirer de la section héro de l'Accueil le texte « Consultez les parcelles, repérez les circonscriptions foncières et découvrez les données disponibles pour votre territoire. », jugé non pertinent.

## État actuel (vérifié)
Le texte se trouve dans `src/components/HeroSection.tsx`, lignes 58–60, sous le titre et l'animation de frappe (TypewriterAnimation), juste au-dessus des boutons « Cadastre numérique » et « Données foncières ».

## Modifications
1. Supprimer le paragraphe entier (`<p className="mt-1 mb-4 ...">…</p>`) dans `HeroSection.tsx`.
2. Ajuster légèrement l'espacement du bloc boutons si nécessaire pour garder un rendu équilibré (le bloc gagne environ 30 px de hauteur ; le titre animé reste comme sous-titre).
3. Ne rien changer d'autre : disposition carte à gauche / textes à droite, charte BIC et hauteur « sans défilement sur ordinateur » préservées.

## Vérification
- Typecheck + build.
- Vérification Playwright (1280×800 et 390×844) : le texte n'apparaît plus, l'Accueil tient toujours sans défilement, boutons et carte intacts.
