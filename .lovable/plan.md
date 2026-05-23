## Suite de l'audit Lotissement — P1 & P2

P0 est livré (anti-double facturation + matching localisation). Voici le plan pour les phases suivantes.

### P1 — Sécurité certificats + UX admin

**1. Certificat lotissement côté serveur (privé)**
- Créer bucket privé `subdivision-certificates` (RLS via signed URL only).
- Déplacer `generateAndUploadCertificate` du client (`AdminSubdivisionRequests.submitAction`) vers l'edge function `approve-subdivision` (créer si absente, sinon enrichir).
- Créer RPC `get_signed_subdivision_certificate(request_id uuid)` (SECURITY DEFINER, `SET search_path=public`, vérifie rôle admin ou propriétaire).
- Helper client `src/utils/subdivisionCertificateUrl.ts` → `openSubdivisionCertificate(id)`.
- Aligné sur le pattern Expertise/Mutation (memory).

**2. Affichage frais infrastructure**
- Ajouter colonne/section `infrastructure_fee_usd` et breakdown détaillé (`road_length_billable_m`, `road_length_covered_by_infra_m`, `infrastructure_total`) dans `RequestDetailsDialog`.
- Ajouter `province/ville/commune` au type `SubdivisionRequest` + sélection SQL.

**3. Hub admin restructuré**
- Surfacer `AdminSubdivisionInfrastructureTariffs` et `AdminSubdivisionRoadSurfaceMaterials` comme sous-onglets explicites du hub "Frais" (au lieu d'être imbriqués cachés).
- Marquer `road_fee_per_linear_m_usd` et `common_space_fee_per_sqm_usd` comme DEPRECATED dans l'UI (badge + tooltip "remplacé par tarifs infrastructure").

**4. Corrections bugs**
- `handleStartReview`: toast d'erreur visible.
- Échapper `%`/`_`/`,` dans recherche serveur (helper `escapeIlike` déjà utilisé ailleurs).
- Remplacer `pendingCount` local par `useAdminPendingCounts`.
- Retirer `selected_infrastructures` du flux si non utilisé, ou documenter.

### P2 — Stats, analytics, bulk actions

**5. RPC stats unifiée**
- `get_subdivision_admin_stats()` : compte par statut, distingue `approved` vs `paid`, KPI sans `limit(1000)`.
- `AdminSubdivisionAnalytics` consomme la RPC (suppression pagination implicite).

**6. AdminSubdivisionLots**
- Filtres (statut, parent), lien vers demande parent.

**7. Bulk actions robustes**
- Remplacer `for...await` séquentiel par `Promise.allSettled` chunké (5 par batch).
- Accumuler échecs → export CSV téléchargeable.

### Fichiers touchés

`supabase/functions/approve-subdivision/index.ts` (new/edit), migration SQL (bucket+RPC+stats), `AdminSubdivisionRequests.tsx`, `RequestDetailsDialog`, `AdminSubdivisionHub.tsx`, `AdminSubdivisionFeesConfig.tsx`, `AdminSubdivisionAnalytics.tsx`, `AdminSubdivisionLots.tsx`, `src/utils/subdivisionCertificateUrl.ts` (new), `src/hooks/useSubdivisionRequests.ts`, memory `subdivision-admin-audit-fr.md`.

### Ordre d'exécution proposé

1. Migration (bucket + RPC certificat + RPC stats)
2. Edge `approve-subdivision` + helper client
3. Refonte `AdminSubdivisionRequests` (certif serveur, bugs, breakdown)
4. Hub restructuré + DEPRECATED badges
5. Analytics + Lots
6. Bulk actions robustes
7. Mise à jour memory
