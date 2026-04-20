

## Audit post-implémentation — Bugs détectés dans `BillingOverviewTab` & `MortgageDisputeFeesTab`

L'intégration P1+P2 a introduit **3 bugs de schéma** dans la nouvelle vue d'ensemble. Les 9 onglets s'affichent, mais l'agrégation de la "Vue d'ensemble" échoue silencieusement (catch global) sur 3 sources sur 7 → **chiffres incomplets** dans les cartes de totaux et dans le tableau.

### Bugs identifiés

| # | Fichier | Problème | Impact |
|---|---|---|---|
| 1 | `BillingOverviewTab.tsx` ligne 49 | Requête sur `subdivision_fees_config` — **table inexistante** (vraie table : `subdivision_rate_config`) | Catégorie "Lotissement" toujours vide / erreur 404 PostgREST |
| 2 | `BillingOverviewTab.tsx` ligne 47 | `mutation_fees_config` → champ `mutation_type` **inexistant** (table plate : `fee_name`, `amount_usd`) | Référence affichée = `'—'` même quand des frais existent (cosmetic mais trompeur) |
| 3 | `BillingOverviewTab.tsx` ligne 51 | `expertise_fees_config` → champ `fee_type` **inexistant** | Idem (référence vide) |

### Constats secondaires (non bloquants)

- **Toast "Impossible de charger la vue d'ensemble"** s'affiche à chaque ouverture à cause du bug n°1 (la requête sur table absente fait throw). Confusion UX.
- **`MortgageDisputeFeesTab`** : OK fonctionnellement, mais les valeurs par défaut (50/100/25 USD radiation, 30 USD litige) sont **arbitraires** et ne correspondent pas forcément aux frais réellement appliqués côté services hypothèque/litige existants → à confirmer côté code consommateur dans une étape ultérieure (hors périmètre de ce fix).
- **9 onglets sur viewport 875px** : `flex-wrap` activé, donc OK, mais visuellement chargé. Acceptable.

### Plan de correction

#### Fix 1 — Mapper `subdivision_rate_config` correctement

Dans `BillingOverviewTab.tsx`, remplacer la requête `subdivision_fees_config` par :

```ts
(supabase as any).from('subdivision_rate_config').select('id, section_type, location_name, rate_per_sqm_usd, is_active, updated_at')
```

Puis adapter le mapping :
- `name` = `${section_type} — ${location_name}` (ex: "urban — Gombe")
- `reference` = `section_type`
- `price_usd` = `rate_per_sqm_usd` (préciser dans l'UI que c'est un **taux/m²**, pas un montant fixe)

#### Fix 2 — Mutation : retirer `mutation_type`

Champ inexistant → utiliser `description` (tronqué) ou simplement `'—'` pour la colonne Référence. La table mutation_fees_config est plate (frais génériques par mutation, pas typés).

```ts
(supabase as any).from('mutation_fees_config').select('id, fee_name, description, amount_usd, is_active, updated_at')
// reference: f.description ? f.description.slice(0, 30) : '—'
```

#### Fix 3 — Expertise : retirer `fee_type`

Idem — table plate. Utiliser `description` comme référence.

```ts
(supabase as any).from('expertise_fees_config').select('id, fee_name, description, amount_usd, is_active, updated_at')
```

#### Fix 4 — Affichage taux/m² pour Lotissement

Dans la colonne "Prix USD" du tableau et dans la carte Total, ajouter une mention `/m²` quand `category === 'Lotissement'` pour éviter la confusion (les frais lotissement sont surfaciques, pas forfaitaires). Le total $ agrégé pour cette catégorie devient une **somme de taux** sans signification métier — afficher `${count} tarifs configurés` au lieu de `Total $X`.

### Détails techniques

- **Fichiers modifiés** : `src/components/admin/billing/BillingOverviewTab.tsx` uniquement (3 lignes de query + ajustements mapping + condition d'affichage Lotissement)
- **Aucune migration BD** nécessaire
- **Aucun nouvel import**
- **Tests** : ouvrir l'onglet "Vue d'ensemble", vérifier que les 7 catégories s'affichent sans toast d'erreur et que la catégorie Lotissement liste les tarifs configurés

### Hors périmètre (à traiter dans P3/P4/P5)

- Bulk update étendu (P3)
- Audit log avec triggers BD (P4)
- Validation que les frais hypothèque/litige sont bien lus par les services consommateurs (P5)

