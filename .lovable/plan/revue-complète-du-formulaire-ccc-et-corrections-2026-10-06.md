# Revue complète du formulaire CCC et corrections

## Objectif
Vérifier chaque onglet (Infos, Localisation, Historique, Obligations, Valeur, Récapitulatif) et le serveur, puis corriger bugs, incohérences, code mort et fonctions orphelines, sans ajouter de fonctionnalité.

## Constats déjà relevés
- Trois composants du dossier cadastral ne sont plus utilisés nulle part : `LockedServiceOverlay`, `PermitPaymentDialog`, `VerificationButton`.
- Le type de données de la contribution garde encore les champs supprimés « Disponibilité » et « Prix négociable » (`availability`, `availabilityNote`, `priceNegotiable`).

## Étapes
1. Revue onglet par onglet (front) : règles d'affichage, champs dépendants, validation du bouton Suivant, récapitulatif, cohérence avec les dernières modifications (Mur mitoyen + question route, location tous matériaux, loyer propriétaire, contrat de location, Valeur sans disponibilité).
2. Revue serveur : `validate_contribution_completeness`, trigger `enforce_road_sides_boundary_rules` (doit accepter la nouvelle saisie « Mur/Limite + route Oui/Non »), règle d'éligibilité locative alignée sur tous les matériaux, score anti-fraude, RPC d'approbation.
3. Nettoyage : supprimer les composants orphelins confirmés, les champs et types obsolètes, imports/fonctions inutilisés, branches mortes.
4. Corrections des bugs trouvés en 1-2 (front et migration si nécessaire).
5. Validation : typecheck, build, suite de tests complète, ajout de tests ciblés pour chaque bug corrigé.

## Détails techniques
- Détection des orphelins par recherche de références sur `src/`, confirmation manuelle avant suppression.
- Toute correction serveur passe par une nouvelle migration (pas de modification de migration existante).
- Vérification visuelle impossible (formulaire derrière connexion, backend externe) : la validation reposera sur le code et les tests.
