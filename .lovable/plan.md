

# Tarification du lotissement par m², par lot et par emplacement

## Résumé

Remplacer le frais fixe de lotissement par un calcul dynamique : **tarif/m² × surface de chaque lot × nombre de lots**, avec un tarif qui varie selon l'emplacement (quartier en zone urbaine, village en zone rurale). Les tarifs sont configurables depuis l'espace admin.

## Changements

### 1. Migration SQL — Table `subdivision_rate_config`

```sql
CREATE TABLE public.subdivision_rate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL CHECK (section_type IN ('urban', 'rural')),
  location_name TEXT NOT NULL,         -- quartier/village ou '*' (défaut)
  rate_per_sqm_usd NUMERIC NOT NULL DEFAULT 0.5,
  min_fee_per_lot_usd NUMERIC DEFAULT 5,
  max_fee_per_lot_usd NUMERIC DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_type, location_name)
);
ALTER TABLE public.subdivision_rate_config ENABLE ROW LEVEL SECURITY;
-- Lecture pour authentifiés, écriture pour admins via has_role
```

Insérer deux tarifs par défaut (`*`) pour urban et rural.

### 2. Admin — `AdminSubdivisionFeesConfig.tsx` (nouveau)

CRUD complet similaire à `AdminExpertiseFeesConfig` :
- Filtrage par type de section (Urbain/Rural)
- Colonnes : Emplacement, Tarif/m² (USD), Min/lot, Max/lot, Actif
- Ajout, modification, suppression de tarifs
- Possibilité d'ajouter un tarif par défaut (`*`)

### 3. Intégration admin

| Fichier | Modification |
|---------|-------------|
| `AdminSidebar.tsx` | Ajouter entrée `{ label: 'Config Frais Lotissement', value: 'subdivision-fees-config' }` après la ligne lotissement |
| `Admin.tsx` | Importer `AdminSubdivisionFeesConfig` + ajouter `case 'subdivision-fees-config'` |

### 4. Calcul dynamique — `useSubdivisionForm.ts`

Remplacer le chargement depuis `cadastral_services_config` par :
- Extraire `section_type` (`parcelData.section_type === 'SR' ? 'rural' : 'urban'`) et `location_name` (`quartier` ou `village`) depuis `parcelData`
- Requête sur `subdivision_rate_config` pour trouver le tarif spécifique ou fallback `*`
- **Calcul par lot** : pour chaque lot, `fee = clamp(lot.areaSqm × rate, min_per_lot, max_per_lot)`
- **Total** = somme des frais de tous les lots
- Exposer `ratePerSqm`, `feeBreakdown` (détail par lot) en plus de `submissionFee`

### 5. Affichage — `StepSummary.tsx`

- Afficher le tarif appliqué : `{rate}/m² — {locationName} ({sectionType})`
- Tableau des frais par lot : Lot N° | Surface | Frais
- Total en bas
- Mention si tarif par défaut ou spécifique à l'emplacement

### 6. Types — `types.ts`

Ajouter à `ParentParcelInfo` : `sectionType?: string`, `locationName?: string`
Ajouter interface `FeeBreakdown` : `{ lotId, lotNumber, areaSqm, fee }[]`

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Créer `subdivision_rate_config` + RLS + données par défaut |
| `src/components/admin/AdminSubdivisionFeesConfig.tsx` | Nouveau — CRUD admin |
| `src/components/admin/AdminSidebar.tsx` | Ajouter entrée menu |
| `src/pages/Admin.tsx` | Ajouter import + case |
| `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` | Calcul dynamique par lot |
| `src/components/cadastral/subdivision/steps/StepSummary.tsx` | Détail frais par lot |
| `src/components/cadastral/subdivision/types.ts` | Ajouter champs pricing |

