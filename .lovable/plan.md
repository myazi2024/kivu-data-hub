# Étendre à 26 provinces de la RDC (520 parcelles)

## Statut : ✅ Implémenté

## Résumé
Le générateur de données test couvre désormais les **26 provinces** de la RDC avec **520 parcelles** (26 × 20 : 15 SU + 5 SR par province), étalonnées sur 10 ans.

### Entités générées
| Entité | Volume |
|--------|--------|
| Parcelles | 520 |
| Contributions | 520 |
| Factures (~33%) | ~173 |
| Paiements | sur factures payées |
| Codes CCC (~33%) | ~173 |
| Titres fonciers | 52 (2/province) |
| Expertises | 52 (2/province) |
| Litiges | 52 (2/province) |
| Mutations | 52 (2/province) |
| Lotissements | 26 (1/province) |
| Fraudes | 52 (2/province) |
| Certificats | 52 (2/province) |

### Fichiers modifiés
- `testDataGenerators.ts` : 26 provinces, scaling dynamique, batching
- `useTestDataActions.ts` : message de succès mis à jour
