# Réduire le Footer à la mention de copyright

## Objectif
Supprimer tout le contenu du footer (infos société, liens Navigation, liens Ressources) et ne conserver que la barre inférieure avec la mention `© 2026 BIC - Tous droits réservés`. Le bouton « Gérer les cookies » et l'indicateur « N provinces » restent à côté de la mention, car ils appartiennent à la partie basse.

## Changement
Fichier unique : `src/components/Footer.tsx`

- Supprimer le bloc « Main Content » (lignes 35-102) : colonnes Company Info, Quick Links, Resources.
- Conserver le bloc « Bottom Bar » (lignes 104-124) contenant :
  - `© {currentYear} {appName} - Tous droits réservés`
  - le bouton « Gérer les cookies »
  - l'indicateur `{provincesCount} provinces`
- Nettoyer les imports devenus inutilisés (`MapPin`, `Phone`, `Mail`, `Link`, `useCatalogConfig` si non utilisé) pour éviter les warnings de lint.
- Ajuster les classes du `<footer>` pour que la barre réduite reste centrée et responsive (flex centré, padding vertical réduit).

## Vérification
- Le typecheck `npx tsgo --noEmit -p tsconfig.app.json` doit passer sans imports inutilisés.
- Aperçu visuel : le footer n'affiche plus que la ligne de copyright + cookies/provinces, sur mobile et desktop.
