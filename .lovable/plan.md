## Audit Lotissement — Clôturé ✅

P0 (cohérence financière), P1 (workflow + sécurité certificats), P2 (stats serveur + analytics + lots), P3 (perf/UX) tous livrés.

Voir `mem://admin/subdivision-admin-audit-fr` pour la trace exhaustive (lots A → K).

### Reste optionnel (à faire si besoin)
- Surfacer `AdminSubdivisionInfrastructureTariffs` et `AdminSubdivisionRoadSurfaceMaterials` comme onglets explicites du hub plutôt qu'imbriqués dans Frais/Zonage (pure UX, non bloquant).
- Couvrir `common_space_fee_per_sqm_usd` par une catégorie infra `common_space_*` pour fermer le dernier risque de double facturation (Lot I).
- Migrer la génération PDF du certificat vers l'edge `approve-subdivision` (actuellement client + upload bucket privé — déjà aligné sur Expertise/Mutation).
