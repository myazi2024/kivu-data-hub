# Accès payant aux Données foncières sur un seul écran

## Résultat attendu
La page de présentation affichée aux profils non habilités sans achat valide tient dans un seul écran, sans défilement vertical ni horizontal, sur ordinateur et mobile. Le catalogue d’achat et les analyses ne sont pas concernés.

## Modifications
- Conserver la navigation, le titre « Données foncières », une accroche concise, le bouton « Demander l’accès » et la mention du paiement par visuel.
- Réduire les espacements et condenser les trois bénéfices en une présentation compacte ; sur les écrans les plus courts, retirer les textes secondaires redondants plutôt que couper le contenu.
- Adapter la hauteur de l’aperçu à l’espace disponible après la navigation et les textes, au lieu d’imposer les proportions actuelles qui allongent la page.
- Garder les captures ordinateur/mobile administrables et les afficher entièrement, sans recadrage ni déformation ; conserver un emplacement sobre lorsqu’une capture manque.
- Garder le retour à l’accueil discret, sans bloc supplémentaire consommant beaucoup de hauteur.
- Maintenir le bouton d’accès visible et utilisable, sans réduire les zones tactiles ni masquer un contenu débordant pour simuler l’absence de défilement.

## Détails techniques
- Ajuster la présentation de `LandDataAccessDenied` dans `src/components/access/LandDataAccessGate.tsx` : hauteur basée sur `100dvh`, répartition flexible de l’espace et contraintes `min-height: 0` pour l’aperçu.
- Prévoir des adaptations selon la hauteur disponible, notamment sur les téléphones courts et en paysage ; ne pas bloquer globalement le défilement de l’application.
- Conserver les couleurs et boutons existants, les règles d’accès, les liens et la configuration des captures. Aucun changement serveur ni paiement.

## Vérifications
- Vérifier notamment le mobile 360 × 613, un téléphone plus haut, le paysage et des ordinateurs de différentes hauteurs.
- Confirmer l’absence de défilement, de chevauchement et de texte tronqué, avec et sans captures.
- Vérifier le bouton vers le catalogue, le retour à l’accueil et l’accessibilité au clavier.
- Contrôler les tests de cette page et les diagnostics de l’aperçu ; signaler toute impossibilité de vérifier le parcours authentifié réel.
