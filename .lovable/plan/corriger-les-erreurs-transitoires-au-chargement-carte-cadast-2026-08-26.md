# Corriger les erreurs transitoires au chargement (carte cadastrale + formulaire CCC)

## Ce qui se passe

Les messages « Erreur lors du chargement des frais » et « Erreur : Impossible de charger les configurations » apparaissent puis disparaissent parce que les premières requêtes partent avant que la session soit prête. Les logs de la console confirment la cause exacte : PostgREST renvoie l'erreur `PGRST303 – JWT issued at future` (décalage d'horloge / jeton pas encore valide) sur plusieurs appels au chargement :

- récupération du profil
- config de la carte (`ParcelMapPreview`)
- configs de contribution (`useCCCFormPicklists`, `useContributionConfig`)

Quelques centaines de millisecondes plus tard, le jeton est rafraîchi et tout fonctionne : d'où l'erreur qui « disparaît ». Le code actuel affiche immédiatement un toast destructif dès le premier échec, sans réessai (sauf `useCatalogConfig` et `useAuth` qui gèrent déjà `PGRST002`).

## Ce qu'on va faire

1. Créer un utilitaire partagé `src/lib/supabaseRetry.ts` :
   - détecte les erreurs transitoires (`PGRST002`, `PGRST301`, `PGRST303`, erreurs réseau)
   - réessaie jusqu'à 3 fois avec back-off (400 ms / 900 ms / 1800 ms)
   - ne remonte l'erreur que si tous les essais échouent

2. Brancher cet utilitaire sur les hooks qui déclenchent les toasts observés :
   - `useContributionConfig.tsx` (formulaire CCC)
   - `useCCCFormPicklists.tsx` (picklists CCC)
   - `useSearchConfig.tsx` (barre de recherche cadastrale)
   - `useLandTitleDynamicFees.tsx` (« chargement des frais »)
   - la config carte dans `ParcelMapPreview`
   - `useCatalogConfig.tsx` : remplacer sa boucle de réessai maison par l'utilitaire commun

3. Ne plus afficher de toast destructif tant qu'un réessai est en cours ; en cas d'échec définitif seulement, afficher le message (et conserver les valeurs de repli existantes pour que le formulaire reste utilisable).

## Détails techniques

- L'utilitaire enveloppe le `PromiseLike` du query builder Supabase et retourne `{ data, error }` comme aujourd'hui, donc les appels changent d'une seule ligne.
- Aucune modification de base de données, de RLS ou de logique métier : uniquement la robustesse du chargement.
- Vérification : typecheck, puis chargement de `/cadastral-map` et ouverture du formulaire CCC dans le navigateur pour confirmer l'absence de toasts d'erreur et d'erreurs PGRST303 non rattrapées dans la console.
