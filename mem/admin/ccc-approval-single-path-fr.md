---
name: Approbation CCC — chemin d'écriture unique
description: Un seul trigger écrit la parcelle et les historiques à l'approbation d'une contribution CCC
type: feature
---

À l'approbation d'une contribution cadastrale :

- **Un seul trigger écrit `cadastral_parcels`** : `sync_contribution_to_parcel_trigger` (AFTER UPDATE → `sync_approved_contribution_to_parcel`), qui gère la création (contribution « new ») et la mise à jour (contribution « update »). Le trigger BEFORE `trigger_create_parcel_on_approval` et sa fonction `create_parcel_from_approved_contribution` ont été supprimés. Ne jamais les recréer.
- **Les historiques normalisés** (propriété, bornage, taxes, hypothèques, autorisations de bâtir) sont insérés **par ce même trigger**, avec gardes anti-doublon. `src/components/admin/ccc/cccApproval.ts` ne doit **jamais** les réinsérer : il se limite au changement de statut et au contrôle d'existence de la parcelle (avec filtre `deleted_at IS NULL`).
- Statuts en base en anglais (`pending`, `active`, etc.), jamais en français.
- **Toute nouvelle colonne du formulaire CCC doit être ajoutée dans les deux branches** (INSERT et UPDATE) de `sync_approved_contribution_to_parcel` et dans `buildContributionPayload`, sinon la donnée est perdue.
- Mesures d'appartement : colonnes `apartment_length / width / height / orientation` sur `cadastral_contributions` et `cadastral_parcels`.
- `declared_usage` est normalisé via `public.normalize_declared_usage(usage, construction_type)`.
- Soumission : `source_form_type = 'ccc'` et `check_contribution_abuse` appelée avant insertion.
