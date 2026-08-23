---
name: Approbation CCC — chemin d'écriture unique
description: Un seul trigger écrit la parcelle à l'approbation d'une contribution CCC ; les historiques restent gérés côté front
type: feature
---

À l'approbation d'une contribution cadastrale :

- **Un seul trigger écrit `cadastral_parcels`** : `sync_contribution_to_parcel_trigger` (AFTER UPDATE → `sync_approved_contribution_to_parcel`), qui gère à la fois la création (contribution « new ») et la mise à jour (contribution « update »). Le trigger BEFORE `trigger_create_parcel_on_approval` et sa fonction `create_parcel_from_approved_contribution` ont été supprimés (double écriture avec règles divergentes). Ne jamais les recréer.
- **Les historiques** (propriété, bornage, taxes, permis, hypothèques) sont insérés côté front dans `src/components/admin/ccc/cccApproval.ts`. Ne pas les dupliquer dans un trigger.
- **Toute nouvelle colonne du formulaire CCC doit être ajoutée dans les deux branches** (INSERT et UPDATE) de `sync_approved_contribution_to_parcel`, sinon la donnée est perdue à l'approbation.
- `declared_usage` est normalisé à la copie via `public.normalize_declared_usage(usage, construction_type)` : l'ancienne valeur `location` devient l'usage réel et `is_rented = true`.
- `calculate_ccc_value` (appelée par `generate_cadastral_contributor_code`) doit rester alignée sur les blocs du formulaire : locatif, valeur marchande, qualification du bâti.
- Soumission : `source_form_type` est toujours renseigné (`'ccc'`) et `check_contribution_abuse` est appelée avant insertion (limites 3/parcelle/24 h et 10/24 h).
