

## Audit — 3 nouveaux bugs identifiés

### Causes racines

| # | Erreur | Source réelle |
|---|---|---|
| 1 | `column "circonscription_fonciere" does not exist` (encore) | Trigger `sync_approved_contribution_to_parcel` (AFTER UPDATE) référence `NEW.circonscription_fonciere` ET INSERT/UPDATE dans `cadastral_parcels.circonscription_fonciere` — colonne **inexistante** sur les deux tables. La migration précédente a corrigé `create_parcel_from_approved_contribution` mais a oublié ce 2e trigger frère. |
| 2 | `cadastral_building_permits_administrative_status_check` violated | `permits.ts` envoie `'Conforme'`, `'Non autorisé'`, `'En attente'` mais la contrainte CHECK n'accepte QUE l'enum standard EN: `pending / in_review / approved / rejected / completed / cancelled`. |
| 3 | `Lotissements: Un motif de rejet est obligatoire` | `certificatesAndRequests.ts` (subdivision) génère du statut `'rejected'` sans `rejection_reason` (trigger `enforce_rejection_reason`). Idem côté mutations potentiellement. |

### Plan de correction

**Lot A — Migration BD (1 fichier)**
- Recréer `sync_approved_contribution_to_parcel` en supprimant les 2 occurrences de `circonscription_fonciere` (ligne 56 dans le UPDATE, ligne 91 dans la liste de colonnes INSERT + valeur correspondante dans VALUES).

**Lot B — Générateurs (3 fichiers)**
- `generators/permits.ts` : remplacer `ADM_STATUSES = ['Conforme','Non autorisé','Conforme','En attente','Conforme']` par l'enum standard `['approved','rejected','approved','pending','completed']`.
- `generators/certificatesAndRequests.ts` :
  - **Mutations** : ajouter `rejection_reason: 'TEST: rejet automatique simulé'` quand `status === 'rejected'` (déjà présent dans `rejection_reason` mais conditionné — vérifier qu'il est bien posé, sinon l'imposer).
  - **Subdivisions** : ajouter `rejection_reason: 'TEST: rejet automatique simulé'` quand `status === 'rejected'`.

**Vérification post-fix**
- Relancer « Générer données test » → les 3 catégories (Bornages/hypothèques/autorisations + Mutations/lotissements + Contributions→approval) doivent passer sans erreur en console.

