# Logo animé pour les chargements

## Résultat attendu
- Pendant les attentes dans l’application, afficher un indicateur cohérent animé à partir du logo choisi dans les réglages d’apparence.
- Dans **Admin > Apparence**, à côté du logo et du favicon, permettre de choisir l’image du chargement et son animation, avec aperçu avant enregistrement.
- Par défaut, reprendre le logo principal si aucune image distincte n’est choisie ; si aucun logo n’est disponible ou si l’image échoue, conserver un indicateur de secours lisible.

## Mise en œuvre
1. Ajouter les paramètres d’image et d’animation du chargement au formulaire d’apparence existant : choix d’une image ou du logo principal, aperçu animé, réinitialisation et sauvegarde avec les autres paramètres. Réutiliser le stockage et les autorisations actuels, sans nouvelle table.
2. Créer un indicateur de chargement partagé avec tailles adaptées (page, panneau, petit bouton), texte accessible et animation désactivée si l’utilisateur préfère réduire les mouvements. Le faire réagir aux paramètres enregistrés, y compris lorsque le logo arrive après le premier affichage.
3. Remplacer les indicateurs de **chargement réel** dans les pages, formulaires, dialogues et boutons, notamment l’entrée de l’application, les accès protégés, l’espace admin, l’espace utilisateur et le formulaire CCC. Garder les squelettes de mise en page, les barres de progression et les icônes qui décrivent un **statut** : ce ne sont pas des chargements interchangeables.
4. Tester les cas d’image absente ou cassée, les modes clair/sombre, le mobile, les attentes courtes et longues, ainsi que l’enregistrement et le rechargement des réglages admin ; corriger les régressions détectées.

## Détails techniques
- Paramètres supplémentaires dans `app_appearance_config` (clé/valeur existante) et lecture partagée de la configuration pour éviter une requête par indicateur.
- Composant réutilisable de chargement, avec repli sur l’indicateur actuel et styles d’animation respectant `prefers-reduced-motion`.
- Vérification par tests ciblés, contrôle des erreurs de compilation et inspection visuelle des principaux parcours accessibles.