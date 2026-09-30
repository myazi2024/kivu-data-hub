# Déplacer les trois indicateurs BIC vers le bas de page

## Objectif
Les trois chiffres BIC (Parcelles enregistrées · Services délivrés · Litiges fonciers répertoriés) quittent la colonne de droite de l'accueil et sont affichés dans le bas de page, centrés et en très petit caractère. Seules les données apparaissent : pas de panneau de verre dépoli ni de conteneur encadré.

## État actuel (vérifié)
- `src/components/HeroSection.tsx` (lignes 104–106) monte `HomeBicIndicators` sous les boutons, à droite.
- `src/components/home/HomeBicIndicators.tsx` rend un panneau `backdrop-blur` à trois colonnes avec bordure et ombre, avec la logique de chargement (edge function `home-bic-counts`, chiffres configurables en admin, remplaçés par les compteurs réels au-delà de 10 000).
- `src/components/Footer.tsx` est un bas de page sombre (`bg-foreground`) partagé par toutes les pages : ligne « © … Tous droits réservés » à gauche, bouton cookies et provinces à droite.

## Décision confirmée
Affichage sur l'accueil uniquement (le bas de page reste inchangé ailleurs).

## Modifications
1. `Footer.tsx` :
   - Détecter la page d'accueil (route `/`) et y rendre les trois chiffres, centrés, en une seule ligne très compacte (texte continu du type « 9 200 Parcelles enregistrées · 7 400 Services délivrés · 2 800 Litiges fonciers répertoriés »), en très petit caractère (≈ 9–10 px), sans bordure ni fond ni panneau — uniquement les données.
   - Emplacement : au-dessus de la ligne « © … », en largeur pleine et centré ; adapte les couleurs au fond sombre (ton atténué, chiffres légèrement plus marqués).
   - Le chargement des données ne se lance que sur l'accueil (pas d'appel sur les autres pages).
2. `HeroSection.tsx` : supprimer le bloc `HomeBicIndicators` et son import ; ajuster l'espacement du bloc boutons/liens pour compenser l'espace libéré (≈ 50 px), sans casser le rendu « sans défilement sur ordinateur ».
3. Aucun changement back-end : la logique (edge function, chiffres administrables, seuil 10 000) est conservée telle quelle, déplacée dans le composant affiché dans le bas de page.

## Vérification
- Typecheck + build.
- Playwright 1280×800 et 390×844 : chiffres présents centrés dans le bas de page sur l'accueil, absents du héro ; absents aussi du bas de page sur une autre page (ex. /auth) ; aucune erreur console ; accueil toujours sans défilement sur ordinateur.
