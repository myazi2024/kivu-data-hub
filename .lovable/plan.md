## Problème

À l'approbation d'une contribution, le toast `Contribution approuvée mais erreur lors de la création de la parcelle` s'affiche. Cause racine : **la parcelle est créée deux fois**.

1. Le trigger DB `trigger_create_parcel_on_approval` (fonction `create_parcel_from_approved_contribution`) crée déjà la parcelle dans `cadastral_parcels` quand `status` passe à `approved`.
2. Le trigger DB `sync_contribution_to_parcel_trigger` (fonction `sync_approved_contribution_to_parcel`) met aussi à jour la parcelle si une contribution approuvée est éditée.
3. Le composant `AdminCCCContributions.tsx` fait **en plus** un `INSERT` manuel ligne 322 (nouvelle contribution) et un `UPDATE` manuel ligne 251 (contribution `update`). L'INSERT entre en conflit avec l'unicité de `parcel_number` → échec silencieux côté client → toast d'erreur.

## Plan

### Refactor `src/components/admin/AdminCCCContributions.tsx` (handleApprove)

1. **Supprimer** le bloc `INSERT` manuel sur `cadastral_parcels` (lignes ~322‑386).
2. **Supprimer** le bloc `UPDATE` manuel sur `cadastral_parcels` (lignes ~251‑311) pour la branche `isUpdateContribution`.
3. Après l'update de la contribution (`status='approved'`), récupérer `targetParcelId` :
   - branche `update` : `targetParcelId = updatedContribution.original_parcel_id` (inchangé).
   - branche création : `SELECT id FROM cadastral_parcels WHERE parcel_number = updatedContribution.parcel_number` (créé à l'instant par le trigger).
   - Si le SELECT renvoie 0 ligne → toast d'erreur explicite et `return`.
4. Conserver intégralement la logique de création des historiques associés (`cadastral_ownership_history`, `cadastral_boundary_history`, `cadastral_tax_history`, `cadastral_building_permits`, `cadastral_mortgages`) qui utilise `targetParcelId`.
5. Conserver les messages de succès, audit, analytics, `fetchContributions()`.

### Hors scope

- Aucune migration SQL. Les triggers `create_parcel_from_approved_contribution` et `sync_approved_contribution_to_parcel` (déjà corrigés pour `area_hectares`) restent inchangés.
- Aucune modification des contraintes `declared_usage`, `parcel_type`, etc.
- Aucune modification de la création des historiques / hypothèques.

### Vérification post-fix

- Approuver une contribution `pending` (ex. `SU/123456`, `declared_usage = "Usage mixte"`) → toast succès, parcelle visible dans `cadastral_parcels` (créée par trigger), histoires créées, code CCC généré.
- Approuver une contribution de type `update` → la parcelle existante reflète les nouvelles données (via trigger sync), aucune duplication.
- Aucune erreur `duplicate key value violates unique constraint "cadastral_parcels_parcel_number_key"` dans les logs Postgres.
