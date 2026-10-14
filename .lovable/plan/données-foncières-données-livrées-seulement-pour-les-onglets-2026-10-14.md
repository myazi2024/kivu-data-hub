# Données foncières : données livrées seulement pour les onglets achetés

## Constat vérifié
- L'écran charge en une fois les fiches détaillées de 12 sources (parcelles, contributions, titres, hypothèques, litiges, lotissements, etc.) et calcule lui-même tous les visuels.
- Les règles d'accès actuelles de ces sources réservent la lecture aux admins et aux propriétaires des fiches. Conséquence : un acheteur ne voit pas les chiffres des autres, mais **ses propres visuels achetés restent presque vides** (il ne reçoit que ses propres fiches). Les profils habilités non admins sont dans le même cas.
- Le chargement actuel fonctionne donc correctement pour les admins uniquement.

## Ce qui change pour l'utilisateur
- Un acheteur reçoit les données réelles, mais **uniquement pour les onglets où il a au moins un visuel valide**. Les autres onglets ne transmettent rien à son appareil.
- Les données sont chargées onglet par onglet, à l'ouverture de l'onglet (chargement plus léger).
- Aucune donnée nominative (noms, détails des propriétaires, justificatifs, indices de fraude) n'est envoyée, quel que soit le profil.
- Admins et profils habilités : accès complet à tous les onglets, comme aujourd'hui.

## Limite assumée (choix « par onglet »)
Dans un onglet acheté, les colonnes utiles à l'ensemble des visuels de cet onglet sont transmises : une personne experte pourrait recalculer un visuel non acheté du même onglet. Les autres onglets sont réellement protégés.

## Détails techniques
- Nouvelle RPC `get_analytics_tab_dataset(p_tab_key text, p_test boolean)` SECURITY DEFINER, `search_path = public` :
  - autorise si admin/super_admin, rôle habilité (même liste que `LandDataAccessGate`), ou ligne valide dans `analytics_visual_access` pour ce `tab_key` (`expires_at > now()`) ; sinon erreur `forbidden`.
  - renvoie un objet JSON `{ source: rows[] }` limité aux sources et colonnes de l'onglet (table de correspondance onglet → sources/colonnes dans la fonction), filtre TEST-/hors TEST, exclut `deleted_at`, enrichissement géographique par parcelle fait côté serveur.
  - colonnes retirées partout : `current_owners_details`, `is_suspicious`, `fraud_score`, `fraud_reason`, identités, justificatifs ; historiques propriétaires/taxes restent via les fonctions de statistiques existantes.
  - GRANT EXECUTE à `authenticated` uniquement ; pagination interne pour dépasser 1 000 lignes.
- Front : `useLandDataAnalytics` remplacé par `useAnalyticsTabDataset(tabKey)` (React Query, clé par onglet + mode test) ; chaque bloc et la carte lisent les données de leur onglet. La carte des circonscriptions utilise le jeu de l'onglet actif.
- `useBlockFilter` : suppression de `exportCSV` resté inutilisé.
- Tests : correspondance onglet → sources, refus d'un onglet non acheté (simulation de la RPC), filtrage des visuels conservé.
- Règle ajoutée dans `AGENTS.md` : les analyses sont lues via `get_analytics_tab_dataset`, jamais par lecture directe des tables.
