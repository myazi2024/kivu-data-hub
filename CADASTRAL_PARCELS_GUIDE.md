# Guide des Parcelles Cadastrales

## ⚠️ IMPORTANT: Colonne `area_hectares`

### Problème Résolu

**Erreur rencontrée**: `cannot insert a non-DEFAULT value into column "area_hectares" is generated column`

**Cause**: La colonne `area_hectares` dans la table `cadastral_parcels` est une **colonne générée** (GENERATED ALWAYS AS). Elle est calculée automatiquement par la base de données à partir de `area_sqm / 10000`. 

**On ne peut JAMAIS**:
- ❌ Insérer une valeur dans `area_hectares`
- ❌ Mettre à jour `area_hectares`
- ❌ Spécifier `area_hectares` dans un INSERT ou UPDATE

### Solution Implémentée

1. **Migration SQL** (`20251120_fix_area_hectares.sql`)
   - Recrée la colonne `area_hectares` comme GENERATED ALWAYS STORED
   - Ajoute des commentaires explicatifs
   - Crée des index pour améliorer les performances

2. **Types TypeScript Sécurisés** (`src/types/cadastral.ts`)
   - `CadastralParcelInsert`: Exclut `area_hectares`
   - `CadastralParcelUpdate`: Exclut `area_hectares`
   - Fonctions helpers pour créer des payloads sécurisés

3. **Fonctions Utilitaires** (`src/utils/cadastralParcelHelpers.ts`)
   - `insertCadastralParcel()`: Insert sécurisé
   - `updateCadastralParcel()`: Update sécurisé
   - `createParcelFromContribution()`: Création depuis une contribution
   - `calculateAreaHectares()`: Calcul manuel si nécessaire
   - `formatArea()`: Affichage formaté

## 📝 Comment Utiliser

### ✅ Insertion Correcte

```typescript
import { insertCadastralParcel } from '@/utils/cadastralParcelHelpers';

// Spécifier uniquement area_sqm, area_hectares sera calculé automatiquement
await insertCadastralParcel({
  parcel_number: 'SU/2130/KIN',
  parcel_type: 'SU',
  location: 'Goma',
  property_title_type: 'Certificat d\'enregistrement',
  area_sqm: 1200, // ✅ Uniquement area_sqm
  // area_hectares: 0.12, ❌ NE JAMAIS FAIRE CECI
  current_owner_name: 'Jean Dupont',
  // ... autres champs
});
```

### ✅ Mise à Jour Correcte

```typescript
import { updateCadastralParcel } from '@/utils/cadastralParcelHelpers';

await updateCadastralParcel(parcelId, {
  area_sqm: 1500, // ✅ Modifier area_sqm met à jour automatiquement area_hectares
  // area_hectares: 0.15, ❌ NE JAMAIS FAIRE CECI
  current_owner_name: 'Marie Martin',
  // ... autres champs
});
```

### ✅ Affichage de la Surface

```typescript
import { formatArea } from '@/utils/cadastralParcelHelpers';

// Afficher la surface avec conversion automatique
const displayText = formatArea(1200); // "1,200 m² (0.12 ha)"
```

### ✅ Calcul Manuel (si nécessaire)

```typescript
import { calculateAreaHectares } from '@/utils/cadastralParcelHelpers';

const hectares = calculateAreaHectares(1200); // 0.12
```

## 🔍 Vérification

Pour vérifier qu'une parcelle a été correctement créée:

```sql
SELECT 
  parcel_number,
  area_sqm,
  area_hectares, -- Calculé automatiquement
  area_hectares = (area_sqm / 10000.0) as calculation_correct
FROM cadastral_parcels
WHERE parcel_number = 'SU/2130/KIN';
```

## 🚨 Erreurs Courantes à Éviter

### ❌ N'UTILISEZ JAMAIS directement le type Insert de Supabase

```typescript
// ❌ MAUVAIS - Le type Insert inclut area_hectares
import { Database } from '@/integrations/supabase/types';
type ParcelInsert = Database['public']['Tables']['cadastral_parcels']['Insert'];

const data: ParcelInsert = {
  area_sqm: 1200,
  area_hectares: 0.12, // ❌ ERREUR: ne peut pas insérer dans une colonne générée
  // ...
};
```

### ✅ UTILISEZ les types sécurisés

```typescript
// ✅ BON - Utilise les types sécurisés qui excluent area_hectares
import { CadastralParcelInsert } from '@/types/cadastral';

const data: CadastralParcelInsert = {
  area_sqm: 1200,
  // area_hectares n'est pas disponible dans ce type ✅
  // ...
};
```

## 🎯 Checklist pour les Développeurs

Avant de travailler avec les parcelles cadastrales:

- [ ] Importer les types depuis `@/types/cadastral`, PAS depuis `@/integrations/supabase/types`
- [ ] Utiliser `insertCadastralParcel()` au lieu de `.insert()` direct
- [ ] Utiliser `updateCadastralParcel()` au lieu de `.update()` direct
- [ ] Ne JAMAIS spécifier `area_hectares` dans les payloads
- [ ] Utiliser `calculateAreaHectares()` pour calculer manuellement si nécessaire
- [ ] Utiliser `formatArea()` pour l'affichage

## 📚 Ressources

- Types sécurisés: `src/types/cadastral.ts`
- Fonctions utilitaires: `src/utils/cadastralParcelHelpers.ts`
- Migration SQL: `supabase/migrations/[timestamp]_fix_area_hectares.sql`

## 🐛 Déboggage

Si vous rencontrez l'erreur "cannot insert a non-DEFAULT value into column area_hectares":

1. Vérifier que vous utilisez les types `CadastralParcelInsert` ou `CadastralParcelUpdate`
2. Vérifier que vous n'essayez pas de spécifier `area_hectares` dans votre payload
3. Utiliser les fonctions helpers `insertCadastralParcel()` et `updateCadastralParcel()`
4. Vérifier les logs de la console pour les avertissements automatiques

## 🔄 Migrations Futures

Si vous devez modifier le calcul de `area_hectares`:

```sql
-- Supprimer l'ancienne colonne
ALTER TABLE cadastral_parcels DROP COLUMN area_hectares CASCADE;

-- Recréer avec nouvelle formule
ALTER TABLE cadastral_parcels 
ADD COLUMN area_hectares NUMERIC 
GENERATED ALWAYS AS (nouvelle_formule) STORED;
```

**Note**: Toujours utiliser `GENERATED ALWAYS AS ... STORED` pour garantir que la colonne reste immuable.
