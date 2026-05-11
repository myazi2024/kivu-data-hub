## Objectif

Aligner les modules Admin (réception, affichage, validation des contributions CCC) avec la totalité du formulaire CCC du front-end, supprimer les bugs / triggers SQL qui font échouer la soumission, puis vérifier qu'un formulaire complet se soumet et arrive bien dans Admin → CCC.

## Constat de l'audit

### A. Soumission front-end (`useCCCFormState.ts` + `useCadastralContribution.tsx`)

1. Le retry réseau et le pré-check `navigator.onLine` ont déjà été ajoutés (étape précédente). L'erreur "Failed to fetch" persiste très probablement parce qu'on appelle deux fois Storage par fichier (`upload` puis `createSignedUrl`) et qu'on enchaîne plusieurs uploads (owner doc, titres multiples, reçus taxes, hypothèques, permis, plans, photos) avant l'INSERT — un seul incident réseau bloque tout. Pas de fallback "stocker l'URL `cadastral-documents://path` et générer la signed URL côté Admin à la lecture".
2. Toast "impossible de télécharger le document du propriétaire" : message générique réutilisé pour tous les uploads, ne dit pas quel fichier a échoué (déjà partiellement corrigé, à finaliser).
3. Pas de timeout `AbortController` actif (présent dans `uploadRetry.ts` mais jamais branché sur les calls Storage).

### B. Backend — triggers qui peuvent faire échouer l'INSERT silencieusement

1. **`sync_current_owner_name`** : `(NEW.current_owners_details->0->>'since')::DATE`. Si l'utilisateur n'a pas saisi `since` (chaîne vide), le cast DATE explose et tout l'INSERT est rejeté avec une erreur Postgres opaque. Le builder front-end envoie pourtant `since: ''` quand le champ est vide.
2. **`format_parcel_number_with_prefix`** : reformate `parcel_number` mais le contrôle d'unicité `cadastral_contributions_user_parcel_active` se base sur la valeur formatée → un retry après upload partiel re-tente l'INSERT et tombe en doublon (23505) sans rollback des fichiers déjà uploadés.
3. **`auto_generate_ccc_code`** : utilise `OLD.status` ; en cas d'INSERT direct avec `status='approved'` (mode test) ça crash car `OLD` est NULL — non bloquant pour l'utilisateur final mais à durcir.

### C. Admin — réception & affichage (`AdminCCCContributions.tsx`, `ccc/CCCDetailsDialog.tsx`, `ccc/types.ts`, `ccc/cccCompleteness.ts`)

Champs présents en DB et **envoyés par le formulaire** mais **absents de la fiche Admin** :

| Champ DB | Statut Admin |
|---|---|
| `sound_environment`, `nearby_noise_sources` | jamais affichés |
| `is_occupied`, `occupant_count`, `hosting_capacity` | jamais affichés |
| `rental_start_date` (requis si usage = Location) | jamais affiché |
| `source_form_type` | jamais utilisé pour filtrer ccc/tax/mortgage/permit |
| `appeal_*` | typé mais pas de bloc dans CCCDetailsDialog |
| `changed_fields`, `change_justification` (mode édition) | non affichés |

`ccc/types.ts` ne déclare pas ces colonnes → typage `Contribution` désynchronisé du `select('*')`.

`cccCompleteness.ts` ignore les nouveaux champs → score de complétude faussement bas, ce qui affecte `calculate_ccc_value()` (récompense plus faible que due).

### D. Optimisations / redondances

- `AdminCCCContributions.tsx` boucle de pagination `select('*')` sur toutes les contributions sans LIMIT → coût Realtime + table de 1000+ lignes. À remplacer par un fetch paginé serveur (déjà fait sur d'autres modules admin).
- Doublon : le builder snake_case existe à la fois dans `useCadastralContribution.tsx` et indirectement dans `contributionFormMapping.ts` (sens inverse) — pas de source unique pour la liste des champs.

## Plan d'action

### 1. Durcir la soumission (front + back)

- **`useCCCFormState.ts`** : 
  - Préciser le toast d'erreur upload avec le **type de document** (déjà partiel, à finaliser pour reçus/permis/photos).
  - Brancher `withTimeout` (60 s, AbortController) sur `upload` et `createSignedUrl`.
  - Si upload owner doc échoue **après** 2 retries, proposer "Réessayer cet envoi" sans tout recommencer (mémoriser les URLs déjà signées via `uploadedFiles` ref existant).
- **`useCadastralContribution.tsx`** : sanitiser le payload avant envoi — convertir `since: ''` en `null`, idem pour toutes les dates / numbers vides, dans `buildContributionPayload`.

### 2. Corriger les triggers SQL bloquants (migration)

- `sync_current_owner_name` : caster `since` en DATE uniquement si non vide (`NULLIF(... ,'')::DATE`). Idem garde sur `legalStatus`.
- `auto_generate_ccc_code` : guard `IF TG_OP = 'UPDATE' AND OLD.status ...`.
- Ajouter trigger `BEFORE INSERT` qui normalise les chaînes vides → NULL pour les colonnes DATE / NUMERIC sensibles (`current_owner_since`, `title_issue_date`, `rental_start_date`, `construction_year`, `lease_years`, `area_sqm`).

### 3. Aligner le module Admin sur le formulaire

- **`ccc/types.ts`** : ajouter `sound_environment`, `nearby_noise_sources`, `is_occupied`, `occupant_count`, `hosting_capacity`, `rental_start_date`, `source_form_type`, `changed_fields`, `change_justification`.
- **`CCCDetailsDialog.tsx`** : nouvel onglet "Environnement & Occupation" (sons + occupation) ; afficher `rental_start_date` dans Construction ; badge `source_form_type` ; bloc "Modifications justifiées" si `contribution_type='update'`.
- **`cccCompleteness.ts`** : intégrer les nouveaux champs dans le score (poids faibles).
- **`AdminCCCContributions.tsx`** : remplacer la boucle paginée client par RPC `list_admin_contributions(p_status, p_limit, p_offset)` retournant `total_count` + page (cohérent avec les autres hubs admin).

### 4. Vérification end-to-end

- Smoke test manuel : remplir CCC complet (avec doc propriétaire, 2 titres, 1 reçu taxe, 1 permis), soumettre.
- Inspecter `cadastral_contributions` (dernière ligne) : tous les nouveaux champs présents.
- Ouvrir Admin → CCC → la contribution s'affiche dans "En attente", onglets remplis (y compris Environnement & Occupation).
- Approuver → vérifier génération `cadastral_contributor_codes` + notification.

## Détails techniques

- Aucun changement de schéma de table requis (toutes les colonnes existent déjà).
- Migration SQL : 1 seul fichier, modifications de fonctions + nouveau trigger de normalisation. `SET search_path = public` respecté.
- Pas de modification du bucket `cadastral-documents` ni des policies RLS (déjà conformes `${userId}/...`).
- Aucune dépendance npm à ajouter.

## Hors scope

- Refonte du queueing edge function (proposé par la doc Stack Overflow) : non nécessaire ici, l'INSERT contribution est rapide ; le problème est upload + triggers, pas un timeout edge.
- Réécriture de `useCadastralContribution` en `useMutation` TanStack Query (peut être fait plus tard).
