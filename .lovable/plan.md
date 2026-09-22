# Réduction des avertissements de sécurité de la base

L'analyseur remonte 393 avertissements, répartis en 7 types. Chaque point ci-dessous a été vérifié par requête directe en base.

## Ce que disent réellement les 393 avertissements

| Type | Nombre | Constat vérifié |
|---|---|---|
| Fonctions privilégiées appelables sans être connecté | 192 | 196 fonctions « à privilèges » existent ; 192 sont appelables par un visiteur anonyme, dont 59 sont de simples déclencheurs internes qui n'ont aucune raison d'être appelables |
| Fonctions privilégiées appelables par un utilisateur connecté | 195 | même population ; l'application n'en appelle réellement que ~75 |
| Vue à privilèges | 1 | `cadastral_parcels_public` (les 13 autres vues sont déjà en mode « invoquant ») |
| Tables protégées sans règle d'accès | 2 | `rate_limit_buckets`, `rate_limit_violations` |
| Fonction sans chemin de recherche figé | 1 | `generate_employee_matricule` (les 31 autres proviennent de l'extension de recherche floue) |
| Extension dans le schéma public | 1 | `pg_trgm` |
| Protection contre les mots de passe compromis désactivée | 1 | réglage d'authentification |

## Étapes

### A. Fermer les fonctions internes (couvre l'essentiel des 387 alertes)
Une migration qui, pour chaque fonction à privilèges du schéma public :
- retire le droit d'exécution à `public`, `anon` et `authenticated` ;
- le rend à `authenticated` uniquement pour la liste blanche des fonctions réellement appelées par l'application (~75, relevées dans le code client et les fonctions serveur, quel que soit le style d'appel) ;
- le rend à `anon` uniquement pour les fonctions volontairement publiques : recherche de parcelles, vérification d'un document par code, compteur de vues d'article, consultation de parcelle, et les fonctions de limitation de débit appelées avant connexion ;
- conserve `service_role` partout (les fonctions serveur continuent de tourner).

Les 59 fonctions déclencheurs ne reçoivent aucun droit : elles sont exécutées par la base elle-même.

### B. Règles d'accès sur les deux tables de limitation de débit
`rate_limit_buckets` et `rate_limit_violations` sont techniques : aucune lecture ni écriture depuis le navigateur. Règle unique réservant l'accès au rôle serveur, plus lecture pour les administrateurs, et retrait des droits directs à `anon` / `authenticated`.

### C. Chemin de recherche figé
`generate_employee_matricule` recréée avec `SET search_path = public`. Les 31 fonctions restantes appartiennent à l'extension `pg_trgm` et ne sont pas modifiables : elles restent signalées.

### D. Protection des mots de passe compromis
Réglage à activer par vous dans le tableau de bord d'authentification (Auth > Policies > Password protection) : il n'est pas modifiable depuis le code. Je vous indiquerai le lien exact.

## Ce que je propose de ne pas changer, et pourquoi

- **Vue `cadastral_parcels_public`** : elle est volontairement à privilèges. La table des parcelles n'est lisible que par les administrateurs ; c'est cette vue, limitée aux colonnes non confidentielles (numéro, localisation, surface, coordonnées — aucune donnée de propriétaire), qui alimente la carte publique et la recherche. La basculer en mode « invoquant » viderait la carte pour tous les visiteurs. Je laisse l'avertissement actif et documenté plutôt que de casser la carte.
- **Extension `pg_trgm` dans le schéma public** : la déplacer casserait les deux index de recherche par fragment créés récemment sur le numéro de parcelle et la référence de titre.

Après ces étapes, il devrait rester environ 35 avertissements, tous documentés ci-dessus (extension de recherche floue, vue publique, extension, réglage d'authentification).

## Détails techniques

Migration unique en PL/pgSQL parcourant `pg_proc` (schéma `public`, `prosecdef = true`) : `REVOKE EXECUTE ... FROM public, anon, authenticated`, puis `GRANT EXECUTE` selon deux listes blanches en dur (`authenticated`, `anon`). La liste blanche est construite depuis les appels relevés dans `src/**` et `supabase/functions/**`, y compris les appels sur plusieurs lignes et ceux en guillemets doubles, plus `can_subdivide_parcel`, `verify_document_public`, `check_and_consume_rate_limit`. Vérification après migration : relance de l'analyseur, contrôle que chaque nom de la liste blanche a bien reçu son droit (`has_function_privilege`), puis `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`, et un parcours de la carte cadastrale et du formulaire CCC dans le navigateur pour confirmer qu'aucun appel n'est refusé.
