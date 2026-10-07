# Supprimer les onglets « Géométrie » et « Cohérence & Anti-fraude » d'Analytics

## Ce qui change pour vous
- Les onglets « Géométrie » et « Cohérence & Anti-fraude » disparaissent d'Analytics (barre d'onglets, carte, réglages admin).
- Leurs visuels et chiffres clés disparaissent avec eux (surfaces, côtés, périmètre, GPS, accès routier ; écarts taxes/hypothèques/litiges, correctives, historique déclaré).
- Rien d'autre ne change : formulaire CCC, carte cadastrale, admin anti-fraude (tentatives, utilisateurs bloqués) et les visuels fraude de l'onglet « Contributions » restent en place.

## Détails techniques
- `ProvinceDataVisualization.tsx` : retirer les imports lazy `GeometryBlock` / `ConsistencyBlock`, leurs icônes et entrées du mapping onglet → bloc.
- Supprimer `blocks/GeometryBlock.tsx` et `blocks/ConsistencyBlock.tsx`, puis tout utilitaire/test qui n'a plus aucun consommateur (vérifié par recherche ; ne pas toucher `cccConsistency` utilisé ailleurs).
- `analyticsTabsRegistry.ts` : supprimer les entrées `geometry` et `consistency`.
- Nettoyer toute référence restante (`tab=geometry` / `consistency` dans liens, admin de configuration, synchronisation, traductions) ; un lien vers un onglet supprimé retombe sur l'onglet par défaut.
- Base de données : migration supprimant les réglages enregistrés `tab_key in ('geometry','consistency')` de `analytics_charts_config`.
- Vérification : suite de tests et contrôle du code.
