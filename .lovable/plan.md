# Supprimer l'onglet Mutation d'Analytics et fiabiliser « Titres fonciers : Type de mutation »

## Constat
- L'onglet « Mutation » (clé `mutations`) existe dans Données foncières : bloc dédié, icône, entrée de registre, variables croisées, profil de carte, réglages de filtres et lignes de configuration admin.
- Le visuel « Titres fonciers : Type de mutation » existe déjà (barres horizontales), mais :
  - il compte des lignes d'historique de propriété, pas des parcelles (une parcelle vendue deux fois compte deux fois dans « Vente ») ;
  - il affiche les codes bruts (`vente`, `mise_a_jour`…) au lieu des libellés.

## Ce qui change
1. **Suppression de l'onglet Mutation**
   - Retrait de l'onglet, de son icône et de son bloc dans Données foncières.
   - Suppression du bloc, de son entrée de registre, de ses variables croisées, de son profil de carte et de ses réglages de filtres.
   - Base : suppression des lignes de configuration admin de cet onglet.
   - Conservé : la table des demandes de mutation, l'admin, l'espace utilisateur, et le chiffre « Mutations en cours » de la Carte RDC (qui utilise toujours ces données).
2. **Visuel « Titres fonciers : Type de mutation »**
   - Axe vertical : les types de mutation avec leurs libellés (Vente, Donation, Succession, Expropriation, Échange, Correction d'erreur, Mise à jour).
   - Axe horizontal : le nombre de parcelles distinctes concernées par chaque type.
   - Une parcelle ayant connu plusieurs types compte une fois dans chacun ; trié du plus fréquent au moins fréquent ; les filtres Analytics continuent de s'appliquer.

## Détails techniques
- Fichiers : `ProvinceDataVisualization.tsx`, `blocks/MutationBlock.tsx` (supprimé), `analyticsTabsRegistry.ts`, `crossVariables.ts`, `mapTabProfiles.ts`, `useAnalyticsChartsConfig.ts`, `TitleRequestsBlock.tsx`.
- `useLandDataAnalytics` garde `mutationRequests` (consommé par `useMapIndicators` / `mapMeta`).
- Nouveau helper pur `mutationTypeParcelData(records)` (parcelles distinctes par `parcel_id`, libellés via `getMutationTypeLabel`) + tests.
- Migration : `DELETE FROM analytics_charts_config WHERE tab_key = 'mutations';`.
- Vérification : tests, typecheck, recherche des restes de l'onglet `mutations` côté Analytics.
