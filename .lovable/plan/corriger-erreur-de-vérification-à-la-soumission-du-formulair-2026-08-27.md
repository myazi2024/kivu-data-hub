# Corriger « Erreur de vérification » à la soumission du formulaire CCC

## Ce qui se passe

Avant d'enregistrer la contribution, le formulaire lit votre profil pour vérifier que votre compte n'est pas bloqué. Si cette lecture échoue, la soumission est annulée avec le message « Impossible de vérifier votre profil ».

Vérifications effectuées en base : les colonnes lues (`is_blocked`, `blocked_reason`, `fraud_strikes`) existent bien, les droits de lecture et les règles d'accès sur `profiles` sont en place, et il n'y a aucun profil en double. La cause probable est donc une erreur transitoire de session/JWT (même famille d'erreurs PGRST303/PGRST002 déjà rencontrée au chargement de la carte cadastrale) ou l'absence de ligne de profil — mais cela reste à confirmer par le code d'erreur réel, qui n'est aujourd'hui pas affiché.

## Correctifs

1. **Rendre l'erreur diagnostique** : afficher le code et le message réels de l'erreur dans le toast (et les journaliser), pour ne plus perdre l'information.
2. **Réessayer avant d'échouer** : passer la lecture du profil par l'utilitaire de réessai existant (`withSupabaseRetry`), qui rejoue la requête sur les erreurs transitoires de jeton/schéma/réseau.
3. **Rafraîchir la session** : si l'erreur persiste et qu'elle est liée au jeton, tenter un rafraîchissement de session puis un dernier essai, plutôt que d'abandonner directement.
4. **Ne pas bloquer inutilement** : si après réessais l'erreur reste transitoire (et non un refus de droits), laisser la soumission continuer — le blocage de compte reste de toute façon appliqué côté base via les règles d'accès et les déclencheurs. Un vrai refus d'accès ou un compte bloqué continue de stopper la soumission avec le message adapté.
5. Appliquer le même traitement au chemin de mise à jour d'une contribution existante, qui utilise la même fonction de vérification.

## Détails techniques

- Fichier : `src/hooks/useCadastralContribution.tsx`, fonction `validateUserSecurity` (lecture `profiles` ligne ~516).
- Utiliser `withSupabaseRetry` et `isTransientSupabaseError` de `src/lib/supabaseRetry.ts`.
- En cas d'erreur persistante transitoire : `supabase.auth.refreshSession()` puis un ultime essai ; si l'erreur reste transitoire → poursuivre la soumission (`allowed: true`, sans marquage de fraude). Si l'erreur est un refus de droits (42501 / PGRST116 non transitoire) → bloquer avec le message enrichi du code d'erreur.
- Aucun changement de schéma ni de règles d'accès n'est nécessaire.

## Vérification

- Contrôle TypeScript.
- Le message d'erreur affichera désormais le code exact, ce qui permettra, si le problème réapparaît, d'identifier immédiatement la cause côté base.
