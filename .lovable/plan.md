

# Audit — Fiche Cadastrale : Design, Sécurité & Authentification

## 1. Sécurité & Authentification

### S1 — Route `/cadastral-map` non protégée (P1)
La route `/cadastral-map` dans `App.tsx` n'est **pas enveloppée dans `ProtectedRoute`**. Un utilisateur non authentifié peut accéder à la carte, effectuer une recherche et consulter les données de base renvoyées par la RPC `get_cadastral_parcel_data`. La RPC ne vérifie probablement pas `auth.uid()` pour les données non-premium.

**Correction** : Envelopper la route dans `<ProtectedRoute>` (idem pour `/test/cadastral-map`).

### S2 — `useAuth` retourne un contexte vide hors Provider (P2)
`useAuth()` (ligne 236) retourne un objet factice (`user: null`) si appelé hors du `AuthProvider`, au lieu de lever une erreur. Cela signifie que tout composant mal monté **ne détectera jamais l'absence d'authentification** et continuera silencieusement sans utilisateur.

**Correction** : Lever une erreur (`throw new Error`) si le contexte est `undefined`, sauf pour les composants de navigation explicitement exclus.

### S3 — Pas de vérification d'authentification dans `CadastralResultCard` (P2)
Le composant fait `checkMultipleServiceAccess` avec `user?.id` mais si `user` est `null` (contexte vide hors Provider, cf. S2), la vérification est simplement ignorée (`if (!user) return`). Aucun message d'erreur ni redirection vers `/auth`.

### S4 — `cleanupAuthState` supprime les clés localStorage par pattern (P3)
La fonction `signOut` (ligne 113-118) supprime toutes les clés contenant `supabase.auth.` ou `sb-`. C'est un nettoyage agressif qui pourrait supprimer des données d'autres projets Supabase sur le même domaine en développement. Risque faible en production.

### S5 — Cache de profil en mémoire sans invalidation cross-tab (P3)
Le cache `profileCache` (Map en state) n'est pas synchronisé entre les onglets. Si un admin change le rôle d'un utilisateur, celui-ci garde son ancien rôle pendant 5 minutes dans les onglets déjà ouverts.

## 2. Design & UX

### D1 — Carte rendue sans coordonnées (P2)
`CadastralMap` est toujours rendu si la section Localisation est visible, même quand `gps_coordinates` est `[]` et `latitude/longitude` sont `null`. Résultat : carte vide sans intérêt.

**Correction** : Conditionner le rendu à `(parcel.latitude && parcel.longitude) || (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0)`.

### D2 — Pas de lazy loading pour Leaflet (P3)
`CadastralMap` (Leaflet ~200KB) est importé statiquement. Sur mobile avec scroll long, la carte peut ne jamais être visible mais impacte le temps de chargement.

**Correction** : `React.lazy(() => import('./CadastralMap'))` avec `Suspense`.

### D3 — Styles `doc-table` en `<style>` inline (P3)
Les styles de la table sont injectés via une balise `<style>` dans le JSX (lignes 588-628). Cela crée un doublon à chaque montage et n'est pas purgé par Tailwind.

**Correction** : Migrer vers un fichier CSS dédié ou des classes Tailwind.

### D4 — Couleurs hardcodées en print (P3)
Ligne 623 : `background: #f3f4f6 !important` dans `@media print` — couleur hardcodée au lieu d'utiliser un jeton sémantique. Incompatible avec le standard de theming du projet.

### D5 — Header non responsive sur très petit écran (P3)
Le header (lignes 114-131) utilise `px-6 sm:px-10` mais le badge type parcelle (SU/SR) peut être tronqué sur écrans < 360px car `shrink-0` empêche le rétrécissement.

### D6 — Section Litiges : logique morte après fix B3 (P2)
Après la correction précédente (B3), `hasDisputesData` vérifie `land_disputes.length > 0`. Mais la ligne 494 teste à nouveau `land_disputes.length === 0` à l'intérieur du bloc `hasDisputesData === true` — ce bloc est donc **mort** (jamais atteint). Le message "Aucun litige foncier enregistré" ne s'affichera plus jamais.

**Correction** : Aligner le gating sur `paidServices.includes('disputes')` (comme pour history/obligations) pour distinguer "service payé mais aucun litige" de "service non payé".

## 3. Améliorations recommandées

| Priorité | Action | Impact |
|---|---|---|
| **P1** | Protéger la route `/cadastral-map` avec `ProtectedRoute` | Sécurité critique |
| **P2** | Corriger le gating Litiges : utiliser `paidServices.includes('disputes')` | Logique métier |
| **P2** | Conditionner le rendu de `CadastralMap` à la présence de coordonnées | UX |
| **P2** | Lever une erreur dans `useAuth` hors Provider | Détection de bugs |
| **P3** | Lazy-load `CadastralMap` | Performance mobile |
| **P3** | Migrer les styles `doc-table` hors du JSX | Propreté du code |
| **P3** | Remplacer la couleur print hardcodée par un jeton sémantique | Cohérence design |

## Conclusion

Le problème le plus critique est la **route non protégée** (S1) qui permet l'accès à la carte cadastrale sans authentification. Le second enjeu est la **logique morte des litiges** (D6) introduite par le fix précédent B3, qui empêche d'afficher "aucun litige" pour les utilisateurs ayant payé le service.

**Souhaitez-vous approuver pour corriger P1 (S1) et P2 (D1, D6, S2) ?**

