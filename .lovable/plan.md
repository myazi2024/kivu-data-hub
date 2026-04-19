

## Audit Mode Test — 3 bugs bloquants identifiés

### Causes racines (depuis console + DB)

| # | Erreur | Source |
|---|---|---|
| 1 | `column "circonscription_fonciere" does not exist` | Trigger BD `create_parcel_from_approved_contribution` insère dans `cadastral_parcels.circonscription_fonciere` — colonne **inexistante**. Bloque toute mise à `approved` des contributions test (5 batchs en échec). |
| 2 | `Un motif de rejet est obligatoire` | Trigger `enforce_rejection_reason` exige `rejection_reason` non null pour `status='rejected'`. `contributions.ts` met à jour le statut sans fournir de motif. |
| 3 | `discount_code_used is required when discount_amount_usd > 0` | Trigger `enforce_discount_code_traceability` (cadastral_invoices). `invoices.ts` met `discount_amount_usd: randInt(1, 5)` sans `discount_code_used`. **Bloque définitivement la suite (factures→paiements→accès)**. |

### Plan de correction

**Lot A — Migration BD (1 fichier)**
- Supprimer toute référence à `circonscription_fonciere` du trigger `create_parcel_from_approved_contribution` (la colonne n'existe pas côté `cadastral_parcels`). Recompiler la fonction sans cette colonne dans INSERT et VALUES.

**Lot B — Générateurs test (2 fichiers)**
- `generators/contributions.ts` : pour chaque contribution passée à `rejected`, fournir `rejection_reason: 'TEST: rejet automatique simulé'` dans le UPDATE en lot.
- `generators/invoices.ts` : si `discount_amount_usd > 0`, ajouter `discount_code_used: 'TEST-PROMO-XX'` cohérent (créer un code promo de test au préalable n'est pas requis si le trigger n'exige pas la FK ; sinon on retire simplement la remise sur les factures test).

**Vérification post-fix**
- Cliquer « Générer données test » → flux complet (parcels → contributions → invoices → payments → accès) doit aboutir sans erreur dans la console.

