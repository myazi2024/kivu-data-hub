

# Tarification du lotissement par m² et par emplacement

## Problème
Le frais de lotissement est actuellement un montant fixe (ex: 20 USD) chargé depuis `cadastral_services_config`. Il devrait être calculé **par mètre carré** avec un tarif qui varie selon l'emplacement (quartier pour les sections urbaines, village pour les sections rurales), configurable depuis l'admin.

## Solution

### 1. Nouvelle table `subdivision_rate_config`

Migration SQL pour créer une table de tarification par zone :

```sql
CREATE TABLE public.subdivision_rate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL CHECK (section_type IN ('urban', 'rural')),
  location_name TEXT NOT NULL,        -- nom du quartier ou village
  rate_per_sqm_usd NUMERIC NOT NULL DEFAULT 0.5,
  min_fee_usd NUMERIC DEFAULT 10,     -- frais minimum
  max_fee_usd NUMERIC DEFAULT NULL,   -- plafond optionnel
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_type, location_name)
);
```

- RLS : lecture pour tous les authentifiés, écriture réservée aux admins (via `has_role`)
- Un tarif par défaut (fallback) avec `location_name = '*'` pour chaque type de section

### 2. Interface admin `AdminSubdivisionRatesConfig`

Nouveau composant dans `src/components/admin/` :
- Tableau filtrable par type de section (Urbain/Rural)
- Colonnes : Emplacement, Tarif/m² (USD), Frais min, Plafond, Actif
- CRUD complet (ajouter, modifier, supprimer un tarif)
- Bouton pour ajouter un tarif par défaut (`*`) si absent
- Intégré dans le panneau admin existant

### 3. Calcul dynamique du frais dans `useSubdivisionForm.ts`

Remplacer le chargement depuis `cadastral_services_config` :

```typescript
// Extraire quartier/village et section_type depuis parcelData
const sectionType = parcelData?.section_type === 'SR' ? 'rural' : 'urban';
const locationName = sectionType === 'urban' 
  ? parcelData?.quartier 
  : parcelData?.village;

// Chercher le tarif : d'abord par location exacte, puis fallback '*'
const { data } = await supabase
  .from('subdivision_rate_config')
  .select('*')
  .eq('section_type', sectionType)
  .in('location_name', [locationName, '*'].filter(Boolean))
  .eq('is_active', true);

// Prioriser le tarif spécifique
const rate = data?.find(r => r.location_name === locationName) 
  || data?.find(r => r.location_name === '*');

const rawFee = parentAreaSqm * rate.rate_per_sqm_usd;
const fee = Math.max(rate.min_fee_usd, rate.max_fee_usd ? Math.min(rawFee, rate.max_fee_usd) : rawFee);
```

### 4. Affichage dans `StepSummary.tsx`

- Afficher le détail du calcul : `{areaSqm} m² × {rate}/m² = {total} USD`
- Afficher le quartier/village et le type de section
- Mentionner si c'est le tarif par défaut ou spécifique

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Créer `subdivision_rate_config` avec RLS et données par défaut |
| `src/components/admin/AdminSubdivisionRatesConfig.tsx` | Nouveau — CRUD admin des tarifs par zone |
| `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` | Calcul du frais par m² selon l'emplacement |
| `src/components/cadastral/subdivision/steps/StepSummary.tsx` | Afficher le détail du calcul (tarif × surface) |
| `src/components/cadastral/subdivision/types.ts` | Ajouter `ratePerSqm`, `locationName`, `sectionType` à `ParentParcelInfo` |
| Intégration admin (router/menu) | Ajouter le lien vers `AdminSubdivisionRatesConfig` |

