# Exemples d'Implémentation - Parcelles Cadastrales

Ce document fournit des exemples concrets d'utilisation des nouvelles fonctions sécurisées pour manipuler les parcelles cadastrales.

## 📚 Table des Matières

1. [Importations Nécessaires](#importations-nécessaires)
2. [Création d'une Nouvelle Parcelle](#création-dune-nouvelle-parcelle)
3. [Mise à Jour d'une Parcelle](#mise-à-jour-dune-parcelle)
4. [Création depuis une Contribution](#création-depuis-une-contribution)
5. [Affichage de la Surface](#affichage-de-la-surface)
6. [Gestion d'Erreurs](#gestion-derreurs)
7. [Exemples Complets](#exemples-complets)

---

## Importations Nécessaires

```typescript
// ✅ Toujours importer depuis ces modules
import { 
  CadastralParcel,
  CadastralParcelInsert, 
  CadastralParcelUpdate 
} from '@/types/cadastral';

import { 
  insertCadastralParcel,
  updateCadastralParcel,
  createParcelFromContribution,
  calculateAreaHectares,
  formatArea
} from '@/utils/cadastralParcelHelpers';

// ❌ NE JAMAIS importer directement depuis supabase/types
// import { Database } from '@/integrations/supabase/types'; // ❌ ÉVITER
```

---

## Création d'une Nouvelle Parcelle

### Exemple 1: Parcelle Urbaine Simple

```typescript
import { insertCadastralParcel } from '@/utils/cadastralParcelHelpers';
import { toast } from 'sonner';

async function createUrbanParcel() {
  try {
    const newParcel = await insertCadastralParcel({
      parcel_number: 'SU/2130/KIN',
      parcel_type: 'SU',
      location: 'Kinshasa - Gombe',
      property_title_type: 'Certificat d\'enregistrement',
      title_reference_number: 'CERT-2024-001',
      area_sqm: 1200,
      // ✅ area_hectares sera calculé automatiquement (0.12 ha)
      // ❌ area_hectares: 0.12, // NE JAMAIS FAIRE CECI
      current_owner_name: 'Jean Baptiste MUKENDI',
      current_owner_legal_status: 'Personne physique',
      current_owner_since: '2024-01-15',
      province: 'Kinshasa',
      ville: 'Kinshasa',
      commune: 'Gombe',
      quartier: 'Centre-Ville',
      avenue: 'Avenue de la Liberté'
    });

    console.log('Parcelle créée:', newParcel);
    console.log('Surface en hectares (calculé automatiquement):', newParcel.area_hectares);
    
    toast.success('Parcelle créée avec succès !');
    return newParcel;
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    toast.error(`Erreur: ${error.message}`);
    throw error;
  }
}
```

### Exemple 2: Parcelle Rurale avec Coordonnées GPS

```typescript
async function createRuralParcel() {
  try {
    const parcel = await insertCadastralParcel({
      parcel_number: 'SR/01/0987/BEN',
      parcel_type: 'SR',
      location: 'Beni - Bunyuka',
      property_title_type: 'Concession perpétuelle',
      area_sqm: 50000, // 5 hectares
      current_owner_name: 'Coopérative Agricole AMANI',
      current_owner_legal_status: 'Personne morale',
      current_owner_since: '2020-06-01',
      province: 'Nord-Kivu',
      territoire: 'Beni',
      collectivite: 'Bunyuka',
      village: 'Kasindi',
      gps_coordinates: [
        { lat: 0.4984, lng: 29.4637, borne: 'B1' },
        { lat: 0.4990, lng: 29.4637, borne: 'B2' },
        { lat: 0.4990, lng: 29.4650, borne: 'B3' },
        { lat: 0.4984, lng: 29.4650, borne: 'B4' }
      ],
      latitude: 0.4987,
      longitude: 29.4643,
      declared_usage: 'Agricole'
    });

    console.log(`Parcelle rurale de ${parcel.area_hectares} ha créée`);
    return parcel;
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}
```

---

## Mise à Jour d'une Parcelle

### Exemple 3: Mise à Jour de la Superficie

```typescript
import { updateCadastralParcel } from '@/utils/cadastralParcelHelpers';

async function updateParcelSize(parcelId: string, newAreaSqm: number) {
  try {
    const updated = await updateCadastralParcel(parcelId, {
      area_sqm: newAreaSqm,
      // ✅ area_hectares sera recalculé automatiquement
      // ❌ area_hectares: newAreaSqm / 10000, // NE JAMAIS FAIRE CECI
    });

    console.log('Superficie mise à jour:');
    console.log(`  - Ancienne: ${updated.area_sqm} m²`);
    console.log(`  - Nouvelle: ${newAreaSqm} m²`);
    console.log(`  - En hectares (auto): ${updated.area_hectares} ha`);
    
    toast.success('Superficie mise à jour !');
    return updated;
  } catch (error) {
    console.error('Erreur:', error);
    toast.error('Impossible de mettre à jour la superficie');
    throw error;
  }
}
```

### Exemple 4: Changement de Propriétaire

```typescript
async function changeOwner(
  parcelId: string, 
  newOwnerName: string,
  newOwnerStatus: string,
  changeDate: string
) {
  try {
    const updated = await updateCadastralParcel(parcelId, {
      current_owner_name: newOwnerName,
      current_owner_legal_status: newOwnerStatus,
      current_owner_since: changeDate
    });

    console.log('Propriétaire mis à jour:', updated.current_owner_name);
    toast.success(`Nouveau propriétaire: ${newOwnerName}`);
    return updated;
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}
```

---

## Création depuis une Contribution

### Exemple 5: Approbation d'une Contribution

```typescript
import { createParcelFromContribution } from '@/utils/cadastralParcelHelpers';

async function approveContribution(contribution: any) {
  try {
    // Créer une parcelle officielle depuis la contribution approuvée
    const parcel = await createParcelFromContribution(contribution);

    console.log('Parcelle créée depuis contribution:', parcel.parcel_number);
    console.log('Surface:', formatArea(parcel.area_sqm));
    
    toast.success(
      `Parcelle ${parcel.parcel_number} créée avec succès !`
    );

    return parcel;
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    toast.error('Impossible de créer la parcelle');
    throw error;
  }
}
```

---

## Affichage de la Surface

### Exemple 6: Formatter l'Affichage

```typescript
import { formatArea, calculateAreaHectares } from '@/utils/cadastralParcelHelpers';

function ParcelSummary({ parcel }: { parcel: CadastralParcel }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Numéro:</span>
        <span className="font-medium">{parcel.parcel_number}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">Superficie:</span>
        <span className="font-medium">
          {/* ✅ Utiliser formatArea pour l'affichage */}
          {formatArea(parcel.area_sqm)}
        </span>
      </div>
      
      {parcel.area_sqm >= 10000 && (
        <div className="text-sm text-primary">
          {/* ✅ Calcul manuel si nécessaire pour la logique */}
          Grande parcelle: {calculateAreaHectares(parcel.area_sqm).toFixed(2)} hectares
        </div>
      )}
    </div>
  );
}
```

### Exemple 7: Calcul de Statistiques

```typescript
function calculateTotalArea(parcels: CadastralParcel[]) {
  const totalSqm = parcels.reduce((sum, p) => sum + p.area_sqm, 0);
  const totalHectares = calculateAreaHectares(totalSqm);

  return {
    totalSqm,
    totalHectares,
    formatted: formatArea(totalSqm),
    count: parcels.length,
    averageSqm: totalSqm / parcels.length,
    averageHectares: totalHectares / parcels.length
  };
}

// Utilisation
const parcels = await fetchUserParcels();
const stats = calculateTotalArea(parcels);

console.log(`Total: ${stats.formatted}`);
console.log(`Moyenne: ${stats.averageHectares.toFixed(2)} ha par parcelle`);
```

---

## Gestion d'Erreurs

### Exemple 8: Gestion Complète des Erreurs

```typescript
async function safeCreateParcel(data: Partial<CadastralParcelInsert>) {
  try {
    // Valider les données obligatoires
    if (!data.parcel_number) {
      throw new Error('Le numéro de parcelle est obligatoire');
    }
    if (!data.area_sqm || data.area_sqm <= 0) {
      throw new Error('La superficie doit être supérieure à 0');
    }
    if (!data.current_owner_name) {
      throw new Error('Le nom du propriétaire est obligatoire');
    }

    // Créer la parcelle
    const parcel = await insertCadastralParcel(data);

    // Vérifier que area_hectares a été calculé
    if (parcel.area_hectares === null || parcel.area_hectares === undefined) {
      console.warn('⚠️ area_hectares non calculé automatiquement');
    }

    return { success: true, parcel };
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    
    // Gestion d'erreurs spécifiques
    if (error.code === '23505') {
      return { 
        success: false, 
        error: 'Ce numéro de parcelle existe déjà' 
      };
    }
    
    if (error.message.includes('area_hectares')) {
      return {
        success: false,
        error: 'Erreur de calcul de surface. Vérifiez la superficie en m²'
      };
    }

    return { 
      success: false, 
      error: error.message || 'Erreur inconnue' 
    };
  }
}
```

---

## Exemples Complets

### Exemple 9: Composant React Complet

```typescript
import React, { useState } from 'react';
import { insertCadastralParcel } from '@/utils/cadastralParcelHelpers';
import { CadastralParcelInsert } from '@/types/cadastral';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function CreateParcelForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parcel_number: '',
    area_sqm: '',
    current_owner_name: '',
    location: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Préparer les données (sans area_hectares)
      const parcelData: Partial<CadastralParcelInsert> = {
        parcel_number: formData.parcel_number,
        parcel_type: 'SU',
        location: formData.location,
        property_title_type: 'Certificat d\'enregistrement',
        area_sqm: parseFloat(formData.area_sqm),
        // ✅ area_hectares sera calculé automatiquement
        current_owner_name: formData.current_owner_name,
        province: 'Nord-Kivu',
        ville: 'Goma'
      };

      // Créer la parcelle
      const newParcel = await insertCadastralParcel(parcelData);

      toast.success(
        `Parcelle créée: ${newParcel.parcel_number} (${newParcel.area_hectares} ha)`
      );

      // Réinitialiser le formulaire
      setFormData({
        parcel_number: '',
        area_sqm: '',
        current_owner_name: '',
        location: ''
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Numéro de Parcelle</label>
        <Input
          value={formData.parcel_number}
          onChange={(e) => setFormData({ ...formData, parcel_number: e.target.value })}
          placeholder="SU/2130/KIN"
          required
        />
      </div>

      <div>
        <label>Superficie (m²)</label>
        <Input
          type="number"
          value={formData.area_sqm}
          onChange={(e) => setFormData({ ...formData, area_sqm: e.target.value })}
          placeholder="1200"
          required
        />
        {formData.area_sqm && (
          <p className="text-sm text-muted-foreground mt-1">
            = {(parseFloat(formData.area_sqm) / 10000).toFixed(4)} hectares
          </p>
        )}
      </div>

      <div>
        <label>Propriétaire</label>
        <Input
          value={formData.current_owner_name}
          onChange={(e) => setFormData({ ...formData, current_owner_name: e.target.value })}
          placeholder="Jean Dupont"
          required
        />
      </div>

      <div>
        <label>Localisation</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Goma - Gombe"
          required
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer la Parcelle'}
      </Button>
    </form>
  );
}
```

### Exemple 10: Hook Personnalisé

```typescript
import { useState } from 'react';
import { insertCadastralParcel, updateCadastralParcel } from '@/utils/cadastralParcelHelpers';
import { CadastralParcel, CadastralParcelInsert, CadastralParcelUpdate } from '@/types/cadastral';
import { toast } from 'sonner';

export function useCadastralParcels() {
  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [loading, setLoading] = useState(false);

  const createParcel = async (data: Partial<CadastralParcelInsert>) => {
    setLoading(true);
    try {
      const newParcel = await insertCadastralParcel(data);
      setParcels([...parcels, newParcel]);
      toast.success('Parcelle créée avec succès');
      return newParcel;
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateParcel = async (
    parcelId: string, 
    updates: Partial<CadastralParcelUpdate>
  ) => {
    setLoading(true);
    try {
      const updated = await updateCadastralParcel(parcelId, updates);
      setParcels(parcels.map(p => p.id === parcelId ? updated : p));
      toast.success('Parcelle mise à jour');
      return updated;
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    parcels,
    loading,
    createParcel,
    updateParcel
  };
}
```

---

## 🚨 Pièges à Éviter

### ❌ NE PAS FAIRE

```typescript
// ❌ Import direct du type Supabase
import { Database } from '@/integrations/supabase/types';
type ParcelInsert = Database['public']['Tables']['cadastral_parcels']['Insert'];

// ❌ Insertion directe avec Supabase
await supabase.from('cadastral_parcels').insert({
  parcel_number: 'SU/TEST',
  area_sqm: 1200,
  area_hectares: 0.12 // ❌ ERREUR!
});

// ❌ Calcul et assignation manuelle
const hectares = areaSqm / 10000;
data.area_hectares = hectares; // ❌ Sera ignoré de toute façon
```

### ✅ FAIRE

```typescript
// ✅ Import des types sécurisés
import { CadastralParcelInsert } from '@/types/cadastral';
import { insertCadastralParcel } from '@/utils/cadastralParcelHelpers';

// ✅ Utilisation des helpers
await insertCadastralParcel({
  parcel_number: 'SU/TEST',
  area_sqm: 1200,
  // area_hectares calculé automatiquement ✅
});

// ✅ Calcul pour affichage uniquement
const hectares = calculateAreaHectares(areaSqm);
console.log(`Surface: ${hectares} ha`);
```

---

## 📖 Ressources

- **Guide Complet**: `CADASTRAL_PARCELS_GUIDE.md`
- **Types Sécurisés**: `src/types/cadastral.ts`
- **Fonctions Utilitaires**: `src/utils/cadastralParcelHelpers.ts`
- **Tests**: `src/utils/__tests__/cadastralParcelHelpers.test.ts`

---

**Dernière mise à jour**: 20 Novembre 2025
