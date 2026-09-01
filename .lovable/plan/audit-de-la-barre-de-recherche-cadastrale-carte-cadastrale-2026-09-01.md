# Audit de la barre de recherche cadastrale (Carte cadastrale)

## Constat majeur — la recherche ne renvoie rien pour les visiteurs et les utilisateurs non-admin

Vérifié en base :

- `cadastral_parcels` a RLS activée et **trois policies uniquement, toutes réservées aux admins** (`Admins can manage cadastral parcels`, `Admins can view all parcels`, `Only admins can select parcels directly`). Aucune policy `anon` / `authenticated` non-admin.
- Requête réelle avec la clé anon sur `/rest/v1/cadastral_parcels` → réponse `[]`.
- Or `src/hooks/useCadastralMapData.tsx` interroge **directement** `cadastral_parcels`.

Conséquence : pour tout visiteur non-admin, la carte est vide, le compteur affiche « 0 parcelles », aucune suggestion n'apparaît, et la recherche déclenche systématiquement le bouton « Ajouter cette parcelle » même pour une parcelle qui existe.

La vue publique prévue pour cela existe (`cadastral_parcels_public`, sans RLS, `SELECT` accordé à `anon`/`authenticated`) mais **elle n'expose pas** `gps_coordinates`, `latitude`, `longitude`, `parcel_sides`, `current_owner_name` ni `title_reference_number` — donc elle ne suffit pas telle quelle pour la carte ni pour la recherche par numéro de titre.

## Correctifs proposés

### 1. Rendre les parcelles lisibles publiquement, sans exposer les PII (back-end)

Migration :

- Étendre `cadastral_parcels_public` avec les champs non-PII nécessaires à la carte et à la recherche : `gps_coordinates`, `parcel_sides`, `latitude`, `longitude`, `title_reference_number`.
- Ne **pas** y inclure `current_owner_name` (PII payante, cf. modèle d'accès PII existant) ni `has_dispute` côté carte.
- Re-`GRANT SELECT` à `anon` et `authenticated` après recréation de la vue.

Front-end : `useCadastralMapData` lit `cadastral_parcels_public` au lieu de `cadastral_parcels`, et `ParcelData.current_owner_name` devient optionnel. Les suggestions affichent la localité au lieu du nom du propriétaire (le nom reste accessible via le parcours payant existant).

### 2. Bugs de la barre de recherche (front-end)

| # | Bug constaté | Correctif |
|---|---|---|
| 1 | Le filtrage prédictif s'exécute à chaque frappe et redessine toutes les couches Leaflet | Debounce 250 ms (`useDebounce` déjà présent) sur la requête avant filtrage/rendu |
| 2 | La touche Entrée n'ouvre rien : elle n'ajoute qu'un historique + analytics | Entrée sélectionne la première suggestion (centrage carte + panneau parcelle) |
| 3 | Choisir une suggestion n'enregistre pas la recherche dans l'historique (seule Entrée le fait) | Ajouter à l'historique dans `handleSelectParcel` |
| 4 | Les entrées d'historique de type `Filtres: ...` sont réinjectées comme texte de recherche → 0 résultat et CTA « Ajouter cette parcelle » trompeur | Détecter ces entrées et ré-appliquer les filtres avancés mémorisés au lieu du texte |
| 5 | Le changement de mode (Titre → Parcelle) laisse dans le champ des caractères interdits en mode parcelle | Re-sanitiser la saisie au changement de mode |
| 6 | Le CTA « Ajouter cette parcelle » s'affiche dès 0 résultat, y compris pendant le chargement des parcelles | Ne l'afficher que si le chargement est terminé et la recherche stabilisée (après debounce) |
| 7 | Les suggestions ne sont pas navigables au clavier et n'ont pas de rôle ARIA | `role="listbox"` / `role="option"`, navigation flèches + Entrée + Échap |
| 8 | Une recherche avancée appliquée est écrasée dès la première frappe dans la barre standard | Réinitialiser explicitement l'état de recherche avancée quand la recherche standard reprend la main |

## Détails techniques

- Migration SQL : `CREATE OR REPLACE VIEW public.cadastral_parcels_public` (+ `GRANT SELECT` à `anon`, `authenticated`).
- `src/hooks/useCadastralMapData.tsx` : source `cadastral_parcels_public`, `select` mis à jour, filtre `deleted_at` retiré (porté par la vue).
- `src/pages/CadastralMap.tsx` : debounce, gestion clavier des suggestions, historique, garde de chargement du CTA, resanitation au changement de mode.
- `src/components/cadastral/CadastralSearchModeToggle.tsx` : inchangé.
- Aucune modification de tarification, d'accès payant aux données, ni du formulaire CCC.

## Hors périmètre

- Recherche serveur paginée au-delà de la limite de 2000 parcelles (non nécessaire au volume actuel — 1 parcelle en base).
- Refonte visuelle de la barre de recherche.
