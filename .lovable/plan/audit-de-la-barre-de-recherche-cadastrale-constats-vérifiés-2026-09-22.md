# Audit de la barre de recherche cadastrale — constats vérifiés et correctifs

Audit de la recherche de la carte cadastrale (page carte, barre de la page Services, filtres avancés,
historique/favoris) et de sa couche base de données (règles d'accès, fonction de recherche, index),
avec vérifications directes en base.

## Ce que j'ai trouvé

### Bloquants (vérifiés)

1. **La recherche prédictive de la barre des Services ne peut rien proposer.**
   Elle interroge directement la table des parcelles, dont la lecture est réservée aux
   administrateurs. Pour tout visiteur ou utilisateur standard, la liste de suggestions revient
   toujours vide, en silence.

2. **Faille d'accès dans la fonction serveur de consultation d'une parcelle.**
   Le numéro saisi est comparé en « correspondance approchée » sans neutraliser les jokers.
   Un utilisateur qui saisit `%` obtient la première parcelle de la base, et le contrôle
   « services déjà payés » se fait de la même façon : un accès payé sur une parcelle peut
   déverrouiller les données d'une autre.

3. **« Parcelle introuvable » affiché à tort sur la carte.**
   La recherche de la carte ne compare qu'aux 2 000 parcelles chargées côté navigateur. Au-delà,
   une parcelle existante est déclarée absente et l'utilisateur est invité à la recréer —
   avec risque de doublon de contribution.

### Bugs et fragilités

4. **Jokers non neutralisés dans les suggestions et les filtres géographiques** (`%`, `_`) :
   résultats incohérents et requêtes inutilement coûteuses.
5. **Ouvrir la page Services avec un lien de recherche efface tous les autres paramètres d'URL**
   (y compris un retour de paiement), car l'URL est intégralement vidée.
6. **Historique de recherche fragile** : écritures basées sur une valeur périmée (deux ajouts
   rapprochés en perdent un), identifiants potentiellement identiques, favoris sans limite
   ni purge, aucune tolérance aux données corrompues.
7. **Échec silencieux de la recherche avancée** : en cas d'erreur serveur, l'utilisateur voit
   « Aucune parcelle ne correspond aux critères » au lieu d'un message d'erreur.
8. **Saisie rejetée en bloc** dans la barre des Services : un collage contenant un caractère
   interdit annule toute la saisie, alors que la barre de la carte nettoie le texte.

### Code mort

9. `useSearchConfig` n'est plus utilisé nulle part.
10. Messages d'erreur et validation dupliqués entre les deux barres de recherche.

### Performance

11. Aucun index adapté à la recherche par fragment de numéro de parcelle ou de titre :
    chaque suggestion déclenche un balayage complet de la table.
12. La liste des suggestions de la carte se recalcule sur l'ensemble des parcelles à chaque
    frappe stabilisée, sans mémoïsation des sous-ensembles.

## Corrections proposées, par étapes

**Étape A — Sécurité et exactitude côté serveur (migration)**
- Comparaison stricte du numéro de parcelle dans la fonction de consultation et dans le contrôle
  des services payés (plus de jokers exploitables).
- Nouvelle fonction de recherche publique renvoyant uniquement des données non confidentielles
  (numéro, référence de titre, localisation, coordonnées), pour les suggestions et la vérification
  d'existence.
- Index de recherche par fragment sur le numéro de parcelle et la référence de titre.

**Étape B — Suggestions réellement fonctionnelles**
- La barre des Services interroge la source publique via la nouvelle fonction, avec neutralisation
  des jokers, annulation des requêtes obsolètes et message d'erreur en cas d'échec.
- Nettoyage de la saisie au lieu du rejet complet, cohérent avec la barre de la carte.
- Conservation des autres paramètres d'URL à l'ouverture.

**Étape C — Fin des faux « introuvable » sur la carte**
- Avant de proposer la création d'une parcelle, vérification serveur de son existence ;
  si elle existe, elle est sélectionnée et centrée au lieu d'inviter à la recréer.

**Étape D — Historique, favoris et retours d'erreur**
- Écritures d'historique fiables, identifiants uniques, plafond et purge des favoris, tolérance
  aux données corrompues.
- Message d'erreur explicite quand la recherche avancée échoue.

**Étape E — Nettoyage et performance**
- Suppression du hook de configuration inutilisé, mutualisation des règles de saisie et des
  messages entre les deux barres, mémoïsation du filtrage des suggestions de la carte.

Vérification après chaque étape : contrôle de types et suite de tests complète.

## Détails techniques

- `get_cadastral_parcel_data()` : `parcel_number ILIKE p_parcel_number` → `=` (upper/trim),
  idem sur `cadastral_service_access.parcel_number`.
- Nouvelle RPC `search_parcels_public(p_query text, p_mode text, p_limit int)` (SECURITY DEFINER,
  `SET search_path = public`), lisant `cadastral_parcels_public`, `EXECUTE` à `anon`/`authenticated`,
  échappement `%`/`_`, respect du mode test (`TEST-%`).
- Index `pg_trgm` : `cadastral_parcels(parcel_number gin_trgm_ops)` et
  `(title_reference_number gin_trgm_ops)`.
- `CadastralSearchBar.tsx` : suggestions via la RPC + `escapeIlike`, `AbortController`/garde de
  requête, `setSearchParams` préservant les autres clés, `handleInputChange` sanitizant.
- `CadastralMap.tsx` : `handleManualSearchClick`/`noResult` consultent la RPC avant d'ouvrir le CCC ;
  `useMemo` pour `byParcel`/`byTitle`.
- `useSearchHistory.tsx` : `setState` fonctionnel, `crypto.randomUUID()`, `MAX_FAVORITES`,
  parsing défensif.
- `useAdvancedCadastralSearch.tsx` : remontée d'erreur (toast) + `escapeIlike` sur les filtres texte.
- Suppression de `src/hooks/useSearchConfig.tsx`.
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
