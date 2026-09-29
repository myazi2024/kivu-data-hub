# Section partenaires de l'accueil : redesign « Ruban moderne »

## Objectif
La section « Ce projet trouve écho auprès de » occupe ~284 px de hauteur avec un bandeau gris plat, des logos h-16 posés dans des cartouches blancs et un titre volumineux. Remplacer ce rendu par un ruban compact, moderne et épuré (direction v3 choisie), sans toucher à la charte BIC (rouge #B40D32, Roboto, tokens sémantiques) ni aux données des partenaires.

## Portée
- Un seul fichier principal : `src/components/PartnersSection.tsx`.
- Aucune modification back-end, de la table `partners` ni de son administration.
- Pas d'ajout de fonctionnalités.

## Design retenu (v3 « Ruban moderne »)
- Section resserrée : paddings verticaux réduits (~py-5 / py-6 au lieu de py-10/16), hauteur totale visée ~110-140 px sur ordinateur.
- Fond clair uni (`bg-muted/40` ou équivalent sémantique) avec fines bordures haut/bas ; plus de bandeau gris massif ni de cartouches blancs flottants.
- Titre transformé en sur-libellé discret : petite majuscule espacée, accent rouge discret, centré.
- Défilement (marquee) conservé : chaque partenaire sur une même ligne — logo (hauteur réduite, ~h-7/h-9) suivi du nom court, espacement régulier, défilement fluide, pause au survol.
- Logos en niveaux de gris avec couleur au survol (transition douce) ; opacité légèrement atténuée au repos pour la sobriété.
- Fondus latéraux (dégradés) aux bords du ruban pour une entrée/sortie propre.
- Fallback conservé : initiale dans une pastille discrète quand `logo_url` est absent.
- Accessibilité et comportements actuels préservés : `aria-labelledby`, duplicata `aria-hidden` pour le bouclage, liens externes `noopener noreferrer`, analytics `partner_logo_click`.
- Responsive : ruban identique sur mobile, hauteur et tailles de logo adaptées, pas de débordement horizontal.

## Vérification
- Typecheck (`npx tsgo --noEmit -p tsconfig.app.json`) et suite de tests existante.
- Rendu vérifié par captures Playwright sur ordinateur et mobile (hauteur réduite, marquee fluide, survol, absence de débordement, aucune erreur console).
